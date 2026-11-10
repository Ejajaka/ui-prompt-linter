"""Tokenisation must reproduce the tokens shipped with every dataset record.

The generator used the same regex, so any mismatch is a real bug worth
reporting rather than silently skipping.  A small number of mismatches would
only be acceptable if they were documented; currently there are none.
"""
from pathlib import Path

import pytest

from src.schema import DATA_DIR, load_jsonl
from src.tokenization import tokenize_with_offsets

SPLITS = ["train", "dev", "test", "handwritten_test"]


def _records():
    for split in SPLITS:
        path = DATA_DIR / f"{split}.jsonl"
        for record in load_jsonl(path):
            yield split, record


@pytest.mark.parametrize("split,record", list(_records()), ids=lambda x: x if isinstance(x, str) else "")
def test_dataset_tokens_match_regex(split, record):
    """Every stored token list equals the regex tokenisation of ``text``."""
    got = [tok for tok, _, _ in tokenize_with_offsets(record["text"])]
    assert got == record["tokens"], f"{split}/{record['id']} token mismatch"


def test_offsets_slice_back_to_tokens():
    """Character offsets must recover each token exactly."""
    text = 'Add a "Sign Up" button at the top-right corner.'
    for token, start, end in tokenize_with_offsets(text):
        assert text[start:end] == token


def test_tokenizer_edge_cases():
    assert [t for t, _, _ in tokenize_with_offsets("")] == []
    assert [t for t, _, _ in tokenize_with_offsets("don't panic!")] == ["don't", "panic", "!"]
    assert [t for t, _, _ in tokenize_with_offsets("#2E86C1")] == ["#", "2E86C1"]
