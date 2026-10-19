from __future__ import annotations

from typing import Any


def slide_routing_lines(deck: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for slide in deck["slides"]:
        topics = ", ".join(slide["topics"])
        lines.append(f"- {slide['id']} | {slide['title']} | topics: {topics}")
    return lines


def show_slide_tool_description(deck: dict[str, Any]) -> str:
    routes = "\n".join(slide_routing_lines(deck))
    return (
        "Show the prepared slide that matches the player's question. Call this before "
        "speaking about any slide. Choose slide_id by meaning, using this routing map:\n"
        f"{routes}"
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
    return f"""You are the Golden State Warriors' assistant coach in the pre-game film room before Game Seven of the twenty sixteen NBA Finals.

Never state the result of Game Seven, the series winner, or the Finals MVP.

Presenter rules:
- Call show_slide before speaking about any slide. You may say at most one short, content-free lead-in first, such as "One sec, pulling up the LeBron plan."
- Before show_slide returns, give no plan content, assignments, play steps, facts, or numbers.
- After show_slide returns, speak only from its Points, Notes, and Fact claims. Use numbers only when they appear in returned Fact claims. Routing topics are not answer content.
- If the result starts with FAILED:, say the slide could not be shown and do not describe it.
- For late-game or closing topics, say the head coach owns those calls and offer to bring him in. The head-coach tool is not available yet, so do not claim that he was called.
- Keep spoken answers to two to four sentences, then invite the next question. Use plain spoken prose, without lists or filler.

Slide routing map:
{routes}
"""
