#!/usr/bin/env python3
"""Evaluate the router on the separate `router_data` validation set.

This set is synthetic but uses the full vocabulary with a different seed, so it
contains the Rules/BERT disagreements that are absent from train/dev.  It is used
to validate the router; the official test/handwritten sets remain reporting-only.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # engine/

import evaluate
from src.schema import load_jsonl

ROOT = Path(__file__).resolve().parent.parent.parent
ROUTER_DATA = ROOT / "router_data" / "test.jsonl"
RESULTS = ROOT / "results"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate router choices on router_data.")
    parser.add_argument("--allow-llm", action="store_true")
    parser.add_argument("--out", default="results/router_metrics.json")
    args = parser.parse_args(argv)

    if not ROUTER_DATA.exists():
        print(f"Missing {ROUTER_DATA}. Generate it with:")
        print("  python generate_dataset.py --out router_data --train 1 --dev 1 "
              "--test 300 --seed 777")
        return 1

    records = load_jsonl(ROUTER_DATA)
    for record in records:
        record["__split__"] = "router_dev"

    results = {}
    for method in ["rules", "bert", "auto"]:
        metrics, _ = evaluate.evaluate_split(records, method, allow_llm=args.allow_llm)
        results[method] = metrics
        print(
            f"{method:5s} entity={metrics['entity']['f1']:.3f} "
            f"missing={metrics['missing_detection']['f1']:.3f} "
            f"exact={metrics['prompt_level']['exact_missing_set_accuracy']:.3f} "
            f"engines={metrics.get('engine_counts')}"
        )

    output = ROOT / args.out
    output.parent.mkdir(exist_ok=True)
    with open(output, "w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
