"""Oracle test: with **gold tags**, linking + checker must recover gold missing
attributes.  This validates the non-ML half of the system independently of any
tagger.  The spec requires at least 95% element-level agreement.
"""
import pytest

from src.bio import bio_to_spans
from src.checker import check_elements
from src.linking import link_spans_to_elements
from src.schema import DATA_DIR, load_jsonl
from src.tokenization import tokenize_with_offsets
from src.vague import annotate_vague


def _gold_element_id(gold_ids, start, end):
    counts = {}
    for eid in gold_ids[start:end]:
        if eid:
            counts[eid] = counts.get(eid, 0) + 1
    return max(counts, key=counts.get) if counts else 0


@pytest.mark.parametrize("split", ["dev", "handwritten_test"])
def test_oracle_missing_matches_gold(split):
    records = load_jsonl(DATA_DIR / f"{split}.jsonl")
    total = 0
    matched = 0
    mismatches = []

    for record in records:
        tokens = tokenize_with_offsets(record["text"])
        spans = bio_to_spans(tokens, record["labels"], record["text"])
        elements = link_spans_to_elements(spans, tokens, record["text"])
        annotate_vague(elements, tokens, record["text"])
        result = check_elements(elements)

        gold_by_id = {e["id"]: e for e in record["elements"]}
        for element in elements:
            gold_id = _gold_element_id(record["elem_ids"], element.span.start, element.span.end)
            total += 1
            if gold_id == 0 or gold_id not in gold_by_id:
                mismatches.append((record["id"], element.span.text, "no gold match", None))
                continue
            predicted = next(
                item["missing"] for item in result["elements"] if item["id"] == element.id
            )
            gold_missing = gold_by_id[gold_id]["missing"]
            if set(predicted) == set(gold_missing):
                matched += 1
            else:
                mismatches.append(
                    (record["id"], element.span.text, predicted, gold_missing)
                )

    accuracy = matched / total if total else 1.0
    if mismatches:
        print(f"\n{split}: {len(mismatches)} mismatched elements")
        for mismatch in mismatches[:15]:
            print("  ", mismatch)
    assert accuracy >= 0.95, f"{split} oracle accuracy {accuracy:.3f} < 0.95"
