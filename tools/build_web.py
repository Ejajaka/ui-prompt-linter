#!/usr/bin/env python3
"""Build the React web app and publish the bundle into ``docs/``.

GitHub Pages serves ``docs/`` from ``main``.  This script runs the Vite build,
then replaces only the generated assets so hand-written pages such as
``docs/rules/`` and ``docs/privacy-policy.html`` survive.

The BERT weights are committed once under ``docs/models/bert_tagger`` (they are
too large for the Python mirrors).  For local development they are copied into
``ui/web-app/public/models`` (gitignored) so Vite can serve them.

Usage
-----
python tools/build_web.py            # build + publish
python tools/build_web.py --check    # only verify the mirrors, no build
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "ui" / "web-app"
DIST = APP / "dist"
DOCS = ROOT / "docs"
PUBLIC_MODELS = APP / "public" / "models"
DOCS_MODELS = DOCS / "models"

# Everything Vite emits that belongs on the published site.
GENERATED = [
    "index.html",
    "examples.json",
    "favicon-32.png",
    "favicon-512.png",
    "logo.svg",
    "assets",
    "py",
    "models",
]


def run(command: list[str]) -> None:
    executable = shutil.which(command[0])
    if executable is None:
        raise SystemExit(f"Could not find {command[0]} on PATH")
    argv = [executable, *command[1:]]
    print("$", " ".join(command))
    subprocess.run(argv, cwd=APP, check=True)


def ensure_public_models() -> None:
    """Copy the committed weights for the Vite dev server / build."""
    if PUBLIC_MODELS.exists() or not DOCS_MODELS.exists():
        return
    print(f"Seeding {PUBLIC_MODELS.relative_to(ROOT)} from docs/models")
    shutil.copytree(DOCS_MODELS, PUBLIC_MODELS)


def publish() -> None:
    for name in GENERATED:
        if name == "models" and not (DIST / name).exists():
            # Weights already live in docs/models; Vite had nothing to copy.
            continue
        source = DIST / name
        destination = DOCS / name
        if not source.exists():
            continue
        if source.is_dir():
            if destination.exists():
                shutil.rmtree(destination)
            shutil.copytree(source, destination)
        else:
            shutil.copy2(source, destination)

    # transformers.js loads onnxruntime-web's WASM from its pinned jsDelivr CDN
    # (same as Pyodide), so Vite's 26 MB emitted copy is never requested.
    for asset in (DOCS / "assets").glob("ort-wasm-*"):
        asset.unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build and publish the web app.")
    parser.add_argument("--check", action="store_true", help="only check the Python mirrors")
    parser.add_argument("--skip-build", action="store_true", help="publish the existing dist/")
    args = parser.parse_args(argv)

    if args.check:
        return subprocess.run(
            [sys.executable, str(ROOT / "tools" / "sync_docs.py"), "--check"],
            check=False,
        ).returncode

    ensure_public_models()
    if not args.skip_build:
        run(["npm", "run", "build"])
    publish()
    print(f"Published {DIST.relative_to(ROOT)} -> {DOCS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
