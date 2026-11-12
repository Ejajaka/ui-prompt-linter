"""Deterministic clarification questions and answer merging.

The system asks only about required/ambiguous details.  Answers are merged
structurally (not appended blindly to the prompt) and the checker is re-run.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .messages import ACTION_PHRASES, LABEL_PHRASES
from .schema import ELEMENT_SCHEMA, ELEMENT_TYPES, Element, Span
from .vague import find_vague

UNKNOWN_ANSWERS = {
    "",
    "unknown",
    "i don't know",
    "i dont know",
    "idk",
    "not sure",
    "skip",
    "use placeholder",
    "n/a",
    "none",
}

ATTRIBUTE_EXAMPLES = {
    "COLOR": ["blue", "dark green", "#2E86C1"],
    "LOCATION": ["top right corner", "below the header", "center of the screen"],
    "ACTION": ["opens the signup form", "saves the changes", "switches the theme"],
    "LABEL": ["Sign Up", "Email", "Home, About, Contact"],
}


@dataclass
class Question:
    """One clarification question shown to the user."""

    id: str
    kind: str  # missing | vague | unknown_type | low_confidence
    prompt: str
    element_id: int | None = None
    element_type: str | None = None
    element_text: str | None = None
    attribute: str | None = None
    examples: list[str] = field(default_factory=list)
    options: list[str] | None = None
    span: Span | None = None

    def to_dict(self) -> dict:
        """JSON-serialisable form (the span is intentionally omitted)."""
        return {
            "id": self.id,
            "kind": self.kind,
            "prompt": self.prompt,
            "element_id": self.element_id,
            "element_type": self.element_type,
            "element_text": self.element_text,
            "attribute": self.attribute,
            "examples": self.examples,
            "options": self.options,
        }


def answer_is_unknown(answer: str | None) -> bool:
    """True for empty / skip / "I don't know" answers."""
    return answer is None or answer.strip().lower() in UNKNOWN_ANSWERS


def answer_is_vague(answer: str, attribute: str) -> bool:
    """True when the answer itself is a vague value for ``attribute``."""
    return attribute in find_vague(answer)


def _question_text(element: Element, attribute: str, vague_phrase: str | None) -> str:
    if vague_phrase:
        return (
            f'{element.type.capitalize()} #{element.id} ("{element.span.text}"): '
            f"the {attribute.lower()} is too vague ('{vague_phrase}'). "
            "What should it be?"
        )
    if attribute == "ACTION":
        what = ACTION_PHRASES.get(element.type, "what it should do")
        return (
            f'{element.type.capitalize()} #{element.id} ("{element.span.text}"): '
            f"you did not say {what}. What should happen?"
        )
    if attribute == "LABEL":
        what = LABEL_PHRASES.get(element.type, "the text for it")
        return (
            f'{element.type.capitalize()} #{element.id} ("{element.span.text}"): '
            f"you did not say {what}. What should it be?"
        )
    if attribute == "COLOR":
        return (
            f'{element.type.capitalize()} #{element.id} ("{element.span.text}"): '
            "what colour should it be?"
        )
    if attribute == "LOCATION":
        return (
            f'{element.type.capitalize()} #{element.id} ("{element.span.text}"): '
            "where should it be placed?"
        )
    return (
        f'{element.type.capitalize()} #{element.id} ("{element.span.text}"): '
        f"what should the {attribute.lower()} be?"
    )


def build_questions(
    elements: list[Element],
    result: dict,
    answers: dict[str, str] | None = None,
    unknown_spans: list[Span] | None = None,
    low_confidence: bool = False,
    max_questions: int = 6,
) -> list[Question]:
    """Build the next round of clarification questions.

    Questions already answered concretely are omitted.  Vague answers are asked
    again (one follow-up round max, enforced by the caller's round counter).
    """
    answers = answers or {}
    by_id = {element.id: element for element in elements}
    questions: list[Question] = []

    for item in result.get("elements", []):
        element = by_id.get(item["id"])
        if element is None:
            continue
        for attribute in item.get("missing", []):
            qid = f"el{item['id']}-{attribute}"
            previous = answers.get(qid)
            if previous is not None and not answer_is_unknown(previous):
                if not answer_is_vague(previous, attribute):
                    continue
            vague_phrase = element.vague_phrases.get(attribute)
            questions.append(
                Question(
                    id=qid,
                    kind="vague" if vague_phrase else "missing",
                    prompt=_question_text(element, attribute, vague_phrase),
                    element_id=element.id,
                    element_type=element.type,
                    element_text=element.span.text,
                    attribute=attribute,
                    examples=ATTRIBUTE_EXAMPLES.get(attribute, []),
                )
            )

    for span in unknown_spans or []:
        qid = f"unknown-{span.start}"
        previous = answers.get(qid)
        if previous is not None and not answer_is_unknown(previous):
            continue
        questions.append(
            Question(
                id=qid,
                kind="unknown_type",
                prompt=(
                    f"I found '{span.text}' but could not classify it as a "
                    "supported UI element. Which type is it?"
                ),
                element_text=span.text,
                options=ELEMENT_TYPES + ["Ignore it"],
                span=span,
            )
        )

    if low_confidence and not questions and elements:
        qid = "confidence"
        previous = answers.get(qid)
        if previous is None or answer_is_unknown(previous):
            questions.append(
                Question(
                    id=qid,
                    kind="low_confidence",
                    prompt=(
                        "I am not fully confident about the detected elements. "
                        "Does this list look correct?"
                    ),
                    options=["Looks correct", "Something is wrong"],
                )
            )

    return questions[:max_questions]


def unresolved_questions(
    questions: list[Question], answers: dict[str, str] | None
) -> list[Question]:
    """Questions whose answer is missing, unknown, or still vague."""
    answers = answers or {}
    unresolved: list[Question] = []
    for question in questions:
        answer = answers.get(question.id)
        if answer_is_unknown(answer):
            unresolved.append(question)
            continue
        if question.attribute and answer_is_vague(answer, question.attribute):
            unresolved.append(question)
    return unresolved


def merge_answers(
    elements: list[Element],
    questions: list[Question],
    answers: dict[str, str],
) -> list[Element]:
    """Merge concrete answers into element attributes / unknown elements."""
    by_id = {element.id: element for element in elements}
    next_id = max((element.id for element in elements), default=0) + 1

    for question in questions:
        answer = answers.get(question.id)
        if answer_is_unknown(answer):
            continue
        answer = answer.strip()

        if question.kind in {"missing", "vague"} and question.attribute:
            if answer_is_vague(answer, question.attribute):
                continue  # keep the question open for a follow-up
            element = by_id.get(question.element_id)
            if element is None:
                continue
            element.attributes.setdefault(question.attribute, []).append(
                Span(
                    label=question.attribute,
                    start=-1,
                    end=-1,
                    text=answer,
                    char_start=-1,
                    char_end=-1,
                    source="clarification",
                )
            )
        elif question.kind == "unknown_type" and question.span is not None:
            chosen = answer.strip().lower()
            if chosen in {"ignore", "ignore it"}:
                continue
            if chosen in ELEMENT_TYPES:
                new_element = Element(
                    id=next_id,
                    type=chosen,
                    span=question.span,
                    attributes={},
                )
                elements.append(new_element)
                by_id[new_element.id] = new_element
                next_id += 1
        # low_confidence answers need no structural change
    return elements
