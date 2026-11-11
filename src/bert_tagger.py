"""Inference wrapper for the fine-tuned DistilBERT token classifier."""
from __future__ import annotations

import json
from pathlib import Path

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer

from .schema import ID2LABEL, PROJECT_ROOT
from .tokenization import tokenize_with_offsets

DEFAULT_MODEL_DIR = PROJECT_ROOT / "models" / "bert_tagger"


class BertTagger:
    """Load a saved token-classification checkpoint and predict BIO tags.

    Raises
    ------
    FileNotFoundError
        If ``model_dir`` does not exist or is missing the saved weights.  The
        CLI/UI turn this into "BERT model not trained yet, run train_bert.py".
    """

    def __init__(self, model_dir: str | Path = DEFAULT_MODEL_DIR, max_len: int = 128) -> None:
        self.model_dir = Path(model_dir)
        self.max_len = max_len
        if not self.model_dir.exists():
            raise FileNotFoundError(
                f"BERT model not found at {self.model_dir}. "
                "Run: python train_bert.py"
            )
        self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_dir))
        self.model = AutoModelForTokenClassification.from_pretrained(str(self.model_dir))
        self.model.eval()
        self.id2label = dict(ID2LABEL)
        label_map_path = self.model_dir / "label_map.json"
        if label_map_path.exists():
            with open(label_map_path, encoding="utf-8") as fh:
                mapping = json.load(fh)
            self.id2label = {int(k): v for k, v in mapping["id2label"].items()}

    def predict(self, text: str) -> tuple[list[tuple[str, int, int]], list[str]]:
        """Return ``(tokens_with_offsets, BIO tags)`` using the saved model."""
        tokens_with_offsets, tags, _ = self.predict_with_confidence(text)
        return tokens_with_offsets, tags

    def predict_with_confidence(
        self, text: str
    ) -> tuple[list[tuple[str, int, int]], list[str], float]:
        """Like :meth:`predict` but also return mean entity-token confidence."""
        tokens_with_offsets = tokenize_with_offsets(text)
        words = [token for token, _, _ in tokens_with_offsets]
        if not words:
            return tokens_with_offsets, [], 0.0

        encoding = self.tokenizer(
            words,
            is_split_into_words=True,
            truncation=True,
            max_length=self.max_len,
            return_tensors="pt",
        )
        word_ids = encoding.word_ids()
        with torch.no_grad():
            logits = self.model(**encoding).logits[0]
        probabilities = torch.softmax(logits, dim=-1)
        predicted_ids = torch.argmax(logits, dim=-1).tolist()

        tags = ["O"] * len(words)
        entity_confidences: list[float] = []
        seen: set[int] = set()
        for position, word_id in enumerate(word_ids):
            if word_id is None or word_id in seen:
                continue
            seen.add(word_id)
            tag = self.id2label.get(predicted_ids[position], "O")
            tags[word_id] = tag
            if tag != "O":
                entity_confidences.append(float(probabilities[position].max()))
        confidence = (
            sum(entity_confidences) / len(entity_confidences)
            if entity_confidences
            else 0.0
        )
        return tokens_with_offsets, tags, confidence
