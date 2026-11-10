"""Human-readable messages and rewrite suggestions for the checker."""
from __future__ import annotations

from .schema import ELEMENT_SCHEMA, Element

# What each element type means by ACTION.  Keys not listed cannot have ACTION.
ACTION_PHRASES = {
    "button": "what happens when it is clicked",
    "modal": "what opens it or when it appears",
    "dropdown": "what happens when an option is selected",
}

# What each element type means by LABEL.
LABEL_PHRASES = {
    "button": "the text on it",
    "navbar": "which links or items it should contain",
    "sidebar": "which links or items it should contain",
    "input": "what it is for (e.g. email, password)",
    "card": "its title",
    "modal": "its title",
    "image": "what it should show",
    "dropdown": "what the user chooses from it",
    "footer": "what it should contain",
    "checkbox": "the text next to it",
}

_PREPOSITIONS = {
    "in",
    "at",
    "on",
    "below",
    "under",
    "above",
    "beside",
    "next",
    "near",
    "underneath",
    "beneath",
    "inside",
}


def element_label(element: Element) -> str:
    """``Button #1 ("red button")`` -- the prefix used by every message."""
    return f'{element.type.capitalize()} #{element.id} ("{element.span.text}")'


def _first_text(element: Element, attribute: str) -> str | None:
    """Surface text of the first span for ``attribute`` (or ``None``)."""
    spans = element.attributes.get(attribute)
    return spans[0].text if spans else None


def missing_message(element: Element, attribute: str) -> str:
    """Build the message for one missing attribute."""
    el = element_label(element)
    phrase = element.vague_phrases.get(attribute)
    if phrase:
        return (
            f"{el}: the {attribute.lower()} is too vague ('{phrase}'); "
            "please be specific."
        )

    if attribute == "COLOR":
        return (
            f"{el}: you didn't mention its colour (for example 'blue', "
            "'dark green' or a hex code like #2E86C1)."
        )
    if attribute == "LOCATION":
        return (
            f"{el}: you didn't say where it should be placed (for example "
            "'top right corner', 'below the header')."
        )
    if attribute == "ACTION":
        what = ACTION_PHRASES.get(element.type, "what it should do")
        return f"{el}: you didn't say {what}."
    if attribute == "LABEL":
        what = LABEL_PHRASES.get(element.type, "the text for it")
        return f"{el}: you didn't say {what}."
    return f"{el}: the {attribute.lower()} is missing."


# --------------------------------------------------------------------------- suggestion
def _color_prefix(element: Element) -> str:
    """Return an existing colour plus a space, or a placeholder if required."""
    colour = _first_text(element, "COLOR")
    if colour:
        return f"{colour} "
    if "COLOR" in ELEMENT_SCHEMA[element.type]["required"]:
        return "<colour> "
    return ""


def _location(element: Element) -> str:
    """Placement phrase, adding a preposition only when one is missing."""
    location = _first_text(element, "LOCATION")
    if not location:
        return "in the <location>"
    first_word = location.split()[0].lower()
    if first_word in _PREPOSITIONS:
        return location
    return f"at the {location}"


def _action(element: Element) -> str:
    """``that <action>`` with a placeholder when no action was stated."""
    action = _first_text(element, "ACTION")
    if not action:
        if element.type == "modal":
            return "that <what opens it>"
        if element.type == "dropdown":
            return "that <what happens on selection>"
        return "that <what it does>"
    if action.lower().startswith(("that ", "which ")):
        return action
    return f"that {action}"


def _label(element: Element, placeholder: str, quoted: bool) -> str:
    """Return an existing label or a placeholder, optionally quoted."""
    label = _first_text(element, "LABEL")
    if label:
        return f'"{label}"' if quoted else label
    return f'"<{placeholder}>"' if quoted else f"<{placeholder}>"


def suggestion(element: Element) -> str:
    """Generate a completed example prompt for one element."""
    elem_type = element.type
    colour = _color_prefix(element)
    location = _location(element)

    if elem_type == "button":
        return (
            f"Add a {colour}button {location} "
            f"labelled {_label(element, 'label', True)} {_action(element)}."
        )
    if elem_type == "navbar":
        return (
            f"Add a {colour}navbar {location} "
            f"with links {_label(element, 'links', False)}."
        )
    if elem_type == "input":
        return (
            f"Add a {colour}input field {location} "
            f"for {_label(element, 'purpose', False)}."
        )
    if elem_type == "card":
        return (
            f"Add a {colour}card {location} "
            f"titled {_label(element, 'title', True)}."
        )
    if elem_type == "modal":
        return (
            f"Add a {colour}modal titled {_label(element, 'title', True)} "
            f"{_action(element)}."
        )
    if elem_type == "image":
        return f"Add an image {location} showing {_label(element, 'subject', False)}."
    if elem_type == "dropdown":
        return (
            f"Add a {colour}dropdown {location} "
            f"for selecting {_label(element, 'options', False)} {_action(element)}."
        )
    if elem_type == "sidebar":
        return (
            f"Add a {colour}sidebar {location} "
            f"with {_label(element, 'items', False)}."
        )
    if elem_type == "footer":
        return f"Add a {colour}footer with {_label(element, 'content', False)}."
    if elem_type == "checkbox":
        return (
            f"Add a {colour}checkbox {location} "
            f"labelled {_label(element, 'text', True)}."
        )
    return f"Add a {colour}{elem_type} {location}."
