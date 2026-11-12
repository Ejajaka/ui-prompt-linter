"""Tests for the shared deterministic risk score."""
from src.risk import compute_risk, risk_level


def _result(missing=None, vague=None, n_elements=1, element_type="button"):
    missing = missing or []
    vague = vague or []
    return {
        "elements": [
            {
                "id": 1,
                "type": element_type,
                "text": "button",
                "attributes": {},
                "missing": missing,
                "vague": vague,
                "status": "incomplete" if missing else "complete",
                "messages": [],
                "suggestion": "",
            }
        ],
        "summary": {
            "n_elements": n_elements,
            "n_incomplete": 1 if missing else 0,
            "complete": not missing,
            "message": "",
        },
    }


def test_no_elements_is_max_risk():
    result = {"elements": [], "summary": {"n_elements": 0}}
    risk = compute_risk(result, confidence=1.0, total_questions=0, unresolved=0)
    assert risk["score"] == 100
    assert risk["level"] == "Critical"


def test_more_missing_details_increase_risk():
    low = compute_risk(_result(["COLOR"]), confidence=0.9, total_questions=1, unresolved=0)
    high = compute_risk(
        _result(["COLOR", "LOCATION", "ACTION", "LABEL"]),
        confidence=0.9,
        total_questions=4,
        unresolved=4,
    )
    assert high["score"] > low["score"]


def test_answers_and_confidence_reduce_risk():
    unresolved_risk = compute_risk(
        _result(["ACTION", "LABEL"]), confidence=0.5, total_questions=2, unresolved=2
    )
    resolved_risk = compute_risk(
        _result([]), confidence=0.9, total_questions=2, unresolved=0
    )
    assert resolved_risk["score"] < unresolved_risk["score"]


def test_vague_values_add_risk():
    plain = compute_risk(_result(["COLOR"]), confidence=0.9, total_questions=1, unresolved=0)
    vague = compute_risk(
        _result(["COLOR"], ["COLOR"]), confidence=0.9, total_questions=1, unresolved=0
    )
    assert vague["score"] > plain["score"]


def test_levels():
    assert risk_level(0) == "Low"
    assert risk_level(30) == "Medium"
    assert risk_level(60) == "High"
    assert risk_level(90) == "Critical"
