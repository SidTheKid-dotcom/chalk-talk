from __future__ import annotations

import re

import pytest
from livekit.agents.llm.utils import build_legacy_openai_schema

from agent import Assistant
from deck_data import (
    all_fact_ids,
    all_play_ids,
    all_target_ids,
    load_deck,
    load_facts,
    slide_narration,
)
from prompts import (
    add_callout_tool_description,
    highlight_tool_description,
    presenter_instructions,
    run_play_tool_description,
    show_slide_tool_description,
)


def test_presenter_prompt_routes_every_slide_from_deck() -> None:
    deck = load_deck()
    prompt = presenter_instructions(deck, load_facts())
    for slide in deck["slides"]:
        assert slide["id"] in prompt
        assert slide["title"] in prompt
        for topic in slide["topics"]:
            assert topic in prompt


def test_presenter_prompt_has_no_unapproved_numeric_copy() -> None:
    deck = load_deck()
    facts = load_facts()
    prompt = presenter_instructions(deck, facts)
    allowed = prompt
    for slide in deck["slides"]:
        allowed = allowed.replace(slide["id"], "")
        allowed = allowed.replace(slide["title"], "")
    for play in deck["plays"]:
        allowed = allowed.replace(play["id"], "")
        allowed = allowed.replace(play["title"], "")
    for fact in facts:
        allowed = allowed.replace(fact["id"], "")
    assert re.search(r"\d", allowed) is None


def test_presenter_prompt_rejects_missing_fact_rows() -> None:
    deck = load_deck()
    facts = [fact for fact in load_facts() if fact["id"] != "F08"]
    with pytest.raises(ValueError, match="unknown fact ids"):
        presenter_instructions(deck, facts)


def test_show_slide_description_lists_titles_and_topics() -> None:
    deck = load_deck()
    description = show_slide_tool_description(deck)
    for slide in deck["slides"]:
        assert slide["id"] in description
        assert slide["title"] in description
        assert all(topic in description for topic in slide["topics"])


def test_show_slide_argument_schema_contains_generated_routing_map() -> None:
    deck = load_deck()
    schema = build_legacy_openai_schema(Assistant().show_slide)
    function = schema["function"]
    argument_description = function["parameters"]["properties"]["slide_id"][
        "description"
    ]
    assert function["description"] == show_slide_tool_description(deck)
    assert "push or slow down" in argument_description
    assert "s5_xfactors" in argument_description


def test_slide_result_contains_grounding_and_board_menu() -> None:
    result = slide_narration("s2_lebron")
    assert "Points: Iguodala is the primary." in result
    assert "Notes: Primary is Iguodala on James." in result
    assert "Fact claims: F06:" in result
    assert "F07:" in result
    assert "cle_james (James)" in result
    assert "p_blitz_lebron_pnr (Blitz the LeBron pick-and-roll)" in result


def test_board_tool_enums_are_generated_from_deck() -> None:
    deck = load_deck()
    facts = load_facts()
    highlight = build_legacy_openai_schema(Assistant().highlight)
    play = build_legacy_openai_schema(Assistant().run_play)
    callout = build_legacy_openai_schema(Assistant().add_callout)
    assert set(
        highlight["function"]["parameters"]["properties"]["target"]["enum"]
    ) == set(all_target_ids(deck))
    assert set(play["function"]["parameters"]["properties"]["play_id"]["enum"]) == set(
        all_play_ids(deck)
    )
    fact_schema = callout["function"]["parameters"]["properties"]["fact_id"]
    fact_enum = next(item["enum"] for item in fact_schema["anyOf"] if "enum" in item)
    assert set(fact_enum) == set(all_fact_ids(facts))
    assert highlight["function"]["description"] == highlight_tool_description(deck)
    assert play["function"]["description"] == run_play_tool_description(deck)
    assert callout["function"]["description"] == add_callout_tool_description(facts)
    assert "p_blitz_lebron_pnr" in play["function"]["description"]
    assert "F07" in callout["function"]["description"]
