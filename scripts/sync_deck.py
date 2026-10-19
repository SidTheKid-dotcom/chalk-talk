#!/usr/bin/env python3
"""Copy deck/deck.json and deck/facts.json into agent/data and web/lib/deck."""

from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [ROOT / "deck" / "deck.json", ROOT / "deck" / "facts.json"]
DEST_DIRS = [ROOT / "agent" / "data", ROOT / "web" / "lib" / "deck"]


def dest_paths() -> list[tuple[Path, Path]]:
    pairs: list[tuple[Path, Path]] = []
    for src in SOURCES:
        for dest_dir in DEST_DIRS:
            pairs.append((src, dest_dir / src.name))
    return pairs


def check() -> int:
    failed = False
    for src, dest in dest_paths():
        if not src.exists():
            print(f"missing source: {src.relative_to(ROOT)}", file=sys.stderr)
            failed = True
            continue
        if not dest.exists():
            print(f"missing copy: {dest.relative_to(ROOT)}", file=sys.stderr)
            failed = True
            continue
        if not filecmp.cmp(src, dest, shallow=False):
            print(f"copy differs: {dest.relative_to(ROOT)}", file=sys.stderr)
            failed = True
    if failed:
        return 1
    print("sync check passed")
    return 0


def copy() -> int:
    for src in SOURCES:
        if not src.exists():
            print(f"missing source: {src.relative_to(ROOT)}", file=sys.stderr)
            return 1
    for src, dest in dest_paths():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        print(f"copied {src.relative_to(ROOT)} -> {dest.relative_to(ROOT)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if a copy differs")
    args = parser.parse_args()
    return check() if args.check else copy()


if __name__ == "__main__":
    sys.exit(main())
