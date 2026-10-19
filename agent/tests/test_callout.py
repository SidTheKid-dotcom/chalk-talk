from __future__ import annotations

import pytest

from callout import (
    RULE_EXACTLY_ONE,
    RULE_TEXT_DIGIT,
    RULE_TEXT_LENGTH,
    RULE_TEXT_LINE,
    RULE_TEXT_SPELLED,
    RULE_TEXT_SYMBOL,
    RULE_TEXT_WORDS,
    RULE_UNKNOWN_FACT,
    callout_rule_reason,
)
from deck_data import facts_by_id


@pytest.mark.parametrize(
    ("fact_id", "text", "rule"),
    [
        (None, None, RULE_EXACTLY_ONE),
        ("F07", "Iguodala on LeBron", RULE_EXACTLY_ONE),
        ("", "Iguodala on LeBron", None),
        ("F99", None, RULE_UNKNOWN_FACT),
        (None, "no", RULE_TEXT_LENGTH),
        (None, "x" * 61, RULE_TEXT_LENGTH),
        (None, "stay home on the shooters and help early now", RULE_TEXT_WORDS),
        (None, "Iguodala\non LeBron", RULE_TEXT_LINE),
        (None, "He scores 40 a night", RULE_TEXT_DIGIT),
        (None, "Stay home %", RULE_TEXT_SYMBOL),
        (None, "LeBron scores forty a night", RULE_TEXT_SPELLED),
        (None, "Give me two extra bodies", RULE_TEXT_SPELLED),
        (None, "Iguodala on LeBron", None),
        (None, "stay one-on-one", None),
        ("F07", None, None),
    ],
)
def test_callout_rule_matches_architecture(
    fact_id: str | None, text: str | None, rule: str | None
) -> None:
    assert callout_rule_reason(fact_id, text, facts=facts_by_id()) == rule


def test_verified_fact_ids_are_accepted() -> None:
    assert callout_rule_reason("F07", None) is None
    assert callout_rule_reason("F16", None) is None
