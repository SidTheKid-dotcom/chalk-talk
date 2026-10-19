import json
from typing import Any

import pytest

from agent import (
    CLICKER_INSTRUCTIONS,
    Assistant,
    CoachSwitcher,
    find_by_role,
    participant_role,
)


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


class FakeRoomIO:
    def __init__(self) -> None:
        self.calls: list[str | None] = []
        self.linked_participant: FakeRemote | None = None

    def set_participant(self, participant_identity: str | None) -> None:
        self.calls.append(participant_identity)
        if participant_identity is None:
            self.linked_participant = None
            return
        self.linked_participant = FakeRemote(participant_identity, {"role": "coach"})


class FakeSession:
    def __init__(self) -> None:
        self.room_io = FakeRoomIO()


class FakeAgent:
    def __init__(self) -> None:
        self.instructions = "presenter"

    async def update_instructions(self, instructions: str) -> None:
        self.instructions = instructions


def test_explicit_dispatch_name_is_set() -> None:
    from agent import AGENT_NAME

    assert AGENT_NAME


def test_assistant_greets_as_warriors_coach() -> None:
    instructions = Assistant().instructions
    assert "Warriors" in instructions
    assert "Game 7" in instructions
    assert "2016 NBA Finals" in instructions


def test_clicker_instructions_are_one_line() -> None:
    assert "\n" not in CLICKER_INSTRUCTIONS
    assert "Assistant" in CLICKER_INSTRUCTIONS
    assert "show_slide" in CLICKER_INSTRUCTIONS


def test_find_coach_by_role_when_player_joined_first() -> None:
    room = FakeRoom(
        [
            FakeRemote("player-bbb", {"role": "player"}),
            FakeRemote("coach-aaa", {"role": "coach"}),
        ]
    )
    coach = find_by_role(room, "coach")
    assert coach is not None
    assert coach.identity == "coach-aaa"
    assert participant_role(coach) == "coach"
    first = next(iter(room.remote_participants.values()))
    assert first.identity == "player-bbb"


def test_find_coach_returns_none_without_role() -> None:
    room = FakeRoom([FakeRemote("human-1", {})])
    assert find_by_role(room, "coach") is None
    assert participant_role(room.remote_participants["human-1"]) is None


@pytest.mark.asyncio
async def test_switcher_set_participant_and_clicker_on_coach_join() -> None:
    room = FakeRoom([FakeRemote("player-bbb", {"role": "player"})])
    session = FakeSession()
    agent = FakeAgent()
    switcher = CoachSwitcher(session, agent, room)
    switcher.attach()
    assert "participant_connected" in room.handlers
    assert "participant_attributes_changed" in room.handlers
    assert "participant_disconnected" in room.handlers

    coach = FakeRemote("coach-aaa", {"role": "coach"})
    room.remote_participants[coach.identity] = coach
    room.emit("participant_connected", coach)
    pending = list(switcher._tasks)
    assert pending
    await pending[0]

    assert session.room_io.calls == ["coach-aaa"]
    assert agent.instructions == CLICKER_INSTRUCTIONS
    assert room.local_participant.attribute_calls == [{"mode": "clicker"}]


@pytest.mark.asyncio
async def test_switcher_ignores_player_join() -> None:
    room = FakeRoom([])
    session = FakeSession()
    agent = FakeAgent()
    switcher = CoachSwitcher(session, agent, room)
    switcher.attach()
    room.emit("participant_connected", FakeRemote("player-bbb", {"role": "player"}))
    assert not switcher._tasks
    assert session.room_io.calls == []
    assert agent.instructions == "presenter"


@pytest.mark.asyncio
async def test_switcher_logs_coach_leave_without_fallback(
    caplog: pytest.LogCaptureFixture,
) -> None:
    room = FakeRoom([])
    session = FakeSession()
    agent = FakeAgent()
    switcher = CoachSwitcher(session, agent, room)
    switcher.attach()
    coach = FakeRemote("coach-aaa", {"role": "coach"})
    room.emit("participant_connected", coach)
    await next(iter(switcher._tasks))

    with caplog.at_level("INFO", logger="agent"):
        room.emit("participant_disconnected", coach)

    assert session.room_io.calls == ["coach-aaa"]
    assert agent.instructions == CLICKER_INSTRUCTIONS
    left = [
        json.loads(rec.message) for rec in caplog.records if rec.message.startswith("{")
    ]
    events = [row["event"] for row in left]
    assert "coach_left" in events
    payload = next(row for row in left if row["event"] == "coach_left")
    assert payload["identity"] == "coach-aaa"
    assert "no fallback" in payload["note"]
