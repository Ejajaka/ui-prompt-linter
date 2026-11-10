"""Rule-based BIO tagger: the deterministic, explainable baseline.

The tagger is a pipeline of passes; a token that is already labelled is never
overwritten by a later pass.  Order matters:

1. quoted text      -> LABEL
2. UI nouns         -> ELEMENT (with a landmark guard)
3. colour words      -> COLOR
4. spatial phrases   -> LOCATION
5. action clauses    -> ACTION
6. unquoted labels   -> LABEL

Everything here is tuned on ``train.jsonl`` and ``dev.jsonl`` only.
"""
from __future__ import annotations

import re

from .schema import ELEMENT_SCHEMA, NOUN_TO_TYPE
from .tokenization import tokenize_with_offsets

# --------------------------------------------------------------------------- lexicons
ELEMENT_PHRASES = [
    "button", "primary button", "cta button", "call-to-action button",
    "navbar", "navigation bar", "menu bar", "nav",
    "input field", "input box", "text box", "text field",
    "card", "info card", "content card",
    "modal", "modal window", "popup", "pop-up", "dialog box",
    "image", "picture", "banner image", "photo",
    "dropdown", "dropdown menu", "select box",
    "sidebar", "side menu", "side panel",
    "footer", "page footer", "footer section",
    "checkbox", "check box", "tick box",
]

RELATIONAL_PREPS = {
    "below", "under", "above", "beside", "near", "underneath", "beneath",
    "inside", "next",
}

BASE_COLORS = {
    "red", "blue", "green", "orange", "purple", "teal", "black", "white",
    "yellow", "pink", "grey", "gray", "maroon", "brown", "cyan", "magenta",
    "gold", "silver", "violet", "indigo", "beige", "turquoise", "lime",
    "navy", "crimson",
}

COLOR_MODIFIERS = {
    "dark", "light", "navy", "royal", "sky", "off", "bright", "pale", "deep",
}

SPATIAL_WORDS = {"top", "bottom", "left", "right", "center", "centre", "middle", "corner", "side"}
LOCATION_RUN = SPATIAL_WORDS | {"of", "the", "page", "screen"}

ACTION_VERBS = {
    "open", "opens", "submit", "submits", "take", "takes", "download", "downloads",
    "add", "adds", "scroll", "scrolls", "log", "logs", "toggle", "toggles",
    "send", "sends", "save", "saves", "clear", "clears", "filter", "filters",
    "change", "changes", "sort", "sorts", "update", "updates", "show", "shows",
    "switch", "switches", "appear", "appears", "pop", "pops", "delete", "deletes",
    "navigate", "navigates", "redirect", "redirects", "display", "displays",
    "trigger", "triggers", "start", "starts", "close", "closes", "expand",
    "expands", "play", "plays", "reset", "resets",
}

ACTION_STOP = {
    "with", "labelled", "labeled", "saying", "titled", "at", "for",
    "listing", "containing", "showing", "depicting",
}

ACTION_CUES = {"that", "which", "to", "and"}

# Cue phrases allowed for each element type.  Making this type-specific stops
# generic words such as "with" from turning "with a red border" into a label.
LABEL_CUES = {
    "button": ["with the text", "that reads", "labelled", "labeled", "saying"],
    "checkbox": ["with the text", "labelled", "labeled", "saying"],
    "navbar": ["with links", "with the items", "containing"],
    "input": ["asking for", "meant for", "for"],
    "card": ["with the heading", "titled", "named"],
    "modal": ["with the title", "titled", "called"],
    "image": ["showing", "depicting", "of"],
    "dropdown": ["for selecting", "to choose", "listing", "for"],
    "sidebar": ["listing", "containing", "with"],
    "footer": ["showing", "containing", "with"],
}

PREFIX_LABEL_TYPES = {"button", "input", "checkbox", "dropdown"}

PREFIX_LABEL_STOP = {
    "a", "an", "the", "new", "small", "large", "big", "simple", "nice", "main",
    "another", "second", "floating", "add", "create", "place", "put", "insert",
    "include", "design", "make", "build", "give", "i", "want", "need", "also",
    "then", "next", "additionally", "and", "with",
}

HEX_RE = re.compile(r"^[0-9A-Fa-f]{3,8}$")
SENTENCE_END = {".", "!", "?"}


def _tokenize_phrase(phrase: str) -> tuple[str, ...]:
    """Tokenise a lexicon phrase with the same regex used everywhere else."""
    return tuple(tok.lower() for tok, _, _ in tokenize_with_offsets(phrase))


class RulesTagger:
    """Deterministic lexicon + regex tagger.

    ``predict`` returns ``(tokens_with_offsets, tags)`` exactly like the BERT
    backend, so the two are interchangeable.
    """

    def __init__(self) -> None:
        # Longest phrases first so "call-to-action button" beats "button".
        self._element_patterns: list[tuple[tuple[str, ...], str]] = sorted(
            ((_tokenize_phrase(p), p) for p in ELEMENT_PHRASES),
            key=lambda item: len(item[0]),
            reverse=True,
        )

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _set_span(tags: list[str], claimed: list[bool], start: int, end: int,
                  label: str) -> bool:
        """Label ``[start, end)`` if every token is unclaimed."""
        if start >= end or any(claimed[start:end]):
            return False
        for i in range(start, end):
            tags[i] = ("B-" if i == start else "I-") + label
            claimed[i] = True
        return True

    @staticmethod
    def _sentences(tokens: list[str]) -> list[int]:
        ids: list[int] = []
        sentence = 0
        for token in tokens:
            ids.append(sentence)
            if token in SENTENCE_END:
                sentence += 1
        return ids

    # ------------------------------------------------------------------ passes
    def _quotes_pass(self, tokens: list[str], tags: list[str], claimed: list[bool]) -> None:
        """Tag tokens inside matching double quotes (straight or curly)."""
        openers = {'"', "“"}
        closers = {'"', "”"}
        i = 0
        while i < len(tokens):
            if tokens[i] in openers:
                j = i + 1
                while j < len(tokens) and tokens[j] not in closers:
                    j += 1
                if j < len(tokens):
                    self._set_span(tags, claimed, i + 1, j, "LABEL")
                    i = j
            i += 1

    def _element_pass(self, tokens: list[str], tags: list[str],
                      claimed: list[bool]) -> list[tuple[int, int, str]]:
        """Longest-phrase match over UI nouns, with a landmark guard."""
        lowered = [t.lower() for t in tokens]
        elements: list[tuple[int, int, str]] = []
        n = len(tokens)
        for i in range(n):
            if claimed[i]:
                continue
            for pattern, _phrase in self._element_patterns:
                length = len(pattern)
                if i + length > n:
                    continue
                if tuple(lowered[i:i + length]) != pattern:
                    continue
                # Landmark guard: "above the footer" is a LOCATION, not an element.
                context = lowered[max(0, i - 3):i]
                if any(word in RELATIONAL_PREPS for word in context):
                    continue
                if self._set_span(tags, claimed, i, i + length, "ELEMENT"):
                    surface = " ".join(tokens[i:i + length])
                    elem_type = NOUN_TO_TYPE(surface)
                    if elem_type:
                        elements.append((i, i + length, elem_type))
                    break
        return elements

    def _color_pass(self, tokens: list[str], tags: list[str], claimed: list[bool]) -> None:
        """Base colours, optional modifiers ("navy blue") and hex codes."""
        lowered = [t.lower() for t in tokens]
        n = len(tokens)
        i = 0
        while i < n:
            if claimed[i]:
                i += 1
                continue

            # Hex colour: "#" followed by a hex token.
            if lowered[i] == "#" and i + 1 < n and HEX_RE.match(tokens[i + 1]):
                if self._set_span(tags, claimed, i, i + 2, "COLOR"):
                    i += 2
                    continue

            # Modifier + optional hyphen + base colour.
            if lowered[i] in COLOR_MODIFIERS:
                if i + 1 < n and lowered[i + 1] in BASE_COLORS:
                    if self._set_span(tags, claimed, i, i + 2, "COLOR"):
                        i += 2
                        continue
                if (i + 2 < n and tokens[i + 1] == "-"
                        and lowered[i + 2] in BASE_COLORS):
                    if self._set_span(tags, claimed, i, i + 3, "COLOR"):
                        i += 3
                        continue

            # Plain base colour.
            if lowered[i] in BASE_COLORS:
                if self._set_span(tags, claimed, i, i + 1, "COLOR"):
                    i += 1
                    continue
            i += 1

    def _location_pass(self, tokens: list[str], tags: list[str],
                       claimed: list[bool]) -> None:
        """Absolute ("in the top right corner") and relational ("below the header")"""
        lowered = [t.lower() for t in tokens]
        n = len(tokens)
        i = 0
        while i < n:
            if claimed[i]:
                i += 1
                continue

            # ---- absolute
            if lowered[i] in {"in", "at", "on"}:
                # "somewhere on the side" is a vague phrase, not a location.
                if i > 0 and lowered[i - 1] in {"somewhere", "anywhere", "wherever"}:
                    i += 1
                    continue
                j = i + 1
                if j < n and lowered[j] == "the":
                    j += 1
                run_end = j
                while run_end < n and lowered[run_end] in LOCATION_RUN:
                    run_end += 1
                # Trim trailing "of"/"the".
                while run_end > j and lowered[run_end - 1] in {"of", "the"}:
                    run_end -= 1
                if run_end > j and any(w in SPATIAL_WORDS for w in lowered[j:run_end]):
                    if self._set_span(tags, claimed, i, run_end, "LOCATION"):
                        i = run_end
                        continue

            # ---- relational
            if lowered[i] in RELATIONAL_PREPS:
                start = i
                j = i + 1
                if lowered[i] == "next" and j < n and lowered[j] == "to":
                    j += 1
                collected = 0
                end = j
                while end < n and collected < 4:
                    word = lowered[end]
                    if (claimed[end]
                            or tokens[end] in {",", ".", ";", "!", "?"}
                            or tokens[end] in {'"', "“", "”"}
                            or word in ACTION_STOP
                            or word in {"that", "which", "and", "for", "to",
                                        "of", "listing", "containing", "showing",
                                        "coloured", "colored", "colour", "color"}):
                        break
                    end += 1
                    collected += 1
                if end > j and self._set_span(tags, claimed, start, end, "LOCATION"):
                    i = end
                    continue
            i += 1

    def _action_pass(self, tokens: list[str], tags: list[str], claimed: list[bool]) -> None:
        """Cue word + finite verb, e.g. ``that opens the signup form``."""
        lowered = [t.lower() for t in tokens]
        n = len(tokens)
        for i in range(1, n):
            if lowered[i] not in ACTION_VERBS or claimed[i]:
                continue
            if lowered[i - 1] not in ACTION_CUES:
                continue

            end = i + 1
            while end < n:
                word = lowered[end]
                if claimed[end]:
                    break
                if tokens[end] in {",", ".", ";", "!", "?"}:
                    break
                if word in ACTION_STOP:
                    break
                if word in {"in", "on"} and end + 1 < n and lowered[end + 1] in SPATIAL_WORDS:
                    break
                if (word == "and" and end + 2 < n
                        and lowered[end + 1] in {"a", "an", "the"}
                        and NOUN_TO_TYPE(" ".join(tokens[end + 2:end + 3]))):
                    break
                end += 1
            self._set_span(tags, claimed, i, end, "ACTION")

    def _governing_element_type(self, cue_start: int, elements: list[tuple[int, int, str]],
                                sentence_of: list[int]) -> str | None:
        """Type of the nearest ELEMENT to the left in the same sentence."""
        sentence = sentence_of[cue_start]
        candidates = [
            (start, end, elem_type)
            for start, end, elem_type in elements
            if start < cue_start and sentence_of[end - 1] == sentence
        ]
        return max(candidates)[2] if candidates else None

    def _label_pass(self, tokens: list[str], tags: list[str], claimed: list[bool],
                    elements: list[tuple[int, int, str]]) -> None:
        """Cue phrases and single-word prefix labels (non-quoted)."""
        lowered = [t.lower() for t in tokens]
        sentence_of = self._sentences(tokens)
        n = len(tokens)

        # Build (tokens, cue) pairs, longest cue first.
        cues: list[tuple[tuple[str, ...], str, str]] = []
        for elem_type, cue_list in LABEL_CUES.items():
            for cue in cue_list:
                cues.append((_tokenize_phrase(cue), cue, elem_type))
        cues.sort(key=lambda item: len(item[0]), reverse=True)

        for i in range(n):
            if claimed[i]:
                continue
            governing = self._governing_element_type(i, elements, sentence_of)
            if governing is None:
                continue
            for pattern, _cue, elem_type in cues:
                if elem_type != governing:
                    continue
                length = len(pattern)
                if i + length > n or tuple(lowered[i:i + length]) != pattern:
                    continue
                start = i + length
                if start >= n or tokens[start] in {'"', "“"}:
                    continue  # quoted label already handled by pass 1
                end = self._label_end(tokens, lowered, start, claimed)
                if end > start:
                    self._set_span(tags, claimed, start, end, "LABEL")
                break

        # Single word immediately before a button/input/checkbox/dropdown.
        for start, _end, elem_type in elements:
            if elem_type not in PREFIX_LABEL_TYPES or start == 0:
                continue
            candidate = start - 1
            if claimed[candidate]:
                continue
            word = lowered[candidate]
            if not re.match(r"^\w", word) or word in PREFIX_LABEL_STOP:
                continue
            if word in BASE_COLORS or word in COLOR_MODIFIERS:
                continue
            if word in ACTION_VERBS:
                continue
            self._set_span(tags, claimed, candidate, candidate + 1, "LABEL")

    @staticmethod
    def _label_end(tokens: list[str], lowered: list[str], start: int,
                   claimed: list[bool]) -> int:
        """Find the end of an unquoted label starting at ``start``."""
        n = len(tokens)
        label_is_capitalised = bool(tokens[start]) and tokens[start][0].isupper()
        end = start
        while end < n:
            token = tokens[end]
            word = lowered[end]
            # Stop when the next attribute (colour, location, action) starts.
            if claimed[end]:
                break
            if token in {".", ";", "!", "?"}:
                break
            if token == ",":
                next_cap = end + 1 < n and tokens[end + 1][:1].isupper()
                if label_is_capitalised and next_cap:
                    end += 1
                    continue
                break
            if word in {"that", "which"}:
                break
            if word == "and":
                if (end + 2 < n and lowered[end + 1] in {"a", "an", "the"}
                        and NOUN_TO_TYPE(tokens[end + 2])):
                    break
                end += 1
                continue
            if word in BASE_COLORS and end > start:
                break
            if word == "in" and end + 1 < n and (
                lowered[end + 1] in BASE_COLORS
                or lowered[end + 1] in COLOR_MODIFIERS
                or lowered[end + 1] in {"some", "any", "nice", "bright", "good", "pretty"}
            ):
                break
            if word in {
                "with", "at", "below", "under", "above", "beside", "near",
                "labelled", "labeled", "saying", "titled", "named", "called",
                "listing", "containing", "showing", "depicting",
            }:
                break
            end += 1
        return end

    # ------------------------------------------------------------------ public
    def predict(self, text: str) -> tuple[list[tuple[str, int, int]], list[str]]:
        """Return ``(tokens_with_offsets, BIO tags)`` for ``text``."""
        tokens_with_offsets = tokenize_with_offsets(text)
        tokens = [token for token, _, _ in tokens_with_offsets]
        tags = ["O"] * len(tokens)
        claimed = [False] * len(tokens)

        self._quotes_pass(tokens, tags, claimed)
        elements = self._element_pass(tokens, tags, claimed)
        self._color_pass(tokens, tags, claimed)
        self._location_pass(tokens, tags, claimed)
        self._action_pass(tokens, tags, claimed)
        self._label_pass(tokens, tags, claimed, elements)

        return tokens_with_offsets, tags
