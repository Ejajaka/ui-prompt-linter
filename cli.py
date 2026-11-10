#!/usr/bin/env python3
"""Command-line interface.

Examples
--------
python cli.py "Add a red button" --backend rules
python cli.py "Add a red button" --backend bert --json
"""
from __future__ import annotations

import argparse
import json
import sys

from src.pipeline import BackendNotAvailable, analyze


def _print_pretty(analysis: dict) -> None:
    result = analysis["result"]
    summary = result["summary"]
    print(f"\nSummary: {summary['message']}\n")

    if not result["elements"]:
        return

    for element in result["elements"]:
        icon = "OK " if element["status"] == "complete" else "!! "
        print(f"{icon}{element['type'].capitalize()} #{element['id']} "
              f"(\"{element['text']}\") - {element['status']}")
        if element["attributes"]:
            attrs = ", ".join(f"{k}={v}" for k, v in element["attributes"].items())
            print(f"     attributes: {attrs}")
        else:
            print("     attributes: none")
        for message in element["messages"]:
            print(f"     - {message}")
        print(f"     suggestion: {element['suggestion']}")
        print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Lint a UI prompt for missing details.")
    parser.add_argument("text", help="the UI prompt to analyse")
    parser.add_argument("--backend", choices=["rules", "bert"], default="rules")
    parser.add_argument("--json", action="store_true", help="print raw analysis JSON")
    args = parser.parse_args(argv)

    try:
        analysis = analyze(args.text, backend=args.backend)
    except BackendNotAvailable as exc:
        print(f"error: {exc}", file=sys.stderr)
        print("BERT model not trained yet, run: python train_bert.py", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(analysis, ensure_ascii=False, indent=2))
    else:
        _print_pretty(analysis)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
