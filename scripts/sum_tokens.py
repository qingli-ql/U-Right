#!/usr/bin/env python3
"""Read temp.text and calculate total token consumption."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def extract_total_tokens(text: str) -> list[int]:
    # Match patterns like: totalTokens: 13878,
    pattern = re.compile(r"totalTokens\s*:\s*(\d+)")
    return [int(m.group(1)) for m in pattern.finditer(text)]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Calculate the sum of all totalTokens values in a log file."
    )
    parser.add_argument(
        "file",
        nargs="?",
        default="temp.text",
        help="Path to log file (default: temp.text)",
    )
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        raise SystemExit(f"File not found: {path}")

    content = path.read_text(encoding="utf-8", errors="ignore")
    values = extract_total_tokens(content)

    if not values:
        print("No totalTokens entries found.")
        return

    total = sum(values)
    print(f"Entries found: {len(values)}")
    print(f"Total token consumption: {total}")


if __name__ == "__main__":
    main()
