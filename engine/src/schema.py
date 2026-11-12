"""Constants, schema loading and shared data classes.

The dataset ships with ``data/schema.json`` which lists the BIO tag set and the
required attributes for every UI element type.  This module is the single source
of truth for both the rule-based and the BERT backend.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------- paths
def _find_project_root(start: Path) -> Path:
    """Locate the project root by walking up until ``data/schema.json`` is found.

    This keeps the same source working in three layouts: the repository
    (``engine/src/schema.py``), the Pyodide virtual filesystem (``/home/pyodide/
    src/schema.py``) and the Hugging Face Space (``engine/src/schema.py``), where
    the root is whichever directory contains ``data/schema.json``.
    """
    for candidate in (start, *start.parents):
        if (candidate / "data" / "schema.json").is_file():
            return candidate
    return start


PROJECT_ROOT = _find_project_root(Path(__file__).resolve().parent)
DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_SCHEMA_PATH = DATA_DIR / "schema.json"

# Attribute names in the canonical order used by the dataset generator.
ATTRIBUTES = ["ELEMENT", "COLOR", "LOCATION", "ACTION", "LABEL"]
ATTRIBUTE_SET = set(ATTRIBUTES)


def load_schema(path: str | Path | None = None) -> dict:
    """Load ``schema.json`` and return the raw dictionary.

    Parameters
    ----------
    path:
        Optional explicit path.  Defaults to ``data/schema.json`` next to the
        project root.
    """
    path = Path(path) if path is not None else DEFAULT_SCHEMA_PATH
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


_RAW_SCHEMA = load_schema()

#: Full BIO tag list, e.g. ``["O", "B-ELEMENT", "I-ELEMENT", ...]``.
TAGS: list[str] = _RAW_SCHEMA["tags"]
#: ``{element_type: {"allowed": [...], "required": [...]}}``
ELEMENT_SCHEMA: dict[str, dict[str, list[str]]] = _RAW_SCHEMA["elements"]
#: All element types the system knows about.
ELEMENT_TYPES: list[str] = list(ELEMENT_SCHEMA)
#: Mapping used by the BERT model: tag string -> integer id.
LABEL2ID: dict[str, int] = {tag: i for i, tag in enumerate(TAGS)}
#: Inverse mapping: integer id -> tag string.
ID2LABEL: dict[int, str] = {i: tag for tag, i in LABEL2ID.items()}

# --------------------------------------------------------------------------- data classes
@dataclass
class Span:
    """A contiguous labelled span over tokens.

    ``start``/``end`` are token indices (end exclusive); ``char_start``/
    ``char_end`` refer to the original prompt string.
    """

    label: str
    start: int
    end: int
    text: str
    char_start: int
    char_end: int
    #: ``"prompt"`` for spans from the text, ``"clarification"`` for user answers.
    source: str = "prompt"

    def to_dict(self) -> dict:
        """JSON-serialisable representation (used by the API / UI)."""
        return {
            "label": self.label,
            "start": self.start,
            "end": self.end,
            "text": self.text,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "source": self.source,
        }


@dataclass
class Element:
    """A detected UI element plus the attributes linked to it.

    Attributes
    ----------
    id:
        1-based id in left-to-right order.
    type:
        One of :data:`ELEMENT_TYPES` (``"button"``, ``"navbar"``, ...).
    span:
        The ``ELEMENT`` span that created this element.
    attributes:
        Attribute name -> list of spans.  Usually one span per attribute, but
        several are kept if the user repeats an attribute.
    missing:
        Required attributes that were not found.
    vague:
        Subset of ``missing`` for which a vague expression was detected.
    """

    id: int
    type: str
    span: Span
    attributes: dict[str, list] = field(default_factory=dict)
    missing: list[str] = field(default_factory=list)
    vague: list[str] = field(default_factory=list)
    #: ``attribute -> matched vague phrase`` (used to word the UI message).
    vague_phrases: dict[str, str] = field(default_factory=dict)


# --------------------------------------------------------------------------- data loading
def load_jsonl(path: str | Path) -> list[dict]:
    """Read a JSONL file into a list of dictionaries."""
    rows: list[dict] = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def split_path(split: str) -> Path:
    """Return the JSONL path for a split name such as ``"dev"``."""
    return DATA_DIR / f"{split}.jsonl"

# --------------------------------------------------------------------------- element nouns
# Keyword -> element type.  Checked in this order so that more specific nouns
# win (e.g. "navigation bar" before "bar").  Multi-word entries are matched as
# substrings of the lower-cased span text.
NOUN_KEYWORDS: list[tuple[str, str]] = [
    ("navigation bar", "navbar"),
    ("menu bar", "navbar"),
    ("nav bar", "navbar"),
    ("navbar", "navbar"),
    ("nav", "navbar"),
    ("text box", "input"),
    ("text field", "input"),
    ("textbox", "input"),
    ("input", "input"),
    ("check box", "checkbox"),
    ("tick box", "checkbox"),
    ("checkbox", "checkbox"),
    ("modal", "modal"),
    ("popup", "modal"),
    ("pop-up", "modal"),
    ("dialog", "modal"),
    ("dropdown", "dropdown"),
    ("select box", "dropdown"),
    ("side menu", "sidebar"),
    ("side panel", "sidebar"),
    ("sidebar", "sidebar"),
    ("button", "button"),
    ("card", "card"),
    ("banner", "image"),
    ("picture", "image"),
    ("photo", "image"),
    ("image", "image"),
    ("img", "image"),
    ("footer", "footer"),
]


def NOUN_TO_TYPE(span_text: str) -> str | None:
    """Map an ELEMENT span's surface text to an element type.

    Returns ``None`` when the span does not contain a known UI noun.  The check
    is case-insensitive and uses substring matching so that "a red sign-up
    button" still maps to ``"button"``.
    """
    lowered = span_text.lower()
    for keyword, elem_type in NOUN_KEYWORDS:
        if keyword in lowered:
            return elem_type
    return None
