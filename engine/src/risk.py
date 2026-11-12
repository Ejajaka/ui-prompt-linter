"""Shared deterministic risk score for UI prompts.

The score is intentionally simple and reproducible.  Detection backends
(Rules/BERT/LLM) only supply a confidence value; the formula and weights are
identical for all of them so scores can be compared.

Risk = 100 * (0.40 * completeness
              + 0.20 * vagueness
              + 0.20 * detection_risk
              + 0.20 * unresolved_ambiguity)
"""
from __future__ import annotations

from .schema import ELEMENT_SCHEMA

WEIGHTS = {
    "completeness": 0.40,
    "vagueness": 0.20,
    "detection": 0.20,
    "unresolved": 0.20,
}

LEVELS = [
    (75, "Critical"),
    (50, "High"),
    (25, "Medium"),
    (0, "Low"),
]


def risk_level(score: float) -> str:
    """Return the human-readable level for a 0-100 risk score."""
    for threshold, label in LEVELS:
        if score >= threshold:
            return label
    return "Low"


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def compute_risk(
    result: dict,
    confidence: float,
    total_questions: int = 0,
    unresolved: int = 0,
) -> dict:
    """Compute the shared risk score from a checker result.

    Parameters
    ----------
    result:
        Output of :func:`src.checker.check_elements`.
    confidence:
        Detector confidence in ``[0, 1]`` (higher is better).
    total_questions:
        Number of clarification questions generated so far.
    unresolved:
        Number of those questions that are still unanswered or marked unknown.
    """
    elements = result.get("elements", [])
    if not elements:
        return {
            "score": 100,
            "level": "Critical",
            "components": {
                "completeness": 1.0,
                "vagueness": 1.0,
                "detection": 1.0,
                "unresolved": 1.0,
            },
            "counts": {
                "total_required": 0,
                "missing": 0,
                "vague": 0,
                "questions": total_questions,
                "unresolved": unresolved,
            },
            "explanation": (
                "No supported UI elements were detected, so the prompt is "
                "treated as unsafe to generate automatically."
            ),
        }

    total_required = 0
    missing = 0
    vague = 0
    for element in elements:
        required = ELEMENT_SCHEMA.get(element["type"], {}).get("required", [])
        total_required += len(required)
        missing += len(element.get("missing", []))
        vague += len(element.get("vague", []))

    completeness = missing / total_required if total_required else 0.0
    vagueness = vague / total_required if total_required else 0.0
    detection = 1.0 - _clamp(confidence)
    unresolved_ratio = unresolved / total_questions if total_questions else 0.0

    score = 100.0 * (
        WEIGHTS["completeness"] * completeness
        + WEIGHTS["vagueness"] * vagueness
        + WEIGHTS["detection"] * detection
        + WEIGHTS["unresolved"] * unresolved_ratio
    )
    score = round(max(0.0, min(100.0, score)), 1)
    level = risk_level(score)

    components = {
        "completeness": round(completeness, 3),
        "vagueness": round(vagueness, 3),
        "detection": round(detection, 3),
        "unresolved": round(unresolved_ratio, 3),
    }
    explanation = deterministic_explanation(
        score, level, components, missing, total_required, vague, unresolved
    )
    return {
        "score": score,
        "level": level,
        "components": components,
        "counts": {
            "total_required": total_required,
            "missing": missing,
            "vague": vague,
            "questions": total_questions,
            "unresolved": unresolved,
        },
        "explanation": explanation,
    }


def deterministic_explanation(
    score: float,
    level: str,
    components: dict,
    missing: int,
    total_required: int,
    vague: int,
    unresolved: int,
) -> str:
    """Template explanation used when the LLM is unavailable."""
    parts = [f"Risk is {score}/100 ({level})."]
    if total_required:
        parts.append(
            f"{missing} of {total_required} required details are missing."
        )
    if vague:
        parts.append(f"{vague} stated detail(s) are too vague to use safely.")
    if components["detection"] >= 0.4:
        parts.append("The detector confidence for this prompt is low.")
    if unresolved:
        parts.append(
            f"{unresolved} clarification question(s) remain unresolved, which "
            "keeps the risk elevated."
        )
    if score >= 75:
        parts.append("Do not send this prompt to a UI generator yet.")
    elif score >= 50:
        parts.append("Resolve the remaining details before generating UI.")
    elif score >= 25:
        parts.append("A few improvements would make this prompt safer.")
    else:
        parts.append("The prompt is specific enough to generate UI.")
    return " ".join(parts)
