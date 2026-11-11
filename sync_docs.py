#!/usr/bin/env python3
"""Mirror the Python sources used by the GitHub Pages browser demo.

`docs/` is served by GitHub Pages.  Pyodide loads the Rules backend from
`docs/py/src`, so those copies must match `src/`.
"""
from __future__ import annotations

import argparse
import filecmp
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DOCS = ROOT / "docs" / "rules"

FILES = [
    "__init__.py", "schema.py", "tokenization.py", "bio.py", "messages.py",
    "checker.py", "vague.py", "linking.py", "clarification.py", "risk.py",
    "router.py", "rules_tagger.py", "pipeline.py", "llm_backend.py",
]


def targets() -> list[tuple[Path, Path]]:
    pairs = [(SRC / name, DOCS / "py" / "src" / name) for name in FILES]
    pairs.append((ROOT / "data" / "schema.json", DOCS / "py" / "data" / "schema.json"))
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
            print("docs/py is stale. Run: python sync_docs.py")
            for path in stale:
                print(f"  {path.relative_to(ROOT)}")
            return 1
        print("docs/py is up to date")
        return 0

    print(f"Synced {len(list(targets()))} files into docs/rules/py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
