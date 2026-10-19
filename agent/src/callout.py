from __future__ import annotations

import re
from typing import Any

from deck_data import facts_by_id

CALLOUT_MIN_CHARS = 3
CALLOUT_MAX_CHARS = 60
CALLOUT_MAX_WORDS = 8
CALLOUT_REJECTED = (
    "FAILED: callout rejected ({rule}). Use a fact_id for any stat, or reword "
    "as a short instruction with no numbers."
)

RULE_EXACTLY_ONE = "exactly one of fact_id or text"
RULE_UNKNOWN_FACT = "unknown or unverified fact_id"
RULE_TEXT_LENGTH = "text must be 3-60 characters"
RULE_TEXT_WORDS = "text must be at most 8 words"
RULE_TEXT_LINE = "text must be one line"
RULE_TEXT_DIGIT = "text has a digit"
RULE_TEXT_SYMBOL = "text has a forbidden symbol"
RULE_TEXT_SPELLED = "text has a spelled-out number"

_SPELLED_NUMBERS = (
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
    "hundred",
    "thousand",
    "million",
    "dozen",
    "percent",
)
_SPELLED_RE = re.compile(
    r"\b(" + "|".join(_SPELLED_NUMBERS) + r")\b",
    re.IGNORECASE,
)


def callout_rule_reason(
    fact_id: str | None,
    text: str | None,
    *,
    facts: dict[str, dict[str, Any]] | None = None,
) -> str | None:
    has_fact = isinstance(fact_id, str) and fact_id.strip() != ""
    has_text = isinstance(text, str) and text != ""
    if has_fact == has_text:
        return RULE_EXACTLY_ONE
    if has_fact:
        rows = facts if facts is not None else facts_by_id()
        if fact_id not in rows:
            return RULE_UNKNOWN_FACT
        return None

    assert isinstance(text, str)
    if "\n" in text or "\r" in text:
        return RULE_TEXT_LINE
    trimmed = text.strip()
    if len(trimmed) < CALLOUT_MIN_CHARS or len(trimmed) > CALLOUT_MAX_CHARS:
        return RULE_TEXT_LENGTH
    if len(trimmed.split()) > CALLOUT_MAX_WORDS:
        return RULE_TEXT_WORDS
    if re.search(r"\d", trimmed):
        return RULE_TEXT_DIGIT
    if re.search(r"[%#$]", trimmed):
        return RULE_TEXT_SYMBOL
    if _SPELLED_RE.search(trimmed):
        return RULE_TEXT_SPELLED
    return None


def rejected_callout(rule: str) -> str:
    return CALLOUT_REJECTED.format(rule=rule)
