#!/usr/bin/env python3
"""Parse FACTS.md and write deck/facts.json (verified rows only)."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
FACTS_MD = ROOT / "FACTS.md"
OUT = ROOT / "deck" / "facts.json"


def parse_facts_md(text: str) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    in_table = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("| id "):
            in_table = True
            continue
        if not in_table:
            continue
        if stripped.startswith("|---") or stripped.startswith("| ---"):
            continue
        if not stripped.startswith("|"):
            break
        cols = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cols) < 5:
            raise SystemExit(f"FACTS.md row does not have 5 columns: {stripped}")
        fact_id, claim, slide, url, verified = cols[:5]
        if fact_id in seen:
            raise SystemExit(f"duplicate fact id: {fact_id}")
        seen.add(fact_id)
        rows.append(
            {
                "id": fact_id,
                "claim": claim,
                "slide": slide,
                "source_url": url,
                "verified": verified,
            }
        )
    if not rows:
        raise SystemExit("FACTS.md has no fact rows")
    return rows


def verified_facts(rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for row in rows:
        if not row["verified"].startswith("y"):
            continue
        url = row["source_url"]
        if not url.startswith("http://") and not url.startswith("https://"):
            raise SystemExit(f"missing URL for verified fact {row['id']}: {url!r}")
        domain = urlparse(url).hostname or ""
        if not domain:
            raise SystemExit(f"missing URL host for verified fact {row['id']}: {url!r}")
        out.append(
            {
                "id": row["id"],
                "claim": row["claim"],
                "slide": row["slide"],
                "source_url": url,
                "source_domain": domain,
            }
        )
    return out


def main() -> int:
    rows = parse_facts_md(FACTS_MD.read_text(encoding="utf-8"))
    facts = verified_facts(rows)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(facts, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(facts)} verified facts to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
