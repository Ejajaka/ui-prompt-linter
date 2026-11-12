"""Unit tests for BIO repair and span extraction."""
from src.bio import bio_to_spans, repair_bio
from src.tokenization import tokenize_with_offsets


def test_repair_stray_i_tag():
    assert repair_bio(["I-COLOR", "I-COLOR", "O"]) == ["B-COLOR", "I-COLOR", "O"]


def test_repair_keeps_valid_sequence():
    tags = ["O", "B-ELEMENT", "I-ELEMENT", "B-COLOR", "O"]
    assert repair_bio(tags) == tags


def test_repair_i_tag_after_other_label():
    assert repair_bio(["B-ELEMENT", "I-COLOR"]) == ["B-ELEMENT", "B-COLOR"]


def test_repair_empty():
    assert repair_bio([]) == []


def test_bio_to_spans_basic():
    text = "Add a red button."
    toks = tokenize_with_offsets(text)
    tags = ["O", "O", "B-COLOR", "B-ELEMENT", "O"]
    spans = bio_to_spans(toks, tags, text)
    assert [(s.label, s.start, s.end, s.text) for s in spans] == [
        ("COLOR", 2, 3, "red"),
        ("ELEMENT", 3, 4, "button"),
    ]
    assert (spans[0].char_start, spans[0].char_end) == (6, 9)


def test_bio_to_spans_multi_token_and_gaps():
    text = "the top right corner"
    toks = tokenize_with_offsets(text)
    tags = ["O", "B-LOCATION", "I-LOCATION", "I-LOCATION"]
    spans = bio_to_spans(toks, tags, text)
    assert len(spans) == 1
    assert spans[0].start == 1 and spans[0].end == 4
    assert spans[0].text == "top right corner"


def test_bio_to_spans_repairs_and_handles_length_mismatch():
    toks = tokenize_with_offsets("red button")
    with __import__("pytest").raises(ValueError):
        bio_to_spans(toks, ["O"])
    spans = bio_to_spans(toks, ["I-COLOR", "I-ELEMENT"])
    assert [s.label for s in spans] == ["COLOR", "ELEMENT"]
