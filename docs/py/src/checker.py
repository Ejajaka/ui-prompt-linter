"""Compare linked elements against the schema and build the final result dict."""
from __future__ import annotations

from .messages import missing_message, suggestion
from .schema import ATTRIBUTES, ELEMENT_SCHEMA, Element


def _ordered_attributes(element: Element) -> dict[str, str]:
    """Display attributes in a stable order (COLOR, LOCATION, ...)."""
    ordered: dict[str, str] = {}
    for attribute in ATTRIBUTES:
        spans = element.attributes.get(attribute)
        if spans:
            ordered[attribute] = spans[0].text
    return ordered


def check_elements(elements: list[Element]) -> dict:
    """Compute missing attributes, messages and suggestions.

    Returns a JSON-serialisable dictionary with an ``elements`` list and a
    ``summary``.  The input :class:`~src.schema.Element` objects are annotated
    with ``missing`` and ``vague`` as a side effect.
    """
    checked: list[dict] = []
    n_incomplete = 0

    for element in elements:
        required = ELEMENT_SCHEMA[element.type]["required"]
        missing = [a for a in required if not element.attributes.get(a)]
        element.missing = missing
        element.vague = [a for a in missing if a in element.vague_phrases]

        if missing:
            n_incomplete += 1

        checked.append(
            {
                "id": element.id,
                "type": element.type,
                "text": element.span.text,
                "attributes": _ordered_attributes(element),
                "missing": missing,
                "vague": element.vague,
                "status": "incomplete" if missing else "complete",
                "messages": [missing_message(element, a) for a in missing],
                "suggestion": suggestion(element),
            }
        )

    if not elements:
        message = (
            "No UI elements detected. Try mentioning things like a button, "
            "navbar or input field."
        )
    elif n_incomplete:
        message = f"{n_incomplete} of {len(elements)} elements has missing details."
    else:
        message = "All elements complete."

    summary = {
        "n_elements": len(elements),
        "n_incomplete": n_incomplete,
        "complete": bool(elements) and n_incomplete == 0,
        "message": message,
    }
    return {"elements": checked, "summary": summary}
