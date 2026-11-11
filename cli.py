#!/usr/bin/env python3
"""Command-line interface.

Examples
--------
python cli.py "Add a red button" --backend auto
python cli.py "Add a red button" --backend rules --no-llm
python cli.py "Add a button" --backend auto --interactive
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from src.pipeline import BackendNotAvailable, analyze_full


def _print_risk(payload: dict) -> None:
    initial = payload["risk"]["initial"]
    final = payload["risk"]["final"]
    print(f"\nRisk: initial {initial['score']}/100 ({initial['level']}) "
          f"-> final {final['score']}/100 ({final['level']})")
    for key, value in final["components"].items():
        print(f"  {key:12s}: {value * 100:5.1f}%")
    if payload.get("explanation"):
        print(f"\nWhy: {payload['explanation']}")


def _print_result(payload: dict) -> None:
    result = payload["result"]
    summary = result["summary"]
    print(f"\nEngine: {payload.get('engine')} | confidence: {payload.get('confidence', 0):.2f}")
    print(f"Summary: {summary['message']}")

    for element in result["elements"]:
        icon = "OK " if element["status"] == "complete" else "!! "
        print(f"\n{icon}{element['type'].capitalize()} #{element['id']} "
              f"(\"{element['text']}\") - {element['status']}")
        if element["attributes"]:
            attrs = ", ".join(f"{k}={v}" for k, v in element["attributes"].items())
            print(f"     attributes: {attrs}")
        for message in element["messages"]:
            print(f"     - {message}")
        print(f"     suggestion: {element['suggestion']}")

    questions = payload["clarification"]["questions"]
    if questions:
        print("\nClarification needed:")
        for question in questions:
            print(f"  [{question['id']}] {question['prompt']}")
            if question.get("examples"):
                print(f"        examples: {', '.join(question['examples'])}")
            if question.get("options"):
                print(f"        options: {', '.join(question['options'])}")

    if payload.get("final_prompt"):
        print("\nBest prompt:")
        print(f"  {payload['final_prompt']}")
    if payload.get("recommendations"):
        print("\nRecommendations:")
        for recommendation in payload["recommendations"]:
            print(f"  - {recommendation}")
    if payload["clarification"]["unresolved"]:
        print("\nUnresolved (placeholders used):")
        for question in payload["clarification"]["unresolved"]:
            print(f"  - {question['prompt']}")


def _interactive(payload: dict, text: str, method: str, allow_llm: bool,
                 answers: dict[str, str] | None) -> dict:
    answers = dict(answers or {})
    rounds = 1
    while payload["needs_clarification"] and rounds <= 3:
        _print_result(payload)
        print("\nAnswer the questions (blank = unknown/placeholder).")
        for question in payload["clarification"]["questions"]:
            answer = input(f"{question['prompt']} ").strip()
            answers[question["id"]] = answer or "unknown"
        rounds += 1
        payload = analyze_full(
            text, method=method, allow_llm=allow_llm,
            answers=answers, finalize=rounds > 3,
        )
    return payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Lint a UI prompt for missing details.")
    parser.add_argument("text", help="the UI prompt to analyse")
    parser.add_argument("--backend", choices=["auto", "rules", "bert"], default="auto")
    parser.add_argument("--no-llm", action="store_true", help="disable Ollama/LLM features")
    parser.add_argument("--interactive", action="store_true", help="ask clarification questions")
    parser.add_argument("--answers", help="JSON file with clarification answers")
    parser.add_argument("--finalize", action="store_true",
                        help="produce a final prompt with placeholders even if questions remain")
    parser.add_argument("--json", action="store_true", help="print raw analysis JSON")
    args = parser.parse_args(argv)

    answers: dict[str, str] = {}
    if args.answers:
        with open(Path(args.answers), encoding="utf-8-sig") as fh:
            answers = json.load(fh)

    allow_llm = not args.no_llm
    try:
        payload = analyze_full(
            args.text,
            method=args.backend,
            allow_llm=allow_llm,
            answers=answers or None,
            finalize=args.finalize,
        )
        if args.interactive and payload["needs_clarification"]:
            payload = _interactive(payload, args.text, args.backend, allow_llm, answers)
    except BackendNotAvailable as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # defensive CLI handling
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        _print_risk(payload)
        _print_result(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
