"""Deck schema, facts, and callout-caption rules."""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

import build_facts

ROOT = Path(__file__).resolve().parents[1]
DECK_PATH = ROOT / "deck" / "deck.json"
FACTS_PATH = ROOT / "deck" / "facts.json"
SCHEMA_PATH = ROOT / "deck" / "schema.json"
PLAYERS_DIR = ROOT / "design" / "players"

SLIDE_IDS = [
    "s1_tipoff",
    "s2_lebron",
    "s3_kyrie",
    "s4_offense",
    "s5_xfactors",
    "s6_last_two",
]
PLAYER_IDS = {
    "gsw_curry",
    "gsw_thompson",
    "gsw_green",
    "gsw_iguodala",
    "gsw_barnes",
    "cle_james",
    "cle_irving",
    "cle_love",
    "cle_smith",
    "cle_tthompson",
}
ZONE_IDS = {
    "z_paint",
    "z_top_key",
    "z_left_wing",
    "z_right_wing",
    "z_left_corner",
    "z_right_corner",
    "z_left_elbow",
    "z_right_elbow",
    "z_high_post",
}
PLAY_IDS = {
    "p_blitz_lebron_pnr",
    "p_switch_kyrie",
    "p_steph_stagger",
    "p_draymond_short_roll",
}
CARD_IDS = {"k_jr_card"}

PER_SLIDE = {
    "s1_tipoff": {
        "has_diagram": False,
        "markers": set(),
        "zones": set(),
        "plays": set(),
        "cards": set(),
    },
    "s2_lebron": {
        "has_diagram": True,
        "markers": set(PLAYER_IDS),
        "zones": {
            "z_paint",
            "z_top_key",
            "z_left_wing",
            "z_right_wing",
            "z_left_corner",
            "z_right_corner",
        },
        "plays": {"p_blitz_lebron_pnr"},
        "cards": set(),
    },
    "s3_kyrie": {
        "has_diagram": True,
        "markers": set(PLAYER_IDS),
        "zones": {
            "z_top_key",
            "z_left_wing",
            "z_right_wing",
            "z_left_elbow",
            "z_right_elbow",
            "z_paint",
        },
        "plays": {"p_switch_kyrie"},
        "cards": set(),
    },
    "s4_offense": {
        "has_diagram": True,
        "markers": set(PLAYER_IDS),
        "zones": {
            "z_top_key",
            "z_left_wing",
            "z_right_wing",
            "z_left_corner",
            "z_right_corner",
            "z_high_post",
            "z_paint",
        },
        "plays": {"p_steph_stagger", "p_draymond_short_roll"},
        "cards": set(),
    },
    "s5_xfactors": {
        "has_diagram": False,
        "markers": set(),
        "zones": set(),
        "plays": set(),
        "cards": set(),
    },
    "s6_last_two": {
        "has_diagram": True,
        "markers": set(),
        "zones": set(ZONE_IDS),
        "plays": set(),
        "cards": {"k_jr_card"},
    },
}

SPELLED_NUMBER = re.compile(
    r"\b("
    r"two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|"
    r"thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|"
    r"thirty|forty|fifty|sixty|seventy|eighty|ninety|"
    r"hundred|thousand|million|dozen|percent"
    r")\b",
    re.IGNORECASE,
)
DIGIT = re.compile(r"[0-9]")
FORBIDDEN_SYMBOL = re.compile(r"[%#$]")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def callout_text_errors(text: str, *, max_chars: int = 60) -> list[str]:
    """Callout text rules 3-5 from docs/ARCHITECTURE.md#callout-rule."""
    errors: list[str] = []
    if "\n" in text:
        errors.append("more than one line")
    trimmed = text.strip()
    if len(trimmed) < 3 or len(trimmed) > max_chars:
        errors.append(f"length {len(trimmed)} not in 3-{max_chars}")
    if len(trimmed.split()) > 8:
        errors.append("more than 8 words")
    if DIGIT.search(trimmed):
        errors.append("digit")
    if FORBIDDEN_SYMBOL.search(trimmed):
        errors.append("forbidden symbol")
    if SPELLED_NUMBER.search(trimmed):
        errors.append("spelled-out number")
    return errors


def slide_by_id(deck: dict) -> dict:
    return {slide["id"]: slide for slide in deck["slides"]}


def validate_deck(deck: dict, facts: list[dict], players_dir: Path) -> list[str]:
    errors: list[str] = []
    schema = load_json(SCHEMA_PATH)
    validator = Draft202012Validator(schema)
    errors.extend(
        f"schema: {e.message} at {list(e.absolute_path)}" for e in validator.iter_errors(deck)
    )

    fact_ids = {row["id"] for row in facts}
    slides = slide_by_id(deck)
    if list(slides) != SLIDE_IDS:
        errors.append(f"slide ids {list(slides)} != {SLIDE_IDS}")

    for i, slide in enumerate(deck["slides"], start=1):
        if slide.get("number") != i:
            errors.append(f"{slide.get('id')} number {slide.get('number')} != {i}")

    for slide_id, expected in PER_SLIDE.items():
        slide = slides.get(slide_id)
        if slide is None:
            errors.append(f"missing slide {slide_id}")
            continue
        diagram = slide.get("diagram")
        if expected["has_diagram"]:
            if not isinstance(diagram, dict):
                errors.append(f"{slide_id} should have a diagram")
                continue
            markers = set(diagram.get("markers", {}))
            zones = set(diagram.get("zones", []))
            if markers != expected["markers"]:
                errors.append(f"{slide_id} markers {markers} != {expected['markers']}")
            if zones != expected["zones"]:
                errors.append(f"{slide_id} zones {zones} != {expected['zones']}")
            missing_zones = zones - set(deck["zones"])
            if missing_zones:
                errors.append(f"{slide_id} unknown zones {missing_zones}")
        elif diagram is not None:
            errors.append(f"{slide_id} should have diagram null")
        cards = {card["id"] for card in slide.get("cards", [])}
        if cards != expected["cards"]:
            errors.append(f"{slide_id} cards {cards} != {expected['cards']}")

    play_ids = [play["id"] for play in deck["plays"]]
    if set(play_ids) != PLAY_IDS or len(play_ids) != len(set(play_ids)):
        errors.append(f"play ids {play_ids} != unique {sorted(PLAY_IDS)}")

    plays_by_slide: dict[str, set[str]] = {sid: set() for sid in SLIDE_IDS}
    for play in deck["plays"]:
        plays_by_slide.setdefault(play["slide_id"], set()).add(play["id"])
        slide = slides.get(play["slide_id"])
        diagram = (slide or {}).get("diagram") or {}
        on_slide = set(diagram.get("markers", {}))
        for i, step in enumerate(play.get("steps", [])):
            caption = step.get("caption", "")
            if len(caption) > 40:
                errors.append(f"{play['id']} step {i} caption longer than 40")
            for err in callout_text_errors(caption, max_chars=40):
                errors.append(f"{play['id']} step {i} caption: {err}")
            used = set(step.get("moves", {}))
            used.update(arrow.get("from") for arrow in step.get("arrows", []))
            if step.get("ball"):
                used.add(step["ball"])
            missing = used - on_slide
            if missing:
                errors.append(f"{play['id']} step {i} unknown marker on slide: {sorted(missing)}")
        if not 2 <= len(play.get("steps", [])) <= 5:
            errors.append(f"{play['id']} has {len(play.get('steps', []))} steps")

    for slide_id, expected in PER_SLIDE.items():
        actual = plays_by_slide.get(slide_id, set())
        if actual != expected["plays"]:
            errors.append(f"{slide_id} plays {actual} != {expected['plays']}")

    target_ids = list(PLAYER_IDS) + list(ZONE_IDS) + list(CARD_IDS)
    if len(target_ids) != len(set(target_ids)):
        errors.append("TargetId values are not unique")

    for slide in deck["slides"]:
        for fact_id in slide.get("fact_ids", []):
            if fact_id not in fact_ids:
                errors.append(f"{slide['id']} unknown fact_id {fact_id}")
        for cutout in slide.get("cutouts", []):
            if not (players_dir / cutout).is_file():
                errors.append(f"{slide['id']} missing cutout {cutout}")
        for point in slide.get("points", []):
            if DIGIT.search(point):
                errors.append(f"{slide['id']} point has a digit: {point!r}")
        if DIGIT.search(slide.get("notes", "")):
            errors.append(f"{slide['id']} notes have a digit")
        for card in slide.get("cards", []):
            for err in callout_text_errors(card.get("caption", ""), max_chars=40):
                errors.append(f"{slide['id']} card caption: {err}")
            if DIGIT.search(card.get("caption", "")):
                errors.append(f"{slide['id']} card caption has a digit")

    return errors


@pytest.fixture
def deck():
    return load_json(DECK_PATH)


@pytest.fixture
def facts():
    return load_json(FACTS_PATH)


def test_schema_and_rules_pass(deck, facts):
    errors = validate_deck(deck, facts, PLAYERS_DIR)
    assert errors == []


def test_points_notes_captions_have_no_digits(deck):
    found: list[str] = []
    for slide in deck["slides"]:
        for point in slide["points"]:
            if DIGIT.search(point):
                found.append(f"{slide['id']} point {point!r}")
        if DIGIT.search(slide["notes"]):
            found.append(f"{slide['id']} notes")
        for card in slide["cards"]:
            if DIGIT.search(card["caption"]):
                found.append(f"{slide['id']} card caption")
    for play in deck["plays"]:
        for i, step in enumerate(play["steps"]):
            if DIGIT.search(step["caption"]):
                found.append(f"{play['id']} step {i} caption")
    assert found == []


def test_bad_caption_fails(deck, facts):
    bad = copy.deepcopy(deck)
    bad["plays"][0]["steps"][0]["caption"] = "Two defenders jump the ball"
    errors = validate_deck(bad, facts, PLAYERS_DIR)
    assert any("spelled-out number" in e or "digit" in e for e in errors)


def test_unknown_marker_fails(deck, facts):
    bad = copy.deepcopy(deck)
    play = next(p for p in bad["plays"] if p["id"] == "p_blitz_lebron_pnr")
    play["slide_id"] = "s6_last_two"
    errors = validate_deck(bad, facts, PLAYERS_DIR)
    assert any("unknown marker" in e for e in errors)


def test_too_many_steps_fails(deck, facts):
    bad = copy.deepcopy(deck)
    play = next(p for p in bad["plays"] if p["id"] == "p_blitz_lebron_pnr")
    extra = {
        "caption": "Extra step past the cap",
        "duration_ms": 800,
        "moves": {},
        "arrows": [],
    }
    play["steps"].extend([extra, extra])
    assert len(play["steps"]) > 5
    errors = validate_deck(bad, facts, PLAYERS_DIR)
    assert errors, "too many steps should fail"


def test_facts_json_matches_verified_markdown():
    md_rows = build_facts.parse_facts_md((ROOT / "FACTS.md").read_text(encoding="utf-8"))
    expected = build_facts.verified_facts(md_rows)
    assert load_json(FACTS_PATH) == expected
    assert all(row["id"].startswith("F") for row in expected)


def test_build_facts_duplicate_id_fails():
    text = (
        "| id | Claim | Slide | Source URL | Verified |\n"
        "|---|---|---|---|---|\n"
        "| F01 | a | s1_tipoff | https://example.com/a | y |\n"
        "| F01 | b | s1_tipoff | https://example.com/b | y |\n"
    )
    with pytest.raises(SystemExit, match="duplicate"):
        build_facts.parse_facts_md(text)


def test_build_facts_missing_url_fails():
    rows = [
        {
            "id": "F01",
            "claim": "x",
            "slide": "s1_tipoff",
            "source_url": "same as F00",
            "verified": "y (checked)",
        }
    ]
    with pytest.raises(SystemExit, match="missing URL"):
        build_facts.verified_facts(rows)
