from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field

import pytest
from livekit.agents import AgentSession, utils

from agent import Assistant
from deck_data import get_slide, slide_narration
from model import RealtimeConfig, build_realtime_model

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_AGENT_BEHAVIOR_TESTS") != "1",
    reason="set RUN_AGENT_BEHAVIOR_TESTS=1 to run provider-backed behavior tests",
)

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
SLIDE_ASSIGNMENT = re.compile(
    r"\b(primary|assignment|blitz|stagger|switch the|iguodala is)\b",
    re.IGNORECASE,
)


@dataclass
class RecordingCommander:
    calls: list[str] = field(default_factory=list)

    async def show_slide(self, slide_id: str) -> str:
        self.calls.append(slide_id)
        return slide_narration(slide_id)


def _event_type(event: object) -> str | None:
    item = getattr(event, "item", None)
    return getattr(item, "type", None)


def _assert_content_free_leadin(text: str, slide_id: str) -> None:
    words = text.split()
    assert len(words) <= 20, text
    assert DIGIT.search(text) is None, text
    assert SPELLED_NUMBER.search(text) is None, text
    assert SLIDE_ASSIGNMENT.search(text) is None, text
    slide = get_slide(slide_id)
    assert slide is not None
    hay = text.lower()
    for point in slide["points"]:
        assert point.lower() not in hay, text
    assert slide["notes"].lower() not in hay, text


def _inspect_turn(result: object, expected_slide: str) -> str:
    lead = result.expect.skip_next_event_if(type="message", role="assistant")
    if lead is not None:
        text = lead.event().item.text_content or ""
        if text.strip():
            _assert_content_free_leadin(text, expected_slide)

    call = result.expect.next_event().is_function_call(
        name="show_slide", arguments={"slide_id": expected_slide}
    )
    assert json.loads(call.event().item.arguments) == {"slide_id": expected_slide}
    result.expect.skip_next_event_if(type="function_call_output")
    answer = result.expect.next_event().is_message(role="assistant")
    post = (answer.event().item.text_content or "").strip()
    assert post
    return post


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
            types = [_event_type(event) for event in result.events]
            assert "function_call" in types
            assert types.index("function_call") < max(
                i for i, name in enumerate(types) if name == "message"
            )
            post = _inspect_turn(result, expected_slide)
            print(
                f"run={run_number} input={user_input!r} slide={expected_slide} "
                f"post={post!r} events={types}"
            )

            if expected_slide == "s2_lebron":
                assert "Iguodala" in post
                allowed_numbers = set(
                    re.findall(r"\d+(?:\.\d+)?", slide_narration(expected_slide))
                )
                reply_numbers = set(re.findall(r"\d+(?:\.\d+)?", post))
                assert reply_numbers <= allowed_numbers

    assert commander.calls == [expected for _, expected in cases]
