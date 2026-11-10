"""End-to-end analysis: text -> tags -> spans -> elements -> check result."""
from __future__ import annotations

from .bio import bio_to_spans, repair_bio
from .checker import check_elements
from .linking import link_spans_to_elements
from .tokenization import tokenize_with_offsets
from .vague import annotate_vague

# Loaded backends are cached so the Streamlit app / CLI reuse the model.
_BACKENDS: dict[str, object] = {}


class BackendNotAvailable(RuntimeError):
    """Raised when a backend cannot be loaded (e.g. BERT model not trained)."""


def get_backend(name: str):
    """Return (and cache) a backend instance by name."""
    if name in _BACKENDS:
        return _BACKENDS[name]
    if name == "rules":
        from .rules_tagger import RulesTagger

        backend = RulesTagger()
    elif name == "bert":
        from .bert_tagger import BertTagger

        try:
            backend = BertTagger()
        except FileNotFoundError as exc:
            raise BackendNotAvailable(str(exc)) from exc
    else:
        raise ValueError(f"Unknown backend {name!r}; use 'rules' or 'bert'.")
    _BACKENDS[name] = backend
    return backend


def analyze(text: str, backend: str = "rules", backend_obj=None) -> dict:
    """Analyse a UI prompt.

    Parameters
    ----------
    text:
        The natural-language prompt.
    backend:
        ``"rules"`` or ``"bert"``.
    backend_obj:
        Optional pre-loaded backend (the Streamlit app caches it with
        ``st.cache_resource``).  When ``None`` the module-level cache is used.

    Returns
    -------
    dict
        ``{"tokens": [...], "tags": [...], "spans": [...], "result": {...}}``
        where ``result`` is the output of :func:`src.checker.check_elements`.
    """
    tagger = backend_obj if backend_obj is not None else get_backend(backend)
    tokens_with_offsets, tags = tagger.predict(text)
    tags = repair_bio(tags)

    spans = bio_to_spans(tokens_with_offsets, tags, text)
    elements = link_spans_to_elements(spans, tokens_with_offsets, text)
    annotate_vague(elements, tokens_with_offsets, text)
    result = check_elements(elements)

    return {
        "tokens": [token for token, _, _ in tokens_with_offsets],
        "tags": tags,
        "spans": [span.to_dict() for span in spans],
        "result": result,
    }
