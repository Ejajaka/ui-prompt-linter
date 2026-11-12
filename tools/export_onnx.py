#!/usr/bin/env python3
"""Export the fine-tuned DistilBERT token classifier to ONNX for in-browser use.

Produces ``model.onnx`` (float32) and ``model_quantized.onnx`` (int8) plus the
``config.json`` / ``tokenizer.json`` needed by transformers.js. Run once after
training (or after downloading the ``model-v1`` release), then host the output
folder so the web app can fetch it.

Usage
-----
python tools/export_onnx.py --model models/bert_tagger --out models/bert_tagger_onnx
"""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer
from onnxruntime.quantization import QuantType, quantize_dynamic


def main() -> int:
    parser = argparse.ArgumentParser(description="Export the BERT tagger to ONNX.")
    parser.add_argument("--model", default="models/bert_tagger")
    parser.add_argument("--out", default="models/bert_tagger_onnx")
    args = parser.parse_args()

    model_dir = Path(args.model)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    model = AutoModelForTokenClassification.from_pretrained(model_dir)
    model.eval()
    tokenizer = AutoTokenizer.from_pretrained(model_dir)

    # DistilBERT: no token_type_ids. transformers.js feeds input_ids + attention_mask
    # and reads the ``logits`` output.
    dummy = tokenizer("a button", return_tensors="pt")
    input_ids = dummy["input_ids"]
    attention_mask = dummy["attention_mask"]

    fp32 = out / "model.onnx"
    with torch.no_grad():
        torch.onnx.export(
            model,
            (input_ids, attention_mask),
            str(fp32),
            input_names=["input_ids", "attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch", 1: "sequence"},
                "attention_mask": {0: "batch", 1: "sequence"},
                "logits": {0: "batch", 1: "sequence"},
            },
            opset_version=14,
            do_constant_folding=True,
        )

    # Dynamic int8 quantization (runs in the browser via WASM/WebGPU).
    # transformers.js expects the ONNX inside an ``onnx/`` subfolder.
    onnx_dir = out / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)
    q8 = onnx_dir / "model_quantized.onnx"
    quantize_dynamic(str(fp32), str(q8), weight_type=QuantType.QInt8)

    # transformers.js reads config.json + tokenizer.json from the same folder.
    shutil.copy2(model_dir / "config.json", out / "config.json")
    shutil.copy2(model_dir / "tokenizer.json", out / "tokenizer.json")
    if (model_dir / "tokenizer_config.json").exists():
        shutil.copy2(model_dir / "tokenizer_config.json", out / "tokenizer_config.json")

    print(f"Exported ONNX to {out.resolve()}")
    print(f"  fp32:  {fp32.stat().st_size / 1e6:7.1f} MB")
    print(f"  int8:  {q8.stat().st_size / 1e6:7.1f} MB")
    print("  Copy this folder to docs/models/bert_tagger for GitHub Pages.")
    for name in sorted(p.name for p in out.iterdir()):
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
