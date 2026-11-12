"""Attach attribute spans (COLOR, LOCATION, ACTION, LABEL) to UI elements.

The heuristic is deliberately simple and explainable:

* left-to-right element ids
* attribute spans live inside sentences (split on ``. ! ?``)
* a COLOR/LABEL immediately before an element belongs to it
* otherwise an attribute belongs to the nearest element on its left in the
  same sentence, or to the first element on its right if none is on the left
"""
from __future__ import annotations

import logging

from .bio import Span
from .schema import Element, NOUN_TO_TYPE

LOGGER = logging.getLogger(__name__)

_SENTENCE_END = {".", "!", "?"}


def _sentence_ids(tokens_with_offsets: list[tuple[str, int, int]]) -> list[int]:
    """Return a sentence index for every token (punctuation ends a sentence)."""
    ids: list[int] = []
    sentence = 0
    for token, _, _ in tokens_with_offsets:
        ids.append(sentence)
        if token in _SENTENCE_END:
            sentence += 1
    return ids


def link_spans_to_elements(
    spans: list[Span],
    tokens_with_offsets: list[tuple[str, int, int]],
    text: str,
) -> list[Element]:
    """Build :class:`~src.schema.Element` objects from labelled spans.

    Parameters
    ----------
    spans:
        All spans returned by :func:`src.bio.bio_to_spans`.
    tokens_with_offsets:
        Tokenisation of ``text`` (used for sentence boundaries).
    text:
        Original prompt, used to slice exact surface forms.

    Returns
    -------
    list[Element]
        Elements in left-to-right order, each with its linked attribute spans.
    """
    sentence_of = _sentence_ids(tokens_with_offsets)

    # 1. ELEMENT spans with a known type become elements.  Landmark nouns are
    #    never ELEMENT spans by the time we get here (the taggers avoid them),
    #    but an unknown noun is skipped with a warning.
    ordered = sorted(spans, key=lambda s: (s.start, s.end))
    elements: list[Element] = []
    for span in ordered:
        if span.label != "ELEMENT":
            continue
        elem_type = NOUN_TO_TYPE(span.text)
        if elem_type is None:
            LOGGER.warning("Ignoring unmapped ELEMENT span %r", span.text)
            continue
        elements.append(Element(id=len(elements) + 1, type=elem_type, span=span))

    # Lookups by element id.
    by_start = {el.span.start: el for el in elements}
    element_sentences = {el.id: sentence_of[el.span.start] for el in elements}

    def nearest_left(span: Span, sentence: int | None) -> Element | None:
        """Nearest element starting before ``span`` (optionally same sentence)."""
        candidates = [
            el
            for el in elements
            if el.span.start < span.start
            and (sentence is None or element_sentences[el.id] == sentence)
        ]
        return max(candidates, key=lambda el: el.span.start) if candidates else None

    def first_right(span: Span, sentence: int | None) -> Element | None:
        """First element starting after ``span`` (optionally same sentence)."""
        candidates = [
            el
            for el in elements
            if el.span.start > span.start
            and (sentence is None or element_sentences[el.id] == sentence)
        ]
        return min(candidates, key=lambda el: el.span.start) if candidates else None

    # 2. Link every attribute span.
    for span in ordered:
        if span.label == "ELEMENT":
            continue
        sentence = sentence_of[span.start]

        # Rule (a): a colour or label glued to the left of an element.
        target: Element | None = None
        if span.label in {"COLOR", "LABEL"}:
            adjacent = by_start.get(span.end)
            if adjacent is not None and element_sentences[adjacent.id] == sentence:
                target = adjacent

        # Rule (b): nearest left, then first right, first in the sentence and
        # only then across sentence boundaries.
        if target is None:
            target = nearest_left(span, sentence) or first_right(span, sentence)
        if target is None:
            target = nearest_left(span, None) or first_right(span, None)

        if target is None:
            LOGGER.debug("Attribute span %r has no element to attach to", span.text)
            continue
        target.attributes.setdefault(span.label, []).append(span)

    return elements


# --------------------------------------------------------------------------- linking metric
def _gold_element_for_tokens(gold_ids: list[int], start: int, end: int) -> int:
    """Majority non-zero gold element id over a token range (0 if none)."""
    counts: dict[int, int] = {}
    for eid in gold_ids[start:end]:
        if eid:
            counts[eid] = counts.get(eid, 0) + 1
    return max(counts, key=counts.get) if counts else 0


def linking_accuracy(records: list[dict]) -> dict:
    """Measure attribute linking using **gold tags** and gold ``elem_ids``.

    This isolates the linking heuristic from tagging errors.  Predicted and
    gold elements are matched by token overlap of their ELEMENT spans; each
    attribute span is then scored by whether it was linked to the matching
    gold element.

    Returns a dictionary with overall ``accuracy``, ``correct``/``total`` and a
    per-label breakdown.
    """
    from .bio import bio_to_spans
    from .tokenization import tokenize_with_offsets

    correct = total = 0
    per_label: dict[str, dict[str, int]] = {}

    for record in records:
        tokens = tokenize_with_offsets(record["text"])
        spans = bio_to_spans(tokens, record["labels"], record["text"])
        elements = link_spans_to_elements(spans, tokens, record["text"])
        gold_ids: list[int] = record["elem_ids"]

        # Map predicted element id -> gold element id by token overlap.
        pred_to_gold: dict[int, int] = {}
        for el in elements:
            pred_to_gold[el.id] = _gold_element_for_tokens(
                gold_ids, el.span.start, el.span.end
            )

        # Which element owns each attribute span (by span identity).
        owner: dict[tuple[str, int, int], int] = {}
        for el in elements:
            for attr_spans in el.attributes.values():
                for attr_span in attr_spans:
                    owner[(attr_span.label, attr_span.start, attr_span.end)] = el.id

        for span in spans:
            if span.label == "ELEMENT":
                continue
            gold_owner = gold_ids[span.start]
            if gold_owner == 0:  # gold did not link this span to an element
                continue
            predicted_owner = pred_to_gold.get(
                owner.get((span.label, span.start, span.end), 0), 0
            )
            total += 1
            bucket = per_label.setdefault(span.label, {"correct": 0, "total": 0})
            bucket["total"] += 1
            if predicted_owner == gold_owner:
                correct += 1
                bucket["correct"] += 1

    return {
        "accuracy": correct / total if total else 0.0,
        "correct": correct,
        "total": total,
        "per_label": {
            label: {
                "accuracy": v["correct"] / v["total"] if v["total"] else 0.0,
                "correct": v["correct"],
                "total": v["total"],
            }
            for label, v in sorted(per_label.items())
        },
    }
