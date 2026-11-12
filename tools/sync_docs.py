#!/usr/bin/env python3
"""Mirror the Python sources used by the in-browser engines.

`docs/` is served by GitHub Pages, `ui/web-app/public/py` is copied into the
Vite build, and `docs/rules/py` powers the standalone Rules demo.  All three
copies must match `engine/src/`.
"""
from __future__ import annotations

import argparse
import filecmp
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "engine" / "src"
TARGETS = [
    ROOT / "docs" / "rules" / "py",
    ROOT / "docs" / "py",
    ROOT / "ui" / "web-app" / "public" / "py",
]

FILES = [
    "__init__.py", "schema.py", "tokenization.py", "bio.py", "messages.py",
    "checker.py", "vague.py", "linking.py", "clarification.py", "risk.py",
    "router.py", "rules_tagger.py", "pipeline.py", "llm_backend.py",
]


def targets() -> list[tuple[Path, Path]]:
    pairs = [
        (SRC / name, target / "src" / name)
        for name in FILES
        for target in TARGETS
    ]
    pairs.extend(
        (ROOT / "data" / "schema.json", target / "data" / "schema.json")
        for target in TARGETS
    )
    return pairs


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync docs/py with src/.")
    parser.add_argument("--check", action="store_true",
                        help="only verify the copies are up to date")
    args = parser.parse_args(argv)

    stale = []
    for source, destination in targets():
        if not destination.exists() or not filecmp.cmp(source, destination, shallow=False):
            stale.append(destination)
            if not args.check:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)

    if args.check:
        if stale:
            print("Python mirrors are stale. Run: python tools/sync_docs.py")
            for path in stale:
                print(f"  {path.relative_to(ROOT)}")
            return 1
        print("Python mirrors are up to date")
        return 0

    print(f"Synced {len(list(targets()))} files into {len(TARGETS)} locations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
