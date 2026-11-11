"""Tokenisation shared by the dataset, both backends and the UI.

The dataset was generated with exactly this regex, so it must stay identical.
A Unicode word is a run of word characters, optionally including an apostrophe
suffix (``don't`` -> ``don`` + ``'t``); every other non-space character is its
own token (quotes, punctuation, ``#``).
"""
from __future__ import annotations

import re

#: Matches a word (with optional apostrophe suffix) or a single non-space symbol.
TOKEN_RE = re.compile(r"\w+(?:'\w+)?|[^\w\s]")


def tokenize_with_offsets(text: str) -> list[tuple[str, int, int]]:
    """Return ``(token, char_start, char_end)`` triples for ``text``.

    Examples
    --------
    >>> tokenize_with_offsets('Add a "Sign Up" button.')
    [('Add', 0, 3), ('a', 4, 5), ('"', 6, 7), ('Sign', 7, 11), ('Up', 12, 14), ('"', 14, 15), ('button', 16, 22), ('.', 22, 23)]
    """
    return [(m.group(), m.start(), m.end()) for m in TOKEN_RE.finditer(text)]
