from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field

import pytest
from livekit.agents import AgentSession, utils

from agent import Assistant
from deck_data import slide_narration
from model import RealtimeConfig, build_realtime_model

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_AGENT_BEHAVIOR_TESTS") != "1",
    reason="set RUN_AGENT_BEHAVIOR_TESTS=1 to run provider-backed behavior tests",
)


@dataclass
class RecordingCommander:
    calls: list[str] = field(default_factory=list)

    async def show_slide(self, slide_id: str) -> str:
        self.calls.append(slide_id)
        return slide_narration(slide_id)


def _tool_calls(result) -> list[tuple[str, dict[str, str]]]:
    return [
        (event.item.name, json.loads(event.item.arguments))
        for event in result.events
        if event.item.type == "function_call"
    ]


def _assistant_text(result) -> str:
    messages = [
        event.item.text_content
        for event in result.events
        if event.item.type == "message" and event.item.role == "assistant"
    ]
    return " ".join(text for text in messages if text).strip()


@pytest.mark.asyncio
@pytest.mark.parametrize("run_number", [1, 2])
async def test_presenter_routes_and_grounds_two_runs(run_number: int) -> None:
    config = RealtimeConfig(providers=("openai",), model_id="gpt-realtime-2.1")
    commander = RecordingCommander()
    cases = [
        ("Give me the big picture", "s1_tipoff"),
        ("Should we push it or slow it down?", "s5_xfactors"),
        ("How do we stop LeBron?", "s2_lebron"),
        ("What about the other guy who scores from anywhere?", "s3_kyrie"),
    ]

    async with (
        utils.http_context.open(),
        AgentSession(llm=build_realtime_model(config)) as session,
    ):
        await session.start(Assistant(commander))
        for user_input, expected_slide in cases:
            result = await session.run(user_input=user_input)
            calls = _tool_calls(result)
            assert calls == [("show_slide", {"slide_id": expected_slide})]
            reply = _assistant_text(result)
            assert reply
            print(
                f"run={run_number} input={user_input!r} slide={expected_slide} "
                f"reply={reply!r}"
            )

            if expected_slide == "s2_lebron":
                assert "Iguodala" in reply
                allowed_numbers = set(
                    re.findall(r"\d+(?:\.\d+)?", slide_narration(expected_slide))
                )
                reply_numbers = set(re.findall(r"\d+(?:\.\d+)?", reply))
                assert reply_numbers <= allowed_numbers

    assert commander.calls == [expected for _, expected in cases]
