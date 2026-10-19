from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

_DATA_DIR = Path(__file__).resolve().parents[1] / "data"

SlideId = Literal[
    "s1_tipoff",
    "s2_lebron",
    "s3_kyrie",
    "s4_offense",
    "s5_xfactors",
    "s6_last_two",
]

SLIDE_IDS: tuple[str, ...] = (
    "s1_tipoff",
    "s2_lebron",
    "s3_kyrie",
    "s4_offense",
    "s5_xfactors",
    "s6_last_two",
)

HIGHLIGHT_SLIDE_IDS: frozenset[str] = frozenset(
    ("s2_lebron", "s3_kyrie", "s4_offense", "s6_last_two")
)


@lru_cache(maxsize=1)
def load_deck() -> dict[str, Any]:
    return json.loads((_DATA_DIR / "deck.json").read_text())


@lru_cache(maxsize=1)
def load_facts() -> list[dict[str, Any]]:
    return json.loads((_DATA_DIR / "facts.json").read_text())


def slides_by_id(deck: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    data = deck if deck is not None else load_deck()
    return {slide["id"]: slide for slide in data["slides"]}


def facts_by_id(facts: list[dict[str, Any]] | None = None) -> dict[str, dict[str, Any]]:
    rows = facts if facts is not None else load_facts()
    return {row["id"]: row for row in rows}


def get_slide(
    slide_id: str, deck: dict[str, Any] | None = None
) -> dict[str, Any] | None:
    return slides_by_id(deck).get(slide_id)


def targets_on_slide(slide: dict[str, Any]) -> list[str]:
    diagram = slide.get("diagram") or {}
    markers = list((diagram.get("markers") or {}).keys())
    zones = list(diagram.get("zones") or [])
    cards = [card["id"] for card in slide.get("cards") or [] if "id" in card]
    return markers + zones + cards


def plays_on_slide(
    slide_id: str, deck: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    data = deck if deck is not None else load_deck()
    return [
        play for play in data.get("plays") or [] if play.get("slide_id") == slide_id
    ]


def target_label(target: str, deck: dict[str, Any] | None = None) -> str:
    data = deck if deck is not None else load_deck()
    player = (data.get("players") or {}).get(target)
    if player:
        return str(player.get("label") or target)
    zone = (data.get("zones") or {}).get(target)
    if zone:
        return str(zone.get("label") or target)
    for slide in data["slides"]:
        for card in slide.get("cards") or []:
            if card.get("id") == target:
                return str(card.get("caption") or target)
    return target


def empty_overlay(slide_id: str, seq: int) -> dict[str, Any]:
    return {
        "v": 1,
        "slide_id": slide_id,
        "seq": seq,
        "highlights": [],
        "play": None,
        "callouts": [],
    }


def slide_narration(slide_id: str, deck: dict[str, Any] | None = None) -> str:
    data = deck if deck is not None else load_deck()
    slide = get_slide(slide_id, data)
    if slide is None:
        return f"Unknown slide {slide_id}."

    claims: list[str] = []
    facts = facts_by_id()
    for fact_id in slide.get("fact_ids") or []:
        row = facts.get(fact_id)
        if row:
            claims.append(f"{fact_id}: {row['claim']}")

    targets = targets_on_slide(slide)
    play_ids = [play["id"] for play in plays_on_slide(slide_id, data)]
    return (
        f"Title: {slide['title']}\n"
        f"Notes: {slide['notes']}\n"
        f"Facts: {'; '.join(claims) if claims else '(none)'}\n"
        f"Board menu: targets={','.join(targets) if targets else '(none)'} "
        f"plays={','.join(play_ids) if play_ids else '(none)'}"
    )


def assert_slide_ids_match_deck() -> None:
    ids = tuple(slide["id"] for slide in load_deck()["slides"])
    if ids != SLIDE_IDS:
        raise RuntimeError(f"deck slide ids {ids} != contract {SLIDE_IDS}")
