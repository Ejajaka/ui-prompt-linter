"""End-to-end analysis: text -> tags -> spans -> elements -> check result."""
from __future__ import annotations

from .bio import bio_to_spans, repair_bio
from .checker import check_elements
from .clarification import (
    build_questions,
    merge_answers,
    unresolved_questions,
)
from .linking import link_spans_to_elements
from .llm_backend import (
    LLMClient,
    LLMNotAvailable,
    LLMResponseError,
    explain_and_recommend,
    extract_elements,
)
from .messages import suggestion
from .risk import compute_risk
from .router import route
from .schema import ELEMENT_SCHEMA, NOUN_TO_TYPE, Element, Span
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


# --------------------------------------------------------------------------- full pipeline
LOW_CONFIDENCE = 0.50


def _rules_confidence(tags: list[str], elements: list, n_tokens: int) -> float:
    """Heuristic confidence for the rules backend."""
    found = 1.0 if elements else 0.0
    labelled = sum(1 for tag in tags if tag != "O")
    coverage = labelled / n_tokens if n_tokens else 0.0
    n_attributes = sum(len(element.attributes) for element in elements)
    density = n_attributes / len(elements) if elements else 0.0
    return 0.5 * found + 0.3 * min(density / 3.0, 1.0) + 0.2 * min(coverage / 0.7, 1.0)


def _bert_confidence(raw_confidence: float, spans: list) -> float:
    """BERT confidence penalised by unmapped ELEMENT spans."""
    unmapped = sum(
        1 for span in spans if span.label == "ELEMENT" and NOUN_TO_TYPE(span.text) is None
    )
    return max(0.0, raw_confidence - 0.25 * min(unmapped, 3))


def _flatten_spans(elements: list) -> list:
    spans: list = []
    for element in elements:
        spans.append(element.span)
        for attribute_spans in element.attributes.values():
            spans.extend(attribute_spans)
    return sorted(spans, key=lambda span: (span.char_start if span.char_start >= 0 else 10**9, span.label))


def _spans_to_bio(spans: list, n_tokens: int) -> list[str]:
    tags = ["O"] * n_tokens
    for span in sorted(spans, key=lambda item: item.start):
        if span.start < 0 or span.end <= span.start:
            continue
        for index in range(span.start, min(span.end, n_tokens)):
            if tags[index] == "O":
                tags[index] = ("B-" if index == span.start else "I-") + span.label
    return tags


def _deterministic_final_prompt(elements: list) -> str:
    if not elements:
        return ""
    parts = []
    for index, element in enumerate(sorted(elements, key=lambda e: e.span.start)):
        text = suggestion(element)
        if index and text.startswith("Add "):
            text = "Also add " + text[4:]
        parts.append(text)
    return " ".join(parts)


def _validate_polished(polished: str, elements: list) -> bool:
    """Reject LLM rewrites that drop confirmed values."""
    if not polished.strip():
        return False
    lowered = polished.lower()
    for element in elements:
        for attribute_spans in element.attributes.values():
            for span in attribute_spans:
                value = span.text.strip()
                if len(value) > 2 and value.lower() not in lowered:
                    return False
    return True


def _deterministic_recommendations(result: dict) -> list[str]:
    return [element["suggestion"] for element in result.get("elements", [])]


def _analyse_tagger(name: str, text: str) -> dict | None:
    try:
        backend = get_backend(name)
    except BackendNotAvailable:
        return None
    if name == "bert":
        tokens, tags, raw_confidence = backend.predict_with_confidence(text)
        confidence = _bert_confidence(raw_confidence, bio_to_spans(tokens, repair_bio(tags), text))
    else:
        tokens, tags = backend.predict(text)
        confidence = None
    tags = repair_bio(tags)
    spans = bio_to_spans(tokens, tags, text)
    elements = link_spans_to_elements(spans, tokens, text)
    annotate_vague(elements, tokens, text)
    result = check_elements(elements)
    if confidence is None:
        confidence = _rules_confidence(tags, elements, len(tokens))
    unknown_spans = [
        span for span in spans
        if span.label == "ELEMENT" and NOUN_TO_TYPE(span.text) is None
    ]
    return {
        "tokens": tokens,
        "tags": tags,
        "spans": spans,
        "elements": elements,
        "result": result,
        "confidence": confidence,
        "unknown_spans": unknown_spans,
        "engine": name,
        "llm_meta": {},
    }


def _analyse_llm(text: str, client: LLMClient) -> dict:
    tokens = tokenize_with_offsets(text)
    elements, meta = extract_elements(text, client)
    annotate_vague(elements, tokens, text)
    result = check_elements(elements)
    spans = _flatten_spans(elements)
    tags = _spans_to_bio(spans, len(tokens))
    confidence = meta.get("grounding_rate", 0.0) if elements else 0.0
    return {
        "tokens": tokens,
        "tags": tags,
        "spans": spans,
        "elements": elements,
        "result": result,
        "confidence": confidence,
        "unknown_spans": [],
        "engine": "llm",
        "llm_meta": meta,
    }


def _try_tagger(name: str, text: str) -> dict | None:
    try:
        return _analyse_tagger(name, text)
    except Exception:  # defensive: a backend must not break the pipeline
        return None


def _route_and_run(text: str, method: str, allow_llm: bool, client: LLMClient | None) -> tuple[dict, dict, str | None]:
    router_meta: dict = {"method": method, "reason": "manual selection", "scores": {}}
    if method == "auto":
        router_meta = route(text, allow_llm=allow_llm)
        method = router_meta["method"]

    llm_error: str | None = None
    chosen: dict | None = None

    if method == "llm":
        if allow_llm:
            try:
                chosen = _analyse_llm(text, client or LLMClient())
            except (LLMNotAvailable, LLMResponseError, Exception) as exc:  # noqa: BLE001
                llm_error = str(exc)
        if chosen is None:
            # Fall back to the best tagger available.
            order = sorted(
                (("rules", router_meta.get("scores", {}).get("rules", 1.0)),
                 ("bert", router_meta.get("scores", {}).get("bert", 0.0))),
                key=lambda item: item[1], reverse=True,
            )
            for name, _ in order:
                chosen = _try_tagger(name, text)
                if chosen is not None:
                    break
            if chosen is None:
                raise BackendNotAvailable("No backend could analyse this prompt.")
    else:
        chosen = _try_tagger(method, text)
        if chosen is None:
            other = "bert" if method == "rules" else "rules"
            chosen = _try_tagger(other, text)
        if chosen is None and allow_llm:
            try:
                chosen = _analyse_llm(text, client or LLMClient())
                method = "llm"
            except (LLMNotAvailable, LLMResponseError, Exception) as exc:  # noqa: BLE001
                llm_error = str(exc)
        if chosen is None:
            raise BackendNotAvailable("No backend could analyse this prompt.")

    # Low-confidence escalation to the LLM (unless we already used it).
    if (
        allow_llm
        and chosen["engine"] != "llm"
        and chosen["confidence"] < LOW_CONFIDENCE
    ):
        try:
            llm_result = _analyse_llm(text, client or LLMClient())
            if llm_result["result"]["summary"]["n_elements"] > 0:
                llm_result["llm_meta"]["fallback_from"] = chosen["engine"]
                chosen = llm_result
        except (LLMNotAvailable, LLMResponseError, Exception) as exc:  # noqa: BLE001
            llm_error = str(exc)

    router_meta["selected"] = chosen["engine"]
    return chosen, router_meta, llm_error


def _run_full(
    text: str,
    method: str = "auto",
    allow_llm: bool = True,
    answers: dict[str, str] | None = None,
    finalize: bool = False,
    client: LLMClient | None = None,
    explain: bool = True,
) -> tuple[dict, list]:
    """Internal pipeline returning the JSON payload and Element objects."""
    analysis, router_meta, llm_error = _route_and_run(text, method, allow_llm, client)
    tokens = analysis["tokens"]
    elements = analysis["elements"]

    initial_questions = build_questions(
        elements,
        analysis["result"],
        answers=None,
        unknown_spans=analysis["unknown_spans"],
        low_confidence=analysis["confidence"] < 0.45,
    )
    initial_unresolved = unresolved_questions(initial_questions, {})
    initial_risk = compute_risk(
        analysis["result"],
        analysis["confidence"],
        len(initial_questions),
        len(initial_unresolved),
    )

    answers = answers or {}
    if answers:
        merge_answers(elements, initial_questions, answers)
        annotate_vague(elements, tokens, text)
        analysis["result"] = check_elements(elements)
        analysis["spans"] = _flatten_spans(elements)
        analysis["tags"] = _spans_to_bio(analysis["spans"], len(tokens))

    questions = build_questions(
        elements,
        analysis["result"],
        answers=answers,
        unknown_spans=analysis["unknown_spans"],
        low_confidence=analysis["confidence"] < 0.45,
    )
    unresolved = unresolved_questions(questions, answers)
    final_risk = compute_risk(
        analysis["result"],
        analysis["confidence"],
        len(questions),
        len(unresolved),
    )

    needs_clarification = bool(questions) and not finalize
    final_prompt = None
    explanation = None
    recommendations = None
    llm_used = False
    deterministic_prompt = _deterministic_final_prompt(elements)

    if not needs_clarification:
        final_prompt = deterministic_prompt
        if allow_llm and explain:
            try:
                llm_data = explain_and_recommend(
                    text,
                    analysis["result"],
                    final_risk,
                    [question.to_dict() for question in unresolved],
                    client or LLMClient(),
                )
                explanation = llm_data["explanation"]
                recommendations = llm_data["recommendations"]
                if llm_data.get("polished_prompt") and _validate_polished(
                    llm_data["polished_prompt"], elements
                ):
                    final_prompt = llm_data["polished_prompt"]
                llm_used = True
            except (LLMNotAvailable, LLMResponseError, Exception):  # noqa: BLE001
                llm_used = False
        if not explanation:
            explanation = final_risk.get("explanation", "")
            if unresolved:
                explanation += " Unresolved: " + "; ".join(
                    question.prompt for question in unresolved
                )
        if recommendations is None:
            recommendations = _deterministic_recommendations(analysis["result"])

    payload = {
        "tokens": [token for token, _, _ in tokens],
        "tags": analysis["tags"],
        "spans": [span.to_dict() for span in analysis["spans"]],
        "result": analysis["result"],
        "engine": analysis["engine"],
        "router": router_meta,
        "confidence": round(analysis["confidence"], 3),
        "llm_meta": analysis.get("llm_meta", {}),
        "llm_error": llm_error,
        "llm_used": llm_used,
        "risk": {"initial": initial_risk, "final": final_risk},
        "clarification": {
            "questions": [question.to_dict() for question in questions],
            "answers": answers,
            "unresolved": [question.to_dict() for question in unresolved],
        },
        "needs_clarification": needs_clarification,
        "final_prompt": final_prompt,
        "deterministic_prompt": deterministic_prompt,
        "explanation": explanation,
        "recommendations": recommendations,
    }
    return payload, elements


def analyze_full(
    text: str,
    method: str = "auto",
    allow_llm: bool = True,
    answers: dict[str, str] | None = None,
    finalize: bool = False,
    client: LLMClient | None = None,
    explain: bool = True,
) -> dict:
    """Router + clarification + risk + optional LLM explanation.

    When ``answers`` is supplied, they are merged structurally and the checker
    is re-run.  The final recommendation is withheld until
    ``needs_clarification`` is false or ``finalize=True``.
    """
    payload, _ = _run_full(
        text, method, allow_llm, answers, finalize, client, explain=explain
    )
    return payload
