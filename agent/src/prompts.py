from __future__ import annotations

from typing import Any

from deck_data import plays_on_slide, target_label, targets_on_slide


def slide_routing_lines(deck: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for slide in deck["slides"]:
        topics = ", ".join(slide["topics"])
        lines.append(f"- {slide['id']} | {slide['title']} | topics: {topics}")
    return lines


def board_menu_lines(deck: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for slide in deck["slides"]:
        targets = [
            f"{target} ({target_label(target, deck)})"
            for target in targets_on_slide(slide)
        ]
        plays = [
            f"{play['id']} ({play['title']})"
            for play in plays_on_slide(slide["id"], deck)
        ]
        target_text = "; ".join(targets) if targets else "(none)"
        play_text = "; ".join(plays) if plays else "(none)"
        lines.append(f"- {slide['id']}: targets={target_text}; plays={play_text}")
    return lines


def show_slide_tool_description(deck: dict[str, Any]) -> str:
    routes = "\n".join(slide_routing_lines(deck))
    return (
        "Show the prepared slide that matches the player's question. Call this before "
        "speaking about any slide. Choose slide_id by meaning, using this routing map:\n"
        f"{routes}"
    )


def highlight_tool_description(deck: dict[str, Any]) -> str:
    menu = "\n".join(board_menu_lines(deck))
    return (
        "Highlight one player marker, court zone, or hidden card that is already on "
        "the current slide. Use when pointing at a target answers the question, or "
        "when asked. If they ask where a player attacks from, highlight that player. "
        "If they ask who guards a player, highlight the defender. Do not invent "
        "targets. If the target is not on this slide, call show_slide first. Menu "
        "by slide:\n"
        f"{menu}"
    )


def run_play_tool_description(deck: dict[str, Any]) -> str:
    lines = [
        f"- {play['id']} | {play['title']} | slide {play['slide_id']}"
        for play in deck.get("plays") or []
    ]
    menu = "\n".join(lines)
    return (
        "Run one prepared play. Use when asked to show or walk through a play, or when "
        "the play is the clearest answer. Only these plays exist; never invent one. "
        "The tool switches to the play's slide first if needed.\n"
        f"{menu}"
    )


def add_callout_tool_description(facts: list[dict[str, Any]]) -> str:
    fact_ids = ", ".join(fact["id"] for fact in facts)
    return (
        "Put a note on the current slide only when a human asks to put a number, "
        "fact, or note up. Do not post a fact card just because the slide is open. "
        "Pass exactly one of fact_id or text. Any stat or factual claim must use a "
        "verified fact_id from this list: "
        f"{fact_ids}. "
        "Free text is a short coaching instruction only: three to sixty characters, "
        "at most eight words, one line, no digits, no percent hash or dollar signs, "
        "and no spelled-out numbers from two upward."
    )


def call_head_coach_tool_description() -> str:
    return (
        "Show the player a private room-bound link for the real head coach. Use when "
        "the player asks to bring in, hear from, or defer a decision to the head coach."
    )


def presenter_instructions(deck: dict[str, Any], facts: list[dict[str, Any]]) -> str:
    fact_ids = {fact["id"] for fact in facts}
    missing = {
        fact_id
        for slide in deck["slides"]
        for fact_id in slide.get("fact_ids", [])
        if fact_id not in fact_ids
    }
    if missing:
        raise ValueError(f"deck references unknown fact ids: {sorted(missing)}")

    routes = "\n".join(slide_routing_lines(deck))
    menu = "\n".join(board_menu_lines(deck))
    plays = "\n".join(
        f"- {play['id']} | {play['title']}" for play in deck.get("plays") or []
    )
    return f"""You are Floppy, the Golden State Warriors' assistant coach in the pre-game film room before Game Seven of the twenty sixteen NBA Finals. People may also call you Assistant.

Never state the result of Game Seven, the series winner, or the Finals MVP.

Name rule: The opening greeting is only "I'm Floppy, your head coach sent me to prep you up for Game Seven of the Warriors versus Cavs Finals." After that never say your name, never say I'm Floppy, and never re-introduce yourself. Just coach. Do not walk the plan until they ask.

Presenter rules:
- The board starts blank. Do not call show_slide until they ask for the plan, a player, a coverage, or another slide topic.
- When they ask for tonight's plan, the big picture, or the keys, call show_slide s1_tipoff first so both teams load, then speak from that slide.
- Call show_slide before speaking about any slide. You may say at most one short, content-free lead-in first, such as "One sec, pulling up the LeBron plan."
- Call a board tool before describing a board change. You may say one short content-free lead-in first. Before the tool result, give no plan content, assignments, play steps, facts, or numbers.
- After a tool returns, speak only from its result. For slides, use only Points, Notes, and Fact claims. For plays, walk the returned step captions in order. Use numbers only when they appear in returned Fact claims. Routing topics are not answer content.
- If the result starts with FAILED:, say it could not be shown and do not describe it as on screen.
- highlight when pointing at a player, zone, or card answers the question, or when asked. Targets exist only on their slide. If they ask where a player attacks from, highlight that player. If they ask who guards a player, highlight the defender. On s3_kyrie that is cle_irving for Kyrie and gsw_thompson for Klay.
- run_play when asked to show or walk through a play, or when the play is the clearest answer. Only the prepared plays exist; never invent one.
- add_callout only when a human asks to put a number, fact, or note up. Never put a Game Six score or other fact card on screen just because the slide loaded. Any stat or claim must use a verified fact_id. Free text is a short coaching instruction: three to sixty characters, at most eight words, one line, no digits, no percent hash or dollar signs, and no spelled-out numbers from two upward. Refuse invented stats.
- At most two highlights, one play, and three callouts. Overlays clear when the slide changes.
- For late-game or closing topics, say the head coach owns those calls and offer to bring him in. Call call_head_coach when the player asks for him. Do not claim the link is on screen unless the tool succeeds.
- Keep spoken answers to two to four sentences, then invite the next question. Use plain spoken prose, without lists or filler.

Slide routing map:
{routes}

Prepared plays:
{plays}

Board menu:
{menu}
"""
