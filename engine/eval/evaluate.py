#!/usr/bin/env python3
"""Evaluation for both backends.

Usage
-----
python evaluate.py --backend rules --split dev
python evaluate.py --backend both  --split all

For every (backend, split) pair this writes:

* ``results/metrics_<backend>_<split>.json`` -- all numbers
* ``results/errors_<backend>_<split>.jsonl`` -- prompts with a wrong missing set

Finally it writes ``results/RESULTS.md`` (merged across whatever metrics files
exist, so run with ``--backend both --split all`` for the complete report).

The test sets are never used to tune the rules; this script only reports.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from seqeval.metrics import classification_report, f1_score, precision_score, recall_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # engine/

from src.bio import bio_to_spans, repair_bio
from src.checker import check_elements
from src.linking import linking_accuracy
from src.pipeline import BackendNotAvailable, _run_full
from src.schema import DATA_DIR, ELEMENT_SCHEMA, NOUN_TO_TYPE, load_jsonl
from src.tokenization import tokenize_with_offsets
from src.vague import annotate_vague

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RESULTS_DIR = PROJECT_ROOT / "results"
ALL_SPLITS = ["dev", "test", "handwritten_test"]
ENTITY_LABELS = ["ELEMENT", "COLOR", "LOCATION", "ACTION", "LABEL"]
MISSING_ATTRS = ["COLOR", "LOCATION", "ACTION", "LABEL"]


# --------------------------------------------------------------------------- helpers
def _majority(gold_ids: list[int], start: int, end: int) -> int:
    counts: Counter = Counter(eid for eid in gold_ids[start:end] if eid)
    return counts.most_common(1)[0][0] if counts else 0


def _overlap(a, b) -> int:
    """Number of shared token indices between two spans."""
    return max(0, min(a.end, b.end) - max(a.start, b.start))


def _gold_elements(record: dict) -> list[dict]:
    """Gold ELEMENT spans with type and id."""
    tokens = tokenize_with_offsets(record["text"])
    spans = bio_to_spans(tokens, record["labels"], record["text"])
    by_id = {e["id"]: e for e in record["elements"]}
    gold = []
    for span in spans:
        if span.label != "ELEMENT":
            continue
        gid = _majority(record["elem_ids"], span.start, span.end)
        elem_type = by_id.get(gid, {}).get("type") or NOUN_TO_TYPE(span.text)
        gold.append({"span": span, "type": elem_type, "id": gid})
    return gold


def _match_elements(pred_elements, gold_elements) -> list[tuple[int, int]]:
    """Greedy one-to-one matching by token overlap. Returns (pred_idx, gold_idx)."""
    used: set[int] = set()
    pairs: list[tuple[int, int]] = []
    for pred_index, pred in enumerate(pred_elements):
        best_index, best_overlap = None, 0
        for gold_index, gold in enumerate(gold_elements):
            if gold_index in used:
                continue
            overlap = _overlap(pred.span, gold["span"])
            if overlap > best_overlap:
                best_overlap, best_index = overlap, gold_index
        if best_index is not None:
            used.add(best_index)
            pairs.append((pred_index, best_index))
    return pairs


def _prediction(record: dict, backend_name: str, allow_llm: bool = False) -> dict:
    payload, elements = _run_full(
        record["text"],
        method=backend_name,
        allow_llm=allow_llm,
        finalize=True,
        explain=False,
    )
    return {
        "record": record,
        "tokens": payload["tokens"],
        "tags": payload["tags"],
        "spans": payload["spans"],
        "elements": elements,
        "result": payload["result"],
        "engine": payload["engine"],
        "risk": payload["risk"],
        "router": payload["router"],
    }


def _entity_scores(gold: list[list[str]], pred: list[list[str]]) -> dict:
    """Micro P/R/F1 plus per-label scores using seqeval."""
    try:
        micro = {
            "precision": float(precision_score(gold, pred, average="micro", zero_division=0)),
            "recall": float(recall_score(gold, pred, average="micro", zero_division=0)),
            "f1": float(f1_score(gold, pred, average="micro", zero_division=0)),
        }
        report = classification_report(gold, pred, output_dict=True, zero_division=0)
    except Exception as exc:  # pragma: no cover - seqeval edge cases
        return {"error": str(exc), "precision": 0.0, "recall": 0.0, "f1": 0.0, "per_label": {}}
    per_label = {}
    for label in ENTITY_LABELS:
        if label in report:
            per_label[label] = {
                "precision": float(report[label]["precision"]),
                "recall": float(report[label]["recall"]),
                "f1": float(report[label]["f1-score"]),
                "support": int(report[label]["support"]),
            }
    return {**micro, "per_label": per_label}


def _prf(tp: int, fp: int, fn: int) -> dict:
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def _empty_counts() -> Counter:
    return Counter({"tp": 0, "fp": 0, "fn": 0})


# --------------------------------------------------------------------------- main metric
def evaluate_split(
    records: list[dict], backend_name: str, allow_llm: bool = False
) -> tuple[dict, list[dict]]:
    """Run every metric for one backend/split. Returns (metrics, error_rows)."""
    gold_tags = [record["labels"] for record in records]
    predictions = [
        _prediction(record, backend_name, allow_llm) for record in records
    ]
    pred_tags = [item["tags"] for item in predictions]
    engine_counts = Counter(item.get("engine", backend_name) for item in predictions)

    # (1) entity-level seqeval scores -------------------------------------
    overall_entities = _entity_scores(gold_tags, pred_tags)

    # (2) element detection ------------------------------------------------
    elem_tp = elem_fp = elem_fn = 0
    # (4/5) missing detection + prompt-level ------------------------------
    missing_counts = _empty_counts()
    per_attr = {attr: _empty_counts() for attr in MISSING_ATTRS}
    per_type: dict[str, Counter] = defaultdict(_empty_counts)
    per_source: dict[str, dict] = defaultdict(
        lambda: {"missing": _empty_counts(), "has_correct": 0, "exact": 0, "total": 0,
                 "gold_tags": [], "pred_tags": []}
    )
    has_correct = 0
    exact_correct = 0
    errors: list[dict] = []

    for item in predictions:
        record = item["record"]
        source = record.get("source", "synthetic")
        source_bucket = per_source[source]
        gold_elems = _gold_elements(record)
        gold_by_id = {e["id"]: e for e in record["elements"]}
        pairs = _match_elements(item["elements"], gold_elems)

        # element detection counts
        elem_tp += len(pairs)
        elem_fp += len(item["elements"]) - len(pairs)
        elem_fn += len(gold_elems) - len(pairs)

        # --- missing attributes for matched pairs
        matched_pred = {p for p, _ in pairs}
        matched_gold = {g for _, g in pairs}
        record_pairs: set[tuple[int, str]] = set()

        for pred_index, gold_index in pairs:
            gold_info = gold_elems[gold_index]
            gold_element = gold_by_id.get(gold_info["id"])
            if gold_element is None:
                continue
            pred_element = item["result"]["elements"][pred_index]
            required = ELEMENT_SCHEMA[gold_info["type"]]["required"]
            for attr in required:
                gold_missing = attr in gold_element["missing"]
                pred_missing = attr in pred_element["missing"]
                if pred_missing:
                    record_pairs.add((gold_info["id"], attr))
                bucket = missing_counts
                attr_bucket = per_attr.get(attr, _empty_counts())
                type_bucket = per_type[gold_info["type"]]
                if gold_missing and pred_missing:
                    for c in (bucket, attr_bucket, type_bucket, source_bucket["missing"]):
                        c["tp"] += 1
                elif gold_missing and not pred_missing:
                    for c in (bucket, attr_bucket, type_bucket, source_bucket["missing"]):
                        c["fn"] += 1
                elif pred_missing and not gold_missing:
                    for c in (bucket, attr_bucket, type_bucket, source_bucket["missing"]):
                        c["fp"] += 1

        # --- unmatched predicted elements: their missing attrs are FPs
        for pred_index, pred_element in enumerate(item["result"]["elements"]):
            if pred_index in matched_pred:
                continue
            required = ELEMENT_SCHEMA[pred_element["type"]]["required"]
            for attr in required:
                if attr in pred_element["missing"]:
                    missing_counts["fp"] += 1
                    per_attr[attr]["fp"] += 1
                    per_type[pred_element["type"]]["fp"] += 1
                    source_bucket["missing"]["fp"] += 1

        # --- unmatched gold elements: their missing attrs are FNs
        for gold_index, gold_info in enumerate(gold_elems):
            if gold_index in matched_gold:
                continue
            gold_element = gold_by_id.get(gold_info["id"])
            if gold_element is None:
                continue
            required = ELEMENT_SCHEMA[gold_info["type"]]["required"]
            for attr in required:
                if attr in gold_element["missing"]:
                    missing_counts["fn"] += 1
                    per_attr[attr]["fn"] += 1
                    per_type[gold_info["type"]]["fn"] += 1
                    source_bucket["missing"]["fn"] += 1

        # --- prompt-level metrics
        gold_pairs = {
            (element["id"], attr)
            for element in record["elements"]
            for attr in element["missing"]
        }
        pred_has_missing = any(e["missing"] for e in item["result"]["elements"])
        gold_has_missing = bool(record["has_missing"])
        source_bucket["total"] += 1
        source_bucket["gold_tags"].append(record["labels"])
        source_bucket["pred_tags"].append(item["tags"])
        if pred_has_missing == gold_has_missing:
            has_correct += 1
            source_bucket["has_correct"] += 1
        if record_pairs == gold_pairs:
            exact_correct += 1
            source_bucket["exact"] += 1
        else:
            errors.append(
                {
                    "id": record["id"],
                    "text": record["text"],
                    "gold_tags": record["labels"],
                    "pred_tags": item["tags"],
                    "gold_missing": sorted(map(list, gold_pairs)),
                    "pred_missing": sorted(map(list, record_pairs)),
                    "category": _categorize(record, item, gold_pairs, record_pairs),
                }
            )

    n = len(records)
    risk_initial = [item["risk"]["initial"]["score"] for item in predictions if item.get("risk")]
    risk_final = [item["risk"]["final"]["score"] for item in predictions if item.get("risk")]
    risk_by_gold = {"missing": [], "complete": []}
    for item in predictions:
        if not item.get("risk"):
            continue
        bucket = "missing" if item["record"].get("has_missing") else "complete"
        risk_by_gold[bucket].append(item["risk"]["final"]["score"])

    metrics = {
        "backend": backend_name,
        "split": None,
        "n_prompts": n,
        "entity": overall_entities,
        "element_detection": _prf(elem_tp, elem_fp, elem_fn),
        "linking_gold": linking_accuracy(records),
        "missing_detection": {
            **_prf(missing_counts["tp"], missing_counts["fp"], missing_counts["fn"]),
            "per_attribute": {
                attr: _prf(c["tp"], c["fp"], c["fn"]) for attr, c in per_attr.items()
            },
            "per_element_type": {
                elem_type: _prf(c["tp"], c["fp"], c["fn"])
                for elem_type, c in sorted(per_type.items())
            },
        },
        "prompt_level": {
            "has_missing_accuracy": has_correct / n if n else 0.0,
            "exact_missing_set_accuracy": exact_correct / n if n else 0.0,
        },
        "by_source": {},
        "engine_counts": dict(engine_counts),
        "risk": {
            "mean_initial": sum(risk_initial) / len(risk_initial) if risk_initial else 0.0,
            "mean_final": sum(risk_final) / len(risk_final) if risk_final else 0.0,
            "mean_final_incomplete": (
                sum(risk_by_gold["missing"]) / len(risk_by_gold["missing"])
                if risk_by_gold["missing"] else 0.0
            ),
            "mean_final_complete": (
                sum(risk_by_gold["complete"]) / len(risk_by_gold["complete"])
                if risk_by_gold["complete"] else 0.0
            ),
        },
    }

    for source, bucket in per_source.items():
        total = bucket["total"]
        entity = _entity_scores(bucket["gold_tags"], bucket["pred_tags"])
        source_missing = bucket["missing"]
        metrics["by_source"][source] = {
            "n_prompts": total,
            "entity_f1": entity["f1"],
            "missing_f1": _prf(source_missing["tp"], source_missing["fp"], source_missing["fn"])["f1"],
            "has_missing_accuracy": bucket["has_correct"] / total if total else 0.0,
            "exact_missing_set_accuracy": bucket["exact"] / total if total else 0.0,
        }

    # Attach the split name from the records themselves (set by caller).
    metrics["split"] = records[0].get("__split__") if records else None
    return metrics, errors


def _categorize(record: dict, item: dict, gold_pairs: set, pred_pairs: set) -> str:
    """One-line automatic error category for RESULTS.md."""
    gold_elements = record["elements"]
    pred_elements = item["result"]["elements"]
    if gold_elements and not pred_elements:
        return "missed element"
    if len(pred_elements) != len(gold_elements):
        return "element boundary/count"
    only_pred = pred_pairs - gold_pairs
    only_gold = gold_pairs - pred_pairs
    if only_pred and not only_gold:
        return "false missing"
    if only_gold and not only_pred:
        return "missed missing"
    if not only_gold and not only_pred and pred_pairs != gold_pairs:
        return "wrong linking"
    return "mixed"


# --------------------------------------------------------------------------- CLI / output
def _load_split(split: str) -> list[dict]:
    splits = ALL_SPLITS if split == "all" else [split]
    records: list[dict] = []
    for name in splits:
        for record in load_jsonl(DATA_DIR / f"{name}.jsonl"):
            record["__split__"] = name
            records.append(record)
    return records


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def _print_summary(metrics: dict) -> None:
    print(
        f"\n[{metrics['backend']}/{metrics['split']}] "
        f"entity F1={metrics['entity']['f1']:.3f} | "
        f"element F1={metrics['element_detection']['f1']:.3f} | "
        f"missing F1={metrics['missing_detection']['f1']:.3f} | "
        f"prompt exact={metrics['prompt_level']['exact_missing_set_accuracy']:.3f}"
    )


def _fmt(value: float) -> str:
    return f"{value:.3f}"


def _load_all_metrics() -> dict[tuple[str, str], dict]:
    """Load every metrics file so RESULTS.md can merge partial runs."""
    bundle: dict[tuple[str, str], dict] = {}
    for path in RESULTS_DIR.glob("metrics_*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            bundle[(data["backend"], data["split"])] = data
        except Exception:
            continue
    return bundle


def _write_results_md(bundle: dict[tuple[str, str], dict],
                      all_errors: dict[str, list[dict]]) -> None:
    """Generate RESULTS.md from whatever metrics are available."""
    backends = sorted({backend for backend, _ in bundle})
    splits = [s for s in ALL_SPLITS if any((b, s) in bundle for b in backends)]
    lines: list[str] = ["# Results", ""]
    lines.append(
        "Generated automatically by `evaluate.py`.  Test sets were used for "
        "reporting only, never for tuning."
    )
    lines.append("")

    # ---------------- entity-level comparison
    lines += ["## Token-level entity F1 (seqeval, micro)", ""]
    header = "| split | " + " | ".join(backends) + " |"
    lines += [header, "|" + "---|" * (len(backends) + 1)]
    for split in splits:
        row = [split]
        for backend in backends:
            data = bundle.get((backend, split))
            row.append(_fmt(data["entity"]["f1"]) if data else "-")
        lines.append("| " + " | ".join(row) + " |")
    lines.append("")

    # ---------------- element detection
    lines += ["## Element detection (matched by token overlap)", ""]
    lines += [header, "|" + "---|" * (len(backends) + 1)]
    for split in splits:
        row = [split]
        for backend in backends:
            data = bundle.get((backend, split))
            row.append(_fmt(data["element_detection"]["f1"]) if data else "-")
        lines.append("| " + " | ".join(row) + " |")
    lines.append("")

    # ---------------- missing detection
    lines += ["## Missing-attribute detection (micro P/R/F1)", ""]
    lines.append("| split | backend | precision | recall | F1 |")
    lines.append("|---|---|---|---|---|")
    for split in splits:
        for backend in backends:
            data = bundle.get((backend, split))
            if not data:
                continue
            m = data["missing_detection"]
            lines.append(
                f"| {split} | {backend} | {_fmt(m['precision'])} | "
                f"{_fmt(m['recall'])} | {_fmt(m['f1'])} |"
            )
    lines.append("")

    # ---------------- prompt level
    lines += ["## Prompt-level metrics", ""]
    lines.append("| split | backend | has_missing acc | exact missing set acc |")
    lines.append("|---|---|---|---|")
    for split in splits:
        for backend in backends:
            data = bundle.get((backend, split))
            if not data:
                continue
            p = data["prompt_level"]
            lines.append(
                f"| {split} | {backend} | {_fmt(p['has_missing_accuracy'])} | "
                f"{_fmt(p['exact_missing_set_accuracy'])} |"
            )
    lines.append("")

    # ---------------- linking
    lines += ["## Attribute linking accuracy (gold tags)", ""]
    lines.append("| split | backend | accuracy | correct/total |")
    lines.append("|---|---|---|---|")
    for split in splits:
        for backend in backends:
            data = bundle.get((backend, split))
            if not data:
                continue
            link = data["linking_gold"]
            lines.append(
                f"| {split} | {backend} | {_fmt(link['accuracy'])} | "
                f"{link['correct']}/{link['total']} |"
            )
    lines.append("")

    # ---------------- per-label entity F1
    lines += ["## Per-label entity F1", ""]
    lines.append("| split | backend | " + " | ".join(ENTITY_LABELS) + " |")
    lines.append("|" + "---|" * (len(ENTITY_LABELS) + 2))
    for split in splits:
        for backend in backends:
            data = bundle.get((backend, split))
            if not data:
                continue
            cells = [
                _fmt(data["entity"]["per_label"].get(label, {}).get("f1", 0.0))
                for label in ENTITY_LABELS
            ]
            lines.append(f"| {split} | {backend} | " + " | ".join(cells) + " |")
    lines.append("")

    # ---------------- per-attribute missing table
    lines += ["## Missing detection by attribute (F1)", ""]
    lines.append("| split | backend | " + " | ".join(MISSING_ATTRS) + " |")
    lines.append("|" + "---|" * (len(MISSING_ATTRS) + 2))
    for split in splits:
        for backend in backends:
            data = bundle.get((backend, split))
            if not data:
                continue
            cells = [
                _fmt(data["missing_detection"]["per_attribute"].get(attr, {}).get("f1", 0.0))
                for attr in MISSING_ATTRS
            ]
            lines.append(f"| {split} | {backend} | " + " | ".join(cells) + " |")
    lines.append("")

    # ---------------- routing and risk
    lines += ["## Auto routing and risk", ""]
    lines.append("| split | backend | engine counts | mean initial risk | mean final risk | risk (incomplete gold) | risk (complete gold) |")
    lines.append("|---|---|---|---|---|---|---|")
    for split in splits:
        for backend in backends:
            data = bundle.get((backend, split))
            if not data:
                continue
            engine_counts = data.get("engine_counts") or {}
            risk = data.get("risk") or {}
            lines.append(
                f"| {split} | {backend} | `{engine_counts}` | "
                f"{_fmt(risk.get('mean_initial', 0.0))} | "
                f"{_fmt(risk.get('mean_final', 0.0))} | "
                f"{_fmt(risk.get('mean_final_incomplete', 0.0))} | "
                f"{_fmt(risk.get('mean_final_complete', 0.0))} |"
            )
    lines.append("")
    lines.append(
        "Auto requires BERT to beat Rules by a decisive margin (1.25); otherwise "
        "Rules is used. On train/dev the two backends never disagree, so Auto "
        "mostly equals Rules and is reported as a conservative router, not a "
        "learned model."
    )
    lines.append("")

    # ---------------- synthetic vs handwritten gap
    lines += ["## Synthetic vs handwritten gap", ""]
    lines.append("| backend | split | source | prompts | entity F1 | missing F1 | exact set acc |")
    lines.append("|---|---|---|---|---|---|---|")
    for backend in backends:
        for split in splits:
            data = bundle.get((backend, split))
            if not data:
                continue
            for source, info in sorted(data.get("by_source", {}).items()):
                lines.append(
                    f"| {backend} | {split} | {source} | {info['n_prompts']} | "
                    f"{_fmt(info['entity_f1'])} | {_fmt(info.get('missing_f1', 0.0))} | "
                    f"{_fmt(info['exact_missing_set_accuracy'])} |"
                )
    lines.append("")
    lines.append(
        "The synthetic-vs-handwritten gap is expected: the synthetic templates "
        "share vocabulary with training, while the handwritten prompts use "
        "freer phrasing and different span boundaries (for example they often "
        "exclude 'at the' from a location)."
    )
    lines.append("")

    # ---------------- representative errors
    lines += ["## Representative errors", ""]
    for backend in backends:
        examples: list[dict] = []
        for split in splits:
            examples.extend(all_errors.get(f"{backend}/{split}", []))
        lines += [f"### {backend}", ""]
        if not examples:
            lines.append("No errors with a wrong missing set were recorded.")
            lines.append("")
            continue
        for error in examples[:10]:
            lines.append(
                f"- **{error['category']}** ({error['id']}): "
                f"{error['text']}  \n"
                f"  gold missing: `{error['gold_missing']}`; "
                f"predicted: `{error['pred_missing']}`"
            )
        lines.append("")

    lines.append(
        "Per-attribute and per-element-type tables are stored in the JSON "
        "metrics files (`results/metrics_*.json`)."
    )
    (RESULTS_DIR / "RESULTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate Vector.")
    parser.add_argument("--backend", choices=["rules", "bert", "auto", "both"], default="both")
    parser.add_argument("--allow-llm", action="store_true", help="allow Ollama LLM fallback/explanation during evaluation")
    parser.add_argument("--split", choices=ALL_SPLITS + ["all"], default="all")
    args = parser.parse_args(argv)

    RESULTS_DIR.mkdir(exist_ok=True)
    backends = ["rules", "bert"] if args.backend == "both" else [args.backend]

    all_errors: dict[str, list[dict]] = {}
    for backend_name in backends:
        split_names = ALL_SPLITS if args.split == "all" else [args.split]
        for split in split_names:
            split_records = _load_split(split)
            if not split_records:
                continue
            try:
                metrics, errors = evaluate_split(split_records, backend_name, args.allow_llm)
            except BackendNotAvailable as exc:
                print(f"[{backend_name}] skipped: {exc}")
                print("[bert] run: python train_bert.py")
                break

            _write_json(
                RESULTS_DIR / f"metrics_{backend_name}_{split}.json", metrics
            )
            error_path = RESULTS_DIR / f"errors_{backend_name}_{split}.jsonl"
            with open(error_path, "w", encoding="utf-8") as fh:
                for error in errors:
                    fh.write(json.dumps(error, ensure_ascii=False) + "\n")
            all_errors[f"{backend_name}/{split}"] = errors
            _print_summary(metrics)

    bundle = _load_all_metrics()
    _write_results_md(bundle, all_errors)
    print(f"\nWrote {RESULTS_DIR / 'RESULTS.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
