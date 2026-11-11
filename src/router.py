"""Explainable prompt-level router: Rules vs BERT vs LLM.

The router looks only at the prompt text, so it can decide before running a
heavy backend.  Features are based on the known strengths and failure modes of
each method (see README).
"""
from __future__ import annotations

import re

from .rules_tagger import (
    ACTION_VERBS,
    BASE_COLORS,
    COLOR_MODIFIERS,
    SPATIAL_WORDS,
)
from .schema import NOUN_KEYWORDS
from .tokenization import tokenize_with_offsets
from .vague import find_vague

# Colours that were held out of the BERT training vocabulary.
HELD_OUT_COLOURS = {
    "#ff5733", "#2e86c1", "royal purple", "off-white", "maroon", "sky blue",
}

EXPLICIT_CUES = {
    "labelled", "labeled", "saying", "titled", "named", "called",
    "with links", "with the items", "containing", "that reads",
    "with the text", "with the title", "with the heading", "for selecting",
    "to choose", "asking for", "meant for", "showing", "depicting",
}

RELATIONAL_PREPS = {
    "below", "under", "above", "beside", "near", "underneath", "beneath",
    "inside", "next",
}

COMMON_WORDS = {
    "a", "an", "the", "and", "or", "but", "with", "without", "for", "to",
    "of", "in", "on", "at", "by", "from", "as", "is", "are", "be", "it",
    "this", "that", "these", "those", "my", "our", "your", "me", "i", "we",
    "you", "add", "create", "make", "build", "place", "put", "insert",
    "include", "design", "give", "want", "need", "also", "then", "next",
    "page", "screen", "app", "website", "site", "which", "who", "when",
    "where", "what", "how", "should", "would", "can", "will", "some", "any",
    "new", "small", "large", "big", "simple", "nice", "main", "another",
    "second", "floating", "right", "left", "top", "bottom", "center",
    "centre", "middle", "corner", "side", "colour", "color",
}

KEYWORD_WORDS = {word for phrase, _ in NOUN_KEYWORDS for word in phrase.split()}
KNOWN_WORDS = (
    KEYWORD_WORDS
    | BASE_COLORS
    | COLOR_MODIFIERS
    | ACTION_VERBS
    | SPATIAL_WORDS
    | COMMON_WORDS
)

HEX_RE = re.compile(r"#[0-9A-Fa-f]{3,8}\b")

# BERT is the weaker backend on this dataset, so it needs a decisive margin.
BERT_MARGIN = 1.25


def _count_phrase(text: str, phrase: str) -> int:
    return len(re.findall(r"\b" + re.escape(phrase) + r"\b", text))


def prompt_features(text: str) -> dict:
    """Extract the router's prompt-only features."""
    lowered = text.lower()
    tokens = [token.lower() for token, _, _ in tokenize_with_offsets(text)]

    noun_counts = {phrase: _count_phrase(lowered, phrase) for phrase, _ in NOUN_KEYWORDS}
    known_nouns = sum(noun_counts.values())
    repeated_noun = any(count > 1 for count in noun_counts.values())

    has_hex = bool(HEX_RE.search(text))
    has_held_out = any(colour in lowered for colour in HELD_OUT_COLOURS)
    has_cta = "cta" in lowered or "call-to-action" in lowered or "call to action" in lowered
    has_explicit_cue = any(cue in lowered for cue in EXPLICIT_CUES)
    vague = find_vague(text)
    has_vague = bool(vague)

    landmark = False
    for index, token in enumerate(tokens):
        if token in RELATIONAL_PREPS:
            window = tokens[index + 1:index + 5]
            if any(word in KEYWORD_WORDS for word in window):
                landmark = True
                break

    list_like = ("," in text and "and" in lowered) or " and " in lowered
    list_without_cue = list_like and not any(
        cue in lowered for cue in {"links", "items", "containing", "listing"}
    )

    alphabet = [token for token in tokens if token.isalpha()]
    oov = [token for token in alphabet if token not in KNOWN_WORDS]
    oov_rate = len(oov) / len(alphabet) if alphabet else 0.0

    return {
        "known_nouns": known_nouns,
        "repeated_noun": repeated_noun,
        "has_hex": has_hex,
        "has_held_out_colour": has_held_out,
        "has_cta": has_cta,
        "has_explicit_cue": has_explicit_cue,
        "has_vague": has_vague,
        "landmark_pattern": landmark,
        "list_without_cue": list_without_cue,
        "oov_rate": round(oov_rate, 3),
        "n_tokens": len(tokens),
    }


def route(text: str, allow_llm: bool = True) -> dict:
    """Choose a detection method from prompt features.

    Returns a dictionary with ``method``, per-method scores, margin, confidence
    and a human-readable reason.
    """
    features = prompt_features(text)
    scores = {"rules": 1.0, "bert": 0.0, "llm": 0.0}

    if features["has_hex"] or features["has_held_out_colour"] or features["has_cta"]:
        scores["rules"] += 3.0
    if features["known_nouns"]:
        scores["rules"] += 2.0
        scores["bert"] += 0.5
    else:
        scores["llm"] += 2.0
        scores["bert"] += 1.0
    if features["has_explicit_cue"]:
        scores["rules"] += 1.0
    if features["repeated_noun"]:
        # Rules often treats the second occurrence as another element.
        scores["bert"] += 3.0
        scores["rules"] -= 1.5
    if features["landmark_pattern"]:
        scores["bert"] += 1.5
    if features["list_without_cue"]:
        # BERT understands "navbar with Shop, Cart, Profile" without a cue.
        scores["bert"] += 3.5
    if features["has_vague"]:
        scores["llm"] += 1.0
    if features["oov_rate"] >= 0.45:
        scores["llm"] += 1.5

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    method, top = ordered[0]
    second_method, second = ordered[1]
    margin = top - second

    if method == "llm" and not allow_llm:
        method = second_method
        margin = abs(scores[method] - scores[ordered[2][0]])

    if margin < 0.75 and allow_llm:
        method = "llm"

    original_method = method
    if method == "bert" and margin < BERT_MARGIN:
        method = "rules"

    confidence = max(0.30, min(0.95, 0.55 + margin / 4.0))
    reason = _reason(method, features, scores)
    if original_method == "bert" and method == "rules":
        reason = "BERT's advantage was not decisive; Rules is safer on this dataset."
    return {
        "method": method,
        "scores": {name: round(value, 2) for name, value in scores.items()},
        "margin": round(margin, 2),
        "confidence": round(confidence, 2),
        "reason": reason,
        "features": features,
    }


def _reason(method: str, features: dict, scores: dict) -> str:
    if method == "llm":
        if features["known_nouns"] == 0:
            return "No known UI noun was found; the LLM can interpret free-form wording."
        if features["has_vague"]:
            return "The prompt contains vague language; the LLM can interpret it."
        if features["oov_rate"] >= 0.45:
            return "Many words are outside the known vocabulary; the LLM is the safer choice."
        return "The prompt is ambiguous for the other methods; using the LLM."
    if method == "bert":
        if features["repeated_noun"]:
            return "A UI noun is repeated (often inside a label); BERT handles this better."
        if features["landmark_pattern"]:
            return "A landmark phrase may hide a real element; BERT handles this better."
        if features["list_without_cue"]:
            return "A list-like label has no explicit cue; BERT handles this better."
        return "The prompt matches BERT's stronger free-form pattern handling."
    if features["has_hex"] or features["has_held_out_colour"]:
        return "The prompt contains a hex or held-out colour that the rule lexicon knows."
    if features["has_cta"]:
        return "The prompt contains CTA/call-to-action phrasing that BERT often splits."
    if features["known_nouns"]:
        return "The prompt contains known UI nouns and explicit cues; Rules is reliable."
    return "Rules is the safe default."
