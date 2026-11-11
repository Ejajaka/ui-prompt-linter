"""BIO tag utilities: repairing malformed tag sequences and building spans."""
from __future__ import annotations

from .schema import ATTRIBUTE_SET, Span

# Re-exported for callers that expect ``from src.bio import Span``.
__all__ = ["Span", "repair_bio", "bio_to_spans"]


def _split_tag(tag: str) -> tuple[str, str]:
    """Split ``B-COLOR`` into ``("B", "COLOR")``; ``O`` -> ``("O", "O")``."""
    if tag == "O":
        return "O", "O"
    if len(tag) > 2 and tag[1] == "-":
        return tag[0], tag[2:]
    return "O", "O"  # unknown tag -> treat as outside


def repair_bio(tags: list[str]) -> list[str]:
    """Turn stray ``I-X`` tags into ``B-X``.

    A tagger may emit ``O I-COLOR`` at the start of a span.  BIO tagging
    requires the first token of a span to be ``B-X``; this function enforces
    that rule without changing anything else.
    """
    repaired: list[str] = []
    previous = "O"
    for tag in tags:
        prefix, label = _split_tag(tag)
        prev_prefix, prev_label = _split_tag(previous)
        if prefix == "I" and not (prev_prefix in {"B", "I"} and prev_label == label):
            repaired.append(f"B-{label}")
        else:
            repaired.append(f"{prefix}-{label}" if prefix != "O" else "O")
        previous = repaired[-1]
    return repaired


def bio_to_spans(
    tokens_with_offsets: list[tuple[str, int, int]],
    tags: list[str],
    text: str | None = None,
) -> list["Span"]:
    """Convert aligned tokens and BIO tags into a list of :class:`Span`.

    Parameters
    ----------
    tokens_with_offsets:
        Output of :func:`src.tokenization.tokenize_with_offsets`.
    tags:
        One BIO tag per token.  The list is repaired first, so callers may pass
        raw model output.
    text:
        Optional original prompt.  When given, each span's ``text`` is sliced
        from it (preserving spacing); otherwise tokens are joined by spaces.
    """
    if len(tokens_with_offsets) != len(tags):
        raise ValueError(
            f"tokens ({len(tokens_with_offsets)}) and tags ({len(tags)}) length mismatch"
        )
    tags = repair_bio(tags)

    spans: list[Span] = []
    start = 0
    current_label: str | None = None

    def close(end: int) -> None:
        nonlocal start, current_label
        if current_label is None:
            return
        char_start = tokens_with_offsets[start][1]
        char_end = tokens_with_offsets[end - 1][2]
        if text is not None:
            surface = text[char_start:char_end]
        else:
            surface = " ".join(t[0] for t in tokens_with_offsets[start:end])
        spans.append(Span(current_label, start, end, surface, char_start, char_end))

    for i, tag in enumerate(tags):
        prefix, label = _split_tag(tag)
        if prefix == "B":
            close(i)
            start, current_label = i, label
        elif prefix == "I":
            # ``repair_bio`` guarantees this only continues the current span.
            if current_label != label:
                close(i)
                start, current_label = i, label
        else:  # O
            close(i)
            start, current_label = i, None
    close(len(tags))
    # Drop impossible labels defensively (the model can only emit known ones).
    return [s for s in spans if s.label in ATTRIBUTE_SET]
