#!/usr/bin/env python3
"""Mirror the browser engine sources used by the extension and Android app.

`ui/extension/engine.js` and `ui/extension/ai.js` are the canonical copies; the
Android WebView loads identical files from `app/src/main/assets` so results and
routing stay in lockstep across clients.

Usage
-----
python tools/sync_engines.py           # copy extension -> android assets
python tools/sync_engines.py --check   # verify they match (used by CI)
"""
from __future__ import annotations

import argparse
import filecmp
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "ui" / "extension"
TARGET = ROOT / "ui" / "android" / "app" / "src" / "main" / "assets"

FILES = [
    "engine.js",
    "ai.js",
    "transformers.web.min.js",
    "ort.webgpu.min.js",
]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync extension engines into Android assets.")
    parser.add_argument("--check", action="store_true", help="only verify the copies match")
    args = parser.parse_args(argv)

    stale = []
    for name in FILES:
        source = SOURCE / name
        destination = TARGET / name
        if not destination.exists() or not filecmp.cmp(source, destination, shallow=False):
            stale.append(destination)
            if not args.check:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)

    if args.check:
        if stale:
            print("Android engine assets are stale. Run: python tools/sync_engines.py")
            for path in stale:
                print(f"  {path.relative_to(ROOT)}")
            return 1
        print("Android engine assets are up to date")
        return 0

    print(f"Synced {len(FILES)} engine files into {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
