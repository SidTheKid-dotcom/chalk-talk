from __future__ import annotations

import re

import pytest
from livekit.agents.llm.utils import build_legacy_openai_schema

from agent import Assistant
from deck_data import load_deck, load_facts, slide_narration
from prompts import presenter_instructions, show_slide_tool_description


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
    prompt = presenter_instructions(deck, load_facts())
    without_contract_ids = prompt
    for slide in deck["slides"]:
        without_contract_ids = without_contract_ids.replace(slide["id"], "")
    assert re.search(r"\d", without_contract_ids) is None


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
