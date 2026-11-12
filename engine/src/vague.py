"""Detect vague expressions such as "some nice colour" or "somewhere on the page".

Vague text is *not* labelled with its attribute by the annotation rules: the
attribute still counts as missing, but the UI can tell the user it was too
vague instead of simply absent.
"""
from __future__ import annotations

import re

from .schema import ELEMENT_SCHEMA, Element

# Attribute -> list of case-insensitive regex cues.
VAGUE_PATTERNS: dict[str, list[re.Pattern]] = {
    "COLOR": [
        re.compile(r"\b(?:nice|bright|good|any|some|pretty)\s+colou?r\b", re.I),
        re.compile(r"\bcolou?r\s+that\s+looks\s+good\b", re.I),
    ],
    "LOCATION": [
        re.compile(r"\b(?:somewhere|wherever|anywhere)\b", re.I),
    ],
    "ACTION": [
        re.compile(r"\bsomething\s+useful\b", re.I),
        re.compile(r"\bworks\s+properly\b", re.I),
        re.compile(r"\bthe\s+usual\s+thing\b", re.I),
        re.compile(r"\bdoes\s+something\b", re.I),
    ],
    "LABEL": [
        re.compile(r"\bsome\s+text\b", re.I),
        re.compile(r"\bsuitable\s+content\b", re.I),
        re.compile(r"\busual\s+content\b", re.I),
        re.compile(r"\bappropriate\s+(?:text|content)\b", re.I),
    ],
}


def find_vague(clause_text: str) -> dict[str, str]:
    """Return ``{attribute: matched_phrase}`` for vague cues in ``clause_text``.

    Only the first match per attribute is returned; the original casing of the
    phrase is preserved for display.
    """
    found: dict[str, str] = {}
    for attribute, patterns in VAGUE_PATTERNS.items():
        for pattern in patterns:
            match = pattern.search(clause_text)
            if match:
                found[attribute] = match.group(0)
                break
    return found


def clause_windows(
    elements: list[Element],
    tokens_with_offsets: list[tuple[str, int, int]],
    text: str,
) -> dict[int, str]:
    """Return the clause text for each element id.

    The window starts at the element's first token and ends at the next
    element's first token (if it is in the same sentence) or at the end of the
    element's sentence.
    """
    sentence_of: list[int] = []
    sentence = 0
    for token, _, _ in tokens_with_offsets:
        sentence_of.append(sentence)
        if token in {".", "!", "?"}:
            sentence += 1

    windows: dict[int, str] = {}
    for index, element in enumerate(elements):
        start = element.span.start
        current_sentence = sentence_of[start]

        # First token index after this element's sentence.
        sentence_end = start
        while sentence_end < len(tokens_with_offsets) and sentence_of[sentence_end] == current_sentence:
            sentence_end += 1

        end = sentence_end
        if index + 1 < len(elements):
            next_element = elements[index + 1]
            next_start = next_element.span.start
            if sentence_of[next_start] == current_sentence and next_start < end:
                end = next_start

        if end <= start:
            windows[element.id] = element.span.text
        else:
            char_start = tokens_with_offsets[start][1]
            char_end = tokens_with_offsets[end - 1][2]
            windows[element.id] = text[char_start:char_end]
    return windows


def annotate_vague(
    elements: list[Element],
    tokens_with_offsets: list[tuple[str, int, int]],
    text: str,
) -> dict[int, str]:
    """Run vague detection on each element clause and store the result.

    Sets ``element.vague_phrases`` (attribute -> phrase).  Returns the clause
    windows for debugging/reporting.
    """
    windows = clause_windows(elements, tokens_with_offsets, text)
    for element in elements:
        cues = find_vague(windows[element.id])
        required = ELEMENT_SCHEMA[element.type]["required"]
        element.vague_phrases = {a: p for a, p in cues.items() if a in required}
    return windows
