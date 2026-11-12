#!/usr/bin/env python3
"""Deploy the full app (BERT + OpenCode LLM) to a Hugging Face Docker Space.

Usage
-----
HF_TOKEN=hf_xxx python deploy_hf_space.py --use-opencode-key

The token must have **write** access. The BERT model is downloaded at runtime
from the GitHub release; the OpenCode key is stored as a Space secret, never in
the repository.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path

from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parent.parent

SPACE_DOCKERFILE = """FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1 \\
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

CMD ["streamlit", "run", "app.py", "--server.port=7860", "--server.address=0.0.0.0", "--server.headless=true"]
"""

SPACE_README = """---
title: UI Prompt Linter
emoji: 🧹
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# UI Prompt Linter

Full Streamlit app with the Rules/BERT/LLM router, clarification loop, shared
risk score and OpenCode Go LLM explanations.

Source: https://github.com/Ejajaka/ui-prompt-linter
"""


def _copy_tree(src: Path, dst: Path, names: list[str] | None = None) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if names is not None and item.name not in names:
            continue
        if item.is_dir():
            shutil.copytree(item, dst / item.name, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dst / item.name)


def _opencode_key() -> str | None:
    path = Path.home() / ".local" / "share" / "opencode" / "auth.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))["opencode-go"]["key"]
    except Exception:
        return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Deploy to a Hugging Face Docker Space.")
    parser.add_argument("--repo", default="", help="Space repo id (default: <user>/ui-prompt-linter)")
    parser.add_argument("--use-opencode-key", action="store_true",
                        help="read the OpenCode Go key from auth.json and set it as a Space secret")
    parser.add_argument("--llm-model", default="deepseek-v4.1-flash")
    args = parser.parse_args(argv)

    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACEHUB_API_TOKEN")
    if not token:
        print("Set a Hugging Face write token first, e.g.  $env:HF_TOKEN=\"hf_...\"")
        return 1

    api = HfApi(token=token)
    try:
        user = api.whoami()["name"]
    except Exception as exc:
        print(f"Could not authenticate with Hugging Face: {exc}")
        return 1

    repo_id = args.repo or f"{user}/ui-prompt-linter"
    print(f"Creating/updating Space: {repo_id}")
    try:
        api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker",
                        private=False, exist_ok=True)
    except Exception as exc:
        print(f"Could not create the Space (does the token have write access?): {exc}")
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        space = Path(tmp)
        shutil.copy2(ROOT / "app.py", space / "app.py")
        shutil.copy2(ROOT / "requirements.txt", space / "requirements.txt")
        _copy_tree(ROOT / "engine" / "src", space / "engine" / "src")
        (space / "data").mkdir()
        shutil.copy2(ROOT / "data" / "schema.json", space / "data" / "schema.json")
        shutil.copy2(ROOT / "data" / "handwritten_test.jsonl",
                     space / "data" / "handwritten_test.jsonl")
        (space / "Dockerfile").write_text(SPACE_DOCKERFILE, encoding="utf-8")
        (space / "README.md").write_text(SPACE_README, encoding="utf-8")

        print("Uploading files…")
        api.upload_folder(folder_path=str(space), repo_id=repo_id, repo_type="space",
                          commit_message="Deploy full UI Prompt Linter")

    if args.use_opencode_key:
        key = _opencode_key()
        if not key:
            print("Could not read the OpenCode key from auth.json.")
        else:
            print("Setting OpenCode Go secrets…")
            api.add_space_secret(repo_id, "LLM_BASE_URL", "https://opencode.ai/zen/go/v1")
            api.add_space_secret(repo_id, "LLM_MODEL", args.llm_model)
            api.add_space_secret(repo_id, "LLM_SESSION", "ui-prompt-linter")
            api.add_space_secret(repo_id, "LLM_API_KEY", key)

    print("\nDone. The Space will build in a few minutes:")
    print(f"  https://huggingface.co/spaces/{repo_id}")
    print(f"  https://{repo_id.replace('/', '-').replace('_', '-').lower()}.hf.space")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
