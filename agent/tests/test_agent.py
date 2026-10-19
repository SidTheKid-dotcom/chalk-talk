import asyncio
from typing import Any

import pytest

from agent import (
    CLICKER_INSTRUCTIONS,
    STARTUP_SLIDE_ID,
    Assistant,
    greet_after_startup,
    is_startup_retryable,
    load_worker_realtime_config,
    present_opening_slide,
    show_startup_slide,
    startup_reply_instructions,
    wait_for_player,
)
from deck_data import slide_narration


class FakeRemote:
    def __init__(self, identity: str, attributes: dict[str, str]) -> None:
        self.identity = identity
        self.attributes = attributes
        self.disconnect_reason = None


class FakeLocal:
    def __init__(self) -> None:
        self.identity = "agent"
        self.attribute_calls: list[dict[str, str]] = []

    async def set_attributes(self, attributes: dict[str, str]) -> None:
        self.attribute_calls.append(dict(attributes))


class FakeRoom:
    def __init__(self, participants: list[FakeRemote]) -> None:
        self.remote_participants = {item.identity: item for item in participants}
        self.local_participant = FakeLocal()
        self.handlers: dict[str, list[Any]] = {}

    def on(self, event: str, callback: Any) -> Any:
        self.handlers.setdefault(event, []).append(callback)
        return callback

    def emit(self, event: str, *args: Any) -> None:
        for callback in self.handlers.get(event, []):
            callback(*args)


def test_explicit_dispatch_name_is_set() -> None:
    from agent import AGENT_NAME

    assert AGENT_NAME


def test_assistant_greets_as_warriors_coach() -> None:
    instructions = Assistant().instructions
    assert "Warriors" in instructions
    assert "Game Seven" in instructions
    assert "twenty sixteen NBA Finals" in instructions


@pytest.mark.asyncio
async def test_show_slide_without_commander_returns_failure_unchanged() -> None:
    result = await Assistant().show_slide("s1_tipoff")
    assert result == (
        "FAILED: slide not shown (commander missing). Do not describe it as on screen."
    )
    highlight = await Assistant().highlight("cle_james")
    play = await Assistant().run_play("p_blitz_lebron_pnr")
    callout = await Assistant().add_callout(text="Iguodala on LeBron")
    assert highlight.startswith("FAILED: highlight not shown")
    assert play.startswith("FAILED: play not shown")
    assert callout.startswith("FAILED: callout not shown")


def test_clicker_instructions_are_one_line() -> None:
    assert "\n" not in CLICKER_INSTRUCTIONS
    assert "Assistant" in CLICKER_INSTRUCTIONS
    assert "show_slide" in CLICKER_INSTRUCTIONS


@pytest.mark.asyncio
async def test_call_head_coach_uses_acked_command_path() -> None:
    class CoachLink:
        async def request_handoff(self, _turn_source: object) -> str:
            return "Coach link is on screen. Say one short line, then wait."

    assistant = Assistant(coach_link=CoachLink())  # type: ignore[arg-type]
    result = await assistant.call_head_coach()
    assert result == "Coach link is on screen. Say one short line, then wait."


def test_startup_reply_instructions_acked_branch() -> None:
    result = slide_narration(STARTUP_SLIDE_ID)
    instructions = startup_reply_instructions(result)
    assert "present the opening slide" in instructions
    assert "could not be shown" not in instructions
    assert result in instructions


def test_startup_reply_instructions_failed_branch() -> None:
    result = (
        "FAILED: slide not shown (player not found). Do not describe it as on screen."
    )
    instructions = startup_reply_instructions(result)
    assert "could not be shown" in instructions
    assert "present the opening slide" not in instructions
    assert "Do not describe any slide content" in instructions
    assert result in instructions


def test_startup_retryable_matches_expected_codes() -> None:
    assert is_startup_retryable(
        "FAILED: slide not shown (player not found). Do not describe it as on screen."
    )
    assert is_startup_retryable(
        "FAILED: slide not shown (recipient not found). Do not describe it as on screen."
    )
    assert is_startup_retryable(
        "FAILED: slide not shown (unsupported method). Do not describe it as on screen."
    )
    assert is_startup_retryable(
        "FAILED: slide not shown (not ready). Do not describe it as on screen."
    )
    assert not is_startup_retryable(
        "FAILED: slide not shown (response timeout). Do not describe it as on screen."
    )
    assert not is_startup_retryable(slide_narration(STARTUP_SLIDE_ID))


class RecordingCommander:
    def __init__(self, results: list[str]) -> None:
        self.results = results
        self.calls: list[str] = []

    async def show_slide(self, slide_id: str) -> str:
        self.calls.append(slide_id)
        return self.results[min(len(self.calls) - 1, len(self.results) - 1)]


class RecordingSession:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def generate_reply(self, **kwargs: object) -> None:
        self.calls.append(kwargs)


@pytest.mark.asyncio
async def test_show_startup_slide_retries_then_acks() -> None:
    acked = slide_narration(STARTUP_SLIDE_ID)
    commander = RecordingCommander(
        [
            "FAILED: slide not shown (player not found). Do not describe it as on screen.",
            "FAILED: slide not shown (not ready). Do not describe it as on screen.",
            acked,
        ]
    )
    sleeps: list[float] = []

    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    result = await show_startup_slide(commander, sleep=fake_sleep)
    assert result == acked
    assert commander.calls == [STARTUP_SLIDE_ID, STARTUP_SLIDE_ID, STARTUP_SLIDE_ID]
    assert sleeps == [0.25, 0.25]


@pytest.mark.asyncio
async def test_show_startup_slide_gives_up_on_retryable_failure() -> None:
    failed = (
        "FAILED: slide not shown (unsupported method). Do not describe it as on screen."
    )
    commander = RecordingCommander([failed])
    sleeps: list[float] = []

    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    result = await show_startup_slide(commander, attempts=3, sleep=fake_sleep)
    assert result == failed
    assert commander.calls == [STARTUP_SLIDE_ID] * 3
    assert sleeps == [0.25, 0.25]


@pytest.mark.asyncio
async def test_show_startup_slide_does_not_retry_other_failures() -> None:
    failed = (
        "FAILED: slide not shown (response timeout). Do not describe it as on screen."
    )
    commander = RecordingCommander([failed])
    sleeps: list[float] = []

    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    result = await show_startup_slide(commander, sleep=fake_sleep)
    assert result == failed
    assert commander.calls == [STARTUP_SLIDE_ID]
    assert sleeps == []


@pytest.mark.asyncio
async def test_present_opening_slide_acked_branch() -> None:
    acked = slide_narration(STARTUP_SLIDE_ID)
    room = FakeRoom([FakeRemote("player-bbb", {"role": "player"})])
    session = RecordingSession()
    result = await present_opening_slide(session, RecordingCommander([acked]), room)
    assert result == acked
    assert session.calls[0]["tool_choice"] == "none"
    instructions = str(session.calls[0]["instructions"])
    assert "present the opening slide" in instructions
    assert "could not be shown" not in instructions
    assert acked in instructions


@pytest.mark.asyncio
async def test_present_opening_slide_failed_branch() -> None:
    failed = (
        "FAILED: slide not shown (player not found). Do not describe it as on screen."
    )
    room = FakeRoom([])
    session = RecordingSession()
    result = await present_opening_slide(
        session,
        RecordingCommander([failed]),
        room,
        player_timeout_s=0.01,
        attempts=2,
        delay_s=0,
    )
    assert result == failed
    instructions = str(session.calls[0]["instructions"])
    assert "could not be shown" in instructions
    assert "present the opening slide" not in instructions
    assert failed in instructions


@pytest.mark.asyncio
async def test_wait_for_player_returns_existing() -> None:
    room = FakeRoom([FakeRemote("player-bbb", {"role": "player"})])
    found = await wait_for_player(room, timeout_s=0.01)
    assert found is not None
    assert found.identity == "player-bbb"


@pytest.mark.asyncio
async def test_wait_for_player_joins() -> None:
    room = FakeRoom([])

    async def join() -> None:
        await asyncio.sleep(0.01)
        player = FakeRemote("player-bbb", {"role": "player"})
        room.remote_participants[player.identity] = player
        room.emit("participant_connected", player)

    task = asyncio.create_task(join())
    found = await wait_for_player(room, timeout_s=1.0)
    await task
    assert found is not None
    assert found.identity == "player-bbb"


@pytest.mark.asyncio
async def test_wait_for_player_timeout() -> None:
    room = FakeRoom([])
    found = await wait_for_player(room, timeout_s=0.05)
    assert found is None


@pytest.mark.asyncio
async def test_greet_after_startup_uses_failure_instructions() -> None:
    session = RecordingSession()
    failed = "FAILED: slide not shown (not ready). Do not describe it as on screen."
    await greet_after_startup(session, failed)
    assert session.calls[0]["tool_choice"] == "none"
    assert "could not be shown" in str(session.calls[0]["instructions"])


def test_debug_skips_realtime_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CHALK_DEBUG", "1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("REALTIME_PROVIDERS", "openai")
    assert load_worker_realtime_config() is None


def test_worker_config_still_validates_without_debug(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("CHALK_DEBUG", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("REALTIME_PROVIDERS", "openai")
    with pytest.raises(ValueError, match="OPENAI_API_KEY"):
        load_worker_realtime_config()
