#!/usr/bin/env python3
"""Fine-tune DistilBERT as a BIO token classifier.

Example
-------
python train_bert.py --model distilbert-base-uncased --epochs 5 --lr 5e-5 \
    --batch 16 --max_len 128 --out models/bert_tagger --seed 42

The first sub-token of every word receives the word's label; the remaining
sub-tokens and special tokens get ``-100`` so they are ignored by the loss.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
from pathlib import Path

import numpy as np
import torch
from datasets import Dataset
from seqeval.metrics import accuracy_score, f1_score, precision_score, recall_score
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # engine/

from src.schema import DATA_DIR, ID2LABEL, LABEL2ID, load_jsonl

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def set_seed(seed: int) -> None:
    """Fix every random seed we control."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_records(split: str) -> Dataset:
    """Load a dataset split as a Hugging Face ``Dataset`` of token lists."""
    rows = load_jsonl(DATA_DIR / f"{split}.jsonl")
    return Dataset.from_dict(
        {
            "tokens": [row["tokens"] for row in rows],
            "tags": [row["labels"] for row in rows],
        }
    )


def make_align_fn(tokenizer, max_len: int):
    """Return a map function that aligns word labels with sub-tokens."""

    def align(example):
        encoding = tokenizer(
            example["tokens"],
            is_split_into_words=True,
            truncation=True,
            max_length=max_len,
        )
        word_ids = encoding.word_ids()
        labels: list[int] = []
        previous_word = None
        for word_id in word_ids:
            if word_id is None:
                labels.append(-100)  # special token
            elif word_id != previous_word:
                labels.append(LABEL2ID[example["tags"][word_id]])
            else:
                labels.append(-100)  # continuation sub-token
            previous_word = word_id
        encoding["labels"] = labels
        return encoding

    return align


def make_compute_metrics():
    """seqeval-based metrics used to pick the best checkpoint."""

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        true_labels: list[list[str]] = []
        true_predictions: list[list[str]] = []
        for prediction_row, label_row in zip(predictions, labels):
            labels_out = []
            predictions_out = []
            for prediction, label in zip(prediction_row, label_row):
                if label == -100:
                    continue
                labels_out.append(ID2LABEL[int(label)])
                predictions_out.append(ID2LABEL[int(prediction)])
            true_labels.append(labels_out)
            true_predictions.append(predictions_out)
        return {
            "precision": precision_score(true_labels, true_predictions, zero_division=0),
            "recall": recall_score(true_labels, true_predictions, zero_division=0),
            "f1": f1_score(true_labels, true_predictions, zero_division=0),
            "accuracy": accuracy_score(true_labels, true_predictions),
        }

    return compute_metrics


def plot_curve(log_history: list[dict], path: Path) -> None:
    """Save a loss/F1 training curve (skips quietly if matplotlib is missing)."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:  # pragma: no cover
        return

    epochs, eval_f1, eval_loss, train_loss = [], [], [], []
    step_loss: list[tuple[int, float]] = []
    for entry in log_history:
        if "loss" in entry and entry["loss"] is not None:
            step_loss.append((entry.get("step", 0), entry["loss"]))
        if "eval_f1" in entry:
            epochs.append(entry.get("epoch", len(epochs) + 1))
            eval_f1.append(entry["eval_f1"])
            eval_loss.append(entry.get("eval_loss", float("nan")))
    if not epochs:
        return

    fig, axes = plt.subplots(1, 2, figsize=(10, 3.5))
    if step_loss:
        axes[0].plot([s for s, _ in step_loss], [l for _, l in step_loss],
                     label="train loss", color="#2E86C1")
    axes[0].plot(epochs, eval_loss, marker="o", label="dev loss", color="#E67E22")
    axes[0].set_xlabel("step / epoch")
    axes[0].set_ylabel("loss")
    axes[0].legend()
    axes[0].set_title("Loss")

    axes[1].plot(epochs, eval_f1, marker="o", color="#27AE60")
    axes[1].set_xlabel("epoch")
    axes[1].set_ylabel("F1")
    axes[1].set_ylim(0, 1.02)
    axes[1].set_title("Dev entity F1")

    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train the DistilBERT tagger.")
    parser.add_argument("--model", default="distilbert-base-uncased")
    parser.add_argument("--epochs", type=float, default=5)
    parser.add_argument("--lr", type=float, default=5e-5)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--max_len", type=int, default=128)
    parser.add_argument("--out", default="models/bert_tagger")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args(argv)

    # Reduce tokenizer warnings and keep CPU threads sane.
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    set_seed(args.seed)

    out_dir = Path(args.out)
    results_dir = PROJECT_ROOT / "results"
    results_dir.mkdir(exist_ok=True)

    print(f"Loading tokenizer and model: {args.model}")
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForTokenClassification.from_pretrained(
        args.model,
        num_labels=len(LABEL2ID),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,
    )

    print("Loading train/dev splits")
    train_dataset = load_records("train")
    dev_dataset = load_records("dev")
    align = make_align_fn(tokenizer, args.max_len)
    train_dataset = train_dataset.map(align, remove_columns=train_dataset.column_names)
    dev_dataset = dev_dataset.map(align, remove_columns=dev_dataset.column_names)
    print(f"  train: {len(train_dataset)} examples, dev: {len(dev_dataset)}")

    steps_per_epoch = math.ceil(len(train_dataset) / args.batch)
    total_steps = max(1, int(steps_per_epoch * args.epochs))
    warmup_steps = max(1, int(0.1 * total_steps))

    use_cuda = torch.cuda.is_available()
    training_args = TrainingArguments(
        output_dir=str(out_dir),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch,
        per_device_eval_batch_size=args.batch,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        warmup_steps=warmup_steps,
        logging_steps=20,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        save_total_limit=1,
        fp16=use_cuda,
        seed=args.seed,
        data_seed=args.seed,
        report_to="none",
    )

    collator = DataCollatorForTokenClassification(tokenizer=tokenizer)
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=dev_dataset,
        data_collator=collator,
        compute_metrics=make_compute_metrics(),
        processing_class=tokenizer,
    )

    print(f"Training on {'GPU' if use_cuda else 'CPU'} "
          f"({total_steps} steps, warmup {warmup_steps})")
    trainer.train()

    print("Saving the best model, tokenizer and label map")
    out_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    with open(out_dir / "label_map.json", "w", encoding="utf-8") as fh:
        json.dump({"label2id": LABEL2ID, "id2label": ID2LABEL}, fh, indent=2)

    # Persist the per-epoch training log.
    log_history = trainer.state.log_history
    with open(results_dir / "train_log.json", "w", encoding="utf-8") as fh:
        json.dump(log_history, fh, indent=2)
    plot_curve(log_history, results_dir / "training_curve.png")

    final_metrics = trainer.evaluate()
    print("Final dev metrics:", {k: round(v, 4) for k, v in final_metrics.items()
                                 if isinstance(v, float)})
    print(f"Model saved to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
