import asyncio
import json
from typing import Any

import pytest
from livekit import rtc
from livekit.agents.llm import ChatContext
from livekit.agents.voice.room_io.types import DEFAULT_CLOSE_ON_DISCONNECT_REASONS
from livekit.rtc import RpcError

from coach_switcher import (
    COACH_BRIEFING_ATTRIBUTE,
    COACH_BRIEFING_TOPIC,
    COACH_LINK_RESULT,
    CoachLinkCommander,
    CoachSwitcher,
    HandoffState,
    build_coach_briefing,
    find_by_role,
    paraphrase_player_turn,
    participant_role,
    validate_app_url,
)

PRESENTER = "presenter instructions"
CLICKER = "clicker instructions"


class FakeRemote:
    def __init__(
        self,
        identity: str,
        role: str | None,
        *,
        disconnect_reason: rtc.DisconnectReason.ValueType | None = None,
    ) -> None:
        self.identity = identity
        self.attributes = {"role": role} if role is not None else {}
        self.disconnect_reason = disconnect_reason


class FakeLocal:
    def __init__(self, events: list[str]) -> None:
        self.identity = "agent"
        self.events = events
        self.rpc_response = '{"ok":true}'
        self.rpc_error: RpcError | None = None
        self.rpc_calls: list[dict[str, Any]] = []
        self.text_calls: list[dict[str, Any]] = []
        self.attribute_calls: list[dict[str, str]] = []
        self.fail_attributes_for: str | None = None

    async def perform_rpc(self, **kwargs: Any) -> str:
        self.events.append("rpc")
        self.rpc_calls.append(kwargs)
        if self.rpc_error is not None:
            raise self.rpc_error
        return self.rpc_response

    async def send_text(self, text: str, **kwargs: Any) -> object:
        self.events.append("briefing")
        self.text_calls.append({"text": text, **kwargs})
        return object()

    async def set_attributes(self, attributes: dict[str, str]) -> None:
        if "mode" in attributes:
            mode = attributes["mode"]
            self.events.append(f"mode:{mode}")
            if mode == self.fail_attributes_for:
                raise RuntimeError("attribute write failed")
        self.attribute_calls.append(dict(attributes))


class FakeRoom:
    def __init__(self, participants: list[FakeRemote], events: list[str]) -> None:
        self.name = "fr-0123456789abcdef"
        self.remote_participants = {item.identity: item for item in participants}
        self.local_participant = FakeLocal(events)
        self.handlers: dict[str, list[Any]] = {}

    def on(self, event: str, callback: Any) -> Any:
        self.handlers.setdefault(event, []).append(callback)
        return callback

    def off(self, event: str, callback: Any) -> None:
        self.handlers[event].remove(callback)

    def emit(self, event: str, *args: Any) -> None:
        for callback in tuple(self.handlers.get(event, [])):
            callback(*args)

    def disconnect(self, participant: FakeRemote) -> None:
        self.remote_participants.pop(participant.identity, None)
        self.emit("participant_disconnected", participant)


class FakeRoomIO:
    def __init__(
        self,
        room: FakeRoom,
        events: list[str],
        linked: FakeRemote | None,
    ) -> None:
        self.room = room
        self.events = events
        self.linked_participant = linked
        self.calls: list[str | None] = []
        self.fail_once_for: str | None = None

    def set_participant(self, participant_identity: str | None) -> None:
        self.events.append(f"floor:{participant_identity}")
        self.calls.append(participant_identity)
        if (
            self.fail_once_for is not None
            and participant_identity == self.fail_once_for
        ):
            self.fail_once_for = None
            raise RuntimeError("switch failed")
        self.linked_participant = (
            self.room.remote_participants.get(participant_identity)
            if participant_identity is not None
            else None
        )


class FakeSpeech:
    def __init__(self, events: list[str], error: BaseException | None = None) -> None:
        self.events = events
        self.error = error

    def __await__(self):
        async def wait() -> FakeSpeech:
            self.events.append("handoff_played")
            return self

        return wait().__await__()

    def exception(self) -> BaseException | None:
        return self.error


class FakeSession:
    def __init__(
        self,
        room: FakeRoom,
        events: list[str],
        linked: FakeRemote | None,
        user_turns: list[str] | None = None,
    ) -> None:
        self.room_io = FakeRoomIO(room, events, linked)
        self.events = events
        self.reply_calls: list[dict[str, Any]] = []
        self.shutdown_calls = 0
        chat_ctx = ChatContext()
        for turn in user_turns or []:
            chat_ctx.add_message(role="user", content=turn)
        self.current_agent = type("CurrentAgent", (), {"chat_ctx": chat_ctx})()

    def generate_reply(self, **kwargs: Any) -> FakeSpeech:
        self.events.append("handoff_generated")
        self.reply_calls.append(kwargs)
        return FakeSpeech(self.events)

    def shutdown(self, *, drain: bool = True) -> None:
        self.shutdown_calls += 1


class FakeAgent:
    def __init__(self, events: list[str]) -> None:
        self.events = events
        self.instructions = PRESENTER
        self.calls: list[str] = []
        self.fail_for: str | None = None

    async def update_instructions(self, instructions: str) -> None:
        self.events.append(f"instructions:{instructions}")
        self.calls.append(instructions)
        if instructions == self.fail_for:
            raise RuntimeError("instruction update failed")
        self.instructions = instructions


class FakeSlideState:
    current_slide = "s3_kyrie"


def make_switcher(
    room: FakeRoom,
    events: list[str],
    *,
    state: HandoffState | None = None,
    linked: FakeRemote | None = None,
    floor_debounce_s: float = 0,
) -> tuple[CoachSwitcher, FakeSession, FakeAgent, HandoffState]:
    player = find_by_role(room, "player")
    session = FakeSession(
        room,
        events,
        linked if linked is not None else player,
        ["How do we stop LeBron?", "What about Kyrie?", "Get me the head coach"],
    )
    agent = FakeAgent(events)
    handoff_state = state or HandoffState()
    switcher = CoachSwitcher(
        session,
        agent,
        room,
        FakeSlideState(),
        handoff_state,
        presenter_instructions=PRESENTER,
        clicker_instructions=CLICKER,
        floor_debounce_s=floor_debounce_s,
    )
    return switcher, session, agent, handoff_state


def add_and_emit(room: FakeRoom, participant: FakeRemote) -> None:
    room.remote_participants[participant.identity] = participant
    room.emit("participant_connected", participant)


def test_role_lookup_uses_attributes_and_keeps_first_duplicate(
    caplog: pytest.LogCaptureFixture,
) -> None:
    events: list[str] = []
    room = FakeRoom(
        [
            FakeRemote("player-first", "player"),
            FakeRemote("player-second", "player"),
            FakeRemote("coach", "coach"),
            FakeRemote("unknown", None),
        ],
        events,
    )
    with caplog.at_level("WARNING", logger="agent"):
        player = find_by_role(room, "player")
    assert player is not None and player.identity == "player-first"
    assert participant_role(room.remote_participants["coach"]) == "coach"
    assert participant_role(room.remote_participants["unknown"]) is None
    assert '"event": "multiple_role"' in caplog.text


@pytest.mark.asyncio
async def test_coach_link_is_room_bound_acked_and_marks_requested() -> None:
    events: list[str] = []
    room = FakeRoom([FakeRemote("player", "player")], events)
    state = HandoffState()
    command = CoachLinkCommander(room, "https://chalk.example/base/", state)

    session = FakeSession(
        room, events, None, ["What about Kyrie?", "Get me the head coach"]
    )
    result = await command.request_handoff(session)

    assert result == COACH_LINK_RESULT
    assert state.handoff_requested is True
    assert state.request_count == 1
    assert state.user_turn_count == 2
    call = room.local_participant.rpc_calls[0]
    assert call["destination_identity"] == "player"
    assert call["method"] == "show_coach_link"
    assert json.loads(call["payload"]) == {
        "url": "https://chalk.example/base/coach?room=fr-0123456789abcdef"
    }


@pytest.mark.asyncio
async def test_coach_link_failure_does_not_mark_requested() -> None:
    events: list[str] = []
    room = FakeRoom([FakeRemote("player", "player")], events)
    room.local_participant.rpc_response = '{"ok":false,"reason":"not ready"}'
    state = HandoffState()

    session = FakeSession(room, events, None, ["Get me the head coach"])
    result = await CoachLinkCommander(
        room, "http://localhost:3000", state
    ).request_handoff(session)

    assert result == "FAILED: coach link not shown (not ready)."
    assert state.handoff_requested is False
    assert state.user_turn_count is None
    room.local_participant.rpc_response = "[]"
    result = await CoachLinkCommander(
        room, "http://localhost:3000", state
    ).request_handoff(session)
    assert result == "FAILED: coach link not shown (malformed ack)."
    with pytest.raises(ValueError, match="absolute http"):
        validate_app_url("localhost:3000")


def test_paraphrase_player_turn_is_a_note_not_a_transcript() -> None:
    assert (
        paraphrase_player_turn("so what's the plan tonight") == "Wanted the Game 7 plan"
    )
    assert paraphrase_player_turn("How do we stop LeBron?") == "How to stop LeBron"
    assert paraphrase_player_turn(
        "Kyrie is a good passer, where does he attack from?"
    ) == ("Kyrie coverage")
    assert paraphrase_player_turn("Get me the head coach") == "Asked to bring you in"


def test_briefing_uses_session_turns_and_skips_handoff_request() -> None:
    events: list[str] = []
    room = FakeRoom([], events)
    session = FakeSession(
        room,
        events,
        None,
        ["How do we stop LeBron?", "What about Kyrie?", "Get me the head coach"],
    )
    state = HandoffState()
    state.mark_requested(session)
    briefing = build_coach_briefing(
        session, "s3_kyrie", user_turn_count=state.user_turn_count
    )
    assert state.user_turn_count == 3
    assert briefing["asked"] == ["How to stop LeBron", "Kyrie coverage"]
    assert briefing["main_worry"] == "Kyrie coverage"
    assert briefing["current_slide"] == "s3_kyrie"
    assert "How do we stop LeBron?" not in briefing["asked"]
    assert "What about Kyrie?" not in briefing["summary"]
    assert "Kyrie coverage" in str(briefing["summary"])


def test_briefing_keeps_the_concern_from_before_later_turns() -> None:
    events: list[str] = []
    room = FakeRoom([], events)
    at_request = FakeSession(
        room,
        events,
        None,
        ["How do we stop LeBron?", "What about Kyrie?", "Get me the head coach"],
    )
    state = HandoffState()
    state.mark_requested(at_request)
    later = FakeSession(
        room,
        events,
        None,
        [
            "How do we stop LeBron?",
            "What about Kyrie?",
            "Get me the head coach",
            "ok thanks",
        ],
    )
    briefing = build_coach_briefing(
        later, "s3_kyrie", user_turn_count=state.user_turn_count
    )
    assert briefing["asked"] == ["How to stop LeBron", "Kyrie coverage"]
    assert briefing["main_worry"] == "Kyrie coverage"
    assert "ok thanks" not in briefing["asked"]
    assert "ok thanks" not in str(briefing["summary"])


@pytest.mark.asyncio
async def test_handoff_order_and_private_briefing_destination() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    room = FakeRoom([player], events)
    state = HandoffState(handoff_requested=True, request_count=1, user_turn_count=3)
    switcher, session, agent, _ = make_switcher(room, events, state=state)
    switcher.attach()
    coach = FakeRemote("coach", "coach")

    add_and_emit(room, coach)
    await switcher.drain()

    assert events[-6:] == [
        "briefing",
        "handoff_generated",
        "handoff_played",
        f"instructions:{CLICKER}",
        "mode:clicker",
        "floor:coach",
    ]
    text_call = room.local_participant.text_calls[0]
    assert text_call["topic"] == COACH_BRIEFING_TOPIC
    assert text_call["destination_identities"] == ["coach"]
    assert "player" not in text_call["destination_identities"]
    assert json.loads(text_call["text"])["main_worry"] == "Kyrie coverage"
    stored = next(
        call
        for call in room.local_participant.attribute_calls
        if COACH_BRIEFING_ATTRIBUTE in call
    )
    assert (
        json.loads(stored[COACH_BRIEFING_ATTRIBUTE])["main_worry"] == "Kyrie coverage"
    )
    assert session.reply_calls[0]["tool_choice"] == "none"
    assert agent.instructions == CLICKER
    assert state.active_coach_identity == "coach"


@pytest.mark.asyncio
async def test_coach_present_at_attach_switches_without_prior_request() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    coach = FakeRemote("coach", "coach")
    room = FakeRoom([player, coach], events)
    switcher, session, _, state = make_switcher(room, events)

    switcher.attach()
    await switcher.drain()

    assert state.handoff_requested is False
    assert state.active_coach_identity == "coach"
    assert session.room_io.calls == ["coach"]
    briefing = json.loads(room.local_participant.text_calls[0]["text"])
    assert briefing["main_worry"] == "Asked to bring you in"


@pytest.mark.asyncio
async def test_attributes_changed_requires_role_in_changed_values() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    coach = FakeRemote("coach", "coach")
    room = FakeRoom([player, coach], events)
    switcher, session, _, _ = make_switcher(room, events)
    switcher.attach()
    await switcher.drain()
    session.room_io.calls.clear()

    second = FakeRemote("coach-second", "coach")
    room.remote_participants[second.identity] = second
    room.emit("participant_attributes_changed", {"name": "Coach"}, second)
    await switcher.drain()
    assert session.room_io.calls == []

    room.disconnect(coach)
    await switcher.drain()
    room.emit("participant_attributes_changed", {"role": "coach"}, second)
    await switcher.drain()
    assert session.room_io.calls[-1] == "coach-second"


@pytest.mark.asyncio
async def test_duplicate_coach_does_not_replace_active_coach() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    room = FakeRoom([player], events)
    switcher, session, _, state = make_switcher(room, events)
    switcher.attach()
    first = FakeRemote("coach-first", "coach")
    second = FakeRemote("coach-second", "coach")

    add_and_emit(room, first)
    add_and_emit(room, second)
    await switcher.drain()

    assert session.room_io.calls == ["coach-first"]
    assert state.active_coach_identity == "coach-first"


@pytest.mark.asyncio
async def test_instruction_failure_aborts_before_mode_or_audio_switch(
    caplog: pytest.LogCaptureFixture,
) -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    room = FakeRoom([player], events)
    switcher, session, agent, state = make_switcher(room, events)
    agent.fail_for = CLICKER
    switcher.attach()

    with caplog.at_level("ERROR", logger="agent"):
        add_and_emit(room, FakeRemote("coach", "coach"))
        await switcher.drain()

    assert session.room_io.calls == []
    assert COACH_BRIEFING_ATTRIBUTE in room.local_participant.attribute_calls[0]
    assert room.local_participant.attribute_calls[-1] == {"mode": "presenter"}
    assert state.active_coach_identity is None
    assert '"stage": "update_instructions"' in caplog.text


@pytest.mark.asyncio
async def test_audio_switch_failure_rolls_back_presenter_and_player() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    room = FakeRoom([player], events)
    switcher, session, agent, state = make_switcher(room, events)
    session.room_io.fail_once_for = "coach"
    switcher.attach()

    add_and_emit(room, FakeRemote("coach", "coach"))
    await switcher.drain()

    assert session.room_io.calls == ["coach", "player"]
    assert session.room_io.linked_participant is player
    assert agent.instructions == PRESENTER
    assert room.local_participant.attribute_calls[-1] == {"mode": "presenter"}
    assert state.active_coach_identity is None


@pytest.mark.asyncio
async def test_sequential_human_speakers_share_one_session_floor() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    coach = FakeRemote("coach", "coach")
    room = FakeRoom([player], events)
    switcher, session, _, _ = make_switcher(room, events)
    switcher.attach()
    add_and_emit(room, coach)
    await switcher.drain()
    session.room_io.calls.clear()

    room.emit("active_speakers_changed", [player])
    await switcher.drain()
    room.emit("active_speakers_changed", [coach])
    await switcher.drain()

    assert session.room_io.calls == ["player", "coach"]


@pytest.mark.asyncio
async def test_simultaneous_speech_holds_current_floor_and_ignores_untrusted() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    coach = FakeRemote("coach", "coach")
    agent_participant = FakeRemote("other-agent", None)
    room = FakeRoom([player], events)
    switcher, session, _, _ = make_switcher(room, events)
    switcher.attach()
    add_and_emit(room, coach)
    room.remote_participants[agent_participant.identity] = agent_participant
    await switcher.drain()
    session.room_io.calls.clear()

    room.emit("active_speakers_changed", [player, coach, agent_participant])
    await switcher.drain()

    assert session.room_io.calls == []
    assert session.room_io.linked_participant is coach


@pytest.mark.asyncio
async def test_floor_debounce_drops_a_fast_flip_and_switches_once() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    coach = FakeRemote("coach", "coach")
    room = FakeRoom([player], events)
    switcher, session, _, _ = make_switcher(room, events, floor_debounce_s=0.05)
    switcher.attach()
    add_and_emit(room, coach)
    await switcher.drain()
    session.room_io.calls.clear()

    # A is the linked coach. A/B/A inside the debounce must not switch.
    room.emit("active_speakers_changed", [coach])
    room.emit("active_speakers_changed", [player])
    room.emit("active_speakers_changed", [coach])
    await asyncio.sleep(0.12)
    assert session.room_io.calls == []

    room.emit("active_speakers_changed", [player])
    await asyncio.sleep(0.12)
    assert session.room_io.calls == ["player"]


@pytest.mark.asyncio
async def test_floor_debounce_task_logs_exceptions(
    caplog: pytest.LogCaptureFixture,
) -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    coach = FakeRemote("coach", "coach")
    room = FakeRoom([player], events)
    switcher, _, _, _ = make_switcher(room, events)
    switcher.attach()
    add_and_emit(room, coach)
    await switcher.drain()

    async def explode(_identity: str, _observed_at: float) -> None:
        raise RuntimeError("floor debounce failed")

    switcher._floor._switch_after_debounce = explode  # type: ignore[method-assign]

    with caplog.at_level("ERROR", logger="agent"):
        room.emit("active_speakers_changed", [player])
        pending = switcher._floor._pending
        assert pending is not None
        with pytest.raises(RuntimeError, match="floor debounce failed"):
            await pending

    assert '"event": "async_task_failed"' in caplog.text
    assert "active_speaker_floor_switch" in caplog.text
    assert "floor debounce failed" in caplog.text


@pytest.mark.asyncio
async def test_coach_leave_restores_presenter_and_allows_second_coach() -> None:
    events: list[str] = []
    player = FakeRemote("player", "player")
    first = FakeRemote("coach-first", "coach")
    room = FakeRoom([player], events)
    switcher, session, agent, state = make_switcher(room, events)
    switcher.attach()
    add_and_emit(room, first)
    await switcher.drain()

    room.disconnect(first)
    await switcher.drain()

    assert agent.instructions == PRESENTER
    assert session.room_io.linked_participant is player
    assert room.local_participant.attribute_calls[-1] == {"mode": "presenter"}
    assert session.shutdown_calls == 0
    assert state.active_coach_identity is None

    second = FakeRemote("coach-second", "coach")
    add_and_emit(room, second)
    await switcher.drain()
    assert session.room_io.linked_participant is second
    assert state.active_coach_identity == "coach-second"


@pytest.mark.asyncio
async def test_session_ends_only_after_last_player_leaves() -> None:
    events: list[str] = []
    reason = rtc.DisconnectReason.CLIENT_INITIATED
    first = FakeRemote("player-first", "player", disconnect_reason=reason)
    second = FakeRemote("player-second", "player", disconnect_reason=reason)
    room = FakeRoom([first, second], events)
    switcher, session, _, _ = make_switcher(room, events, linked=first)
    switcher.attach()

    room.disconnect(first)
    await switcher.drain()
    assert session.shutdown_calls == 0

    room.disconnect(second)
    await switcher.drain()
    assert session.shutdown_calls == 1


@pytest.mark.asyncio
async def test_network_disconnect_keeps_the_session() -> None:
    events: list[str] = []
    player = FakeRemote(
        "player",
        "player",
        disconnect_reason=rtc.DisconnectReason.CONNECTION_TIMEOUT,
    )
    room = FakeRoom([player], events)
    switcher, session, _, _ = make_switcher(room, events, linked=player)
    switcher.attach()

    room.disconnect(player)
    await switcher.drain()

    assert session.shutdown_calls == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("reason", DEFAULT_CLOSE_ON_DISCONNECT_REASONS)
async def test_close_reason_ends_session_when_no_player_remains(
    reason: rtc.DisconnectReason.ValueType,
) -> None:
    events: list[str] = []
    player = FakeRemote("player", "player", disconnect_reason=reason)
    room = FakeRoom([player], events)
    switcher, session, _, _ = make_switcher(room, events, linked=player)
    switcher.attach()

    room.disconnect(player)
    await switcher.drain()

    assert session.shutdown_calls == 1


def test_detach_unregisters_room_handlers() -> None:
    events: list[str] = []
    room = FakeRoom([FakeRemote("player", "player")], events)
    switcher, _, _, _ = make_switcher(room, events)
    switcher.attach()
    switcher.detach()
    assert all(not callbacks for callbacks in room.handlers.values())
