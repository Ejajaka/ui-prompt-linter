"""Clarification loop: questions, blocking final recommendation, merging."""
from src.pipeline import analyze_full


def _answers(questions, values):
    return {question["id"]: values.get(question["attribute"], "unknown") for question in questions}


def test_missing_details_block_final_recommendation():
    payload = analyze_full("Add a button.", method="rules", allow_llm=False)
    assert payload["needs_clarification"] is True
    assert payload["final_prompt"] is None
    assert len(payload["clarification"]["questions"]) == 4
    assert payload["risk"]["initial"]["score"] > 50


def test_answers_resolve_questions_and_lower_risk():
    first = analyze_full("Add a button.", method="rules", allow_llm=False)
    questions = first["clarification"]["questions"]
    answers = _answers(questions, {
        "LABEL": "Sign Up",
        "ACTION": "opens the signup form",
        "COLOR": "blue",
        "LOCATION": "top right corner",
    })
    second = analyze_full(
        "Add a button.", method="rules", allow_llm=False, answers=answers, finalize=True
    )
    assert second["needs_clarification"] is False
    assert "Sign Up" in second["final_prompt"]
    assert "blue" in second["final_prompt"]
    assert second["risk"]["final"]["score"] < second["risk"]["initial"]["score"]


def test_unknown_answer_keeps_placeholder_and_unresolved():
    first = analyze_full("Add a button.", method="rules", allow_llm=False)
    answers = {question["id"]: "unknown" for question in first["clarification"]["questions"]}
    second = analyze_full(
        "Add a button.", method="rules", allow_llm=False, answers=answers, finalize=True
    )
    assert second["clarification"]["unresolved"]
    assert "<label>" in second["final_prompt"]
    assert second["risk"]["final"]["score"] > 50


def test_vague_answer_is_asked_again():
    first = analyze_full("Add a button.", method="rules", allow_llm=False)
    answers = {question["id"]: "unknown" for question in first["clarification"]["questions"]}
    for question in first["clarification"]["questions"]:
        if question["attribute"] == "COLOR":
            answers[question["id"]] = "some nice colour"
        elif question["attribute"] == "LOCATION":
            answers[question["id"]] = "top right corner"
        elif question["attribute"] == "ACTION":
            answers[question["id"]] = "opens the signup form"
        elif question["attribute"] == "LABEL":
            answers[question["id"]] = "Sign Up"
    second = analyze_full("Add a button.", method="rules", allow_llm=False, answers=answers)
    assert any(
        question["attribute"] == "COLOR"
        for question in second["clarification"]["questions"]
    )


def test_no_elements_has_no_questions_and_max_risk():
    payload = analyze_full("hello there", method="rules", allow_llm=False, finalize=True)
    assert payload["needs_clarification"] is False
    assert payload["clarification"]["questions"] == []
    assert payload["risk"]["final"]["score"] == 100
