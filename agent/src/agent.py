import asyncio
import json
import logging
import os
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Annotated, Any, Protocol

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    CloseEvent,
    ConversationItemAddedEvent,
    FunctionToolsExecutedEvent,
    JobContext,
    UserInputTranscribedEvent,
    cli,
    function_tool,
    room_io,
)
from livekit.agents.llm import (
    ChatMessage,
    RealtimeAvailabilityChangedEvent,
    RealtimeModelFallbackAdapter,
)
from livekit.plugins import ai_coustics
from pydantic import Field

from debug_probe import DebugSlideCommander, debug_enabled, run_debug_job
from deck_data import SlideId, assert_slide_ids_match_deck, load_deck, load_facts
from model import RealtimeConfig, build_realtime_model, load_realtime_config
from prompts import presenter_instructions, show_slide_tool_description
from slide_commander import SlideCommander

logger = logging.getLogger("agent")

# agent/.env.local (CLI keys) then repo-root .env (AGENT_NAME). First load wins.
_agent_dir = Path(__file__).resolve().parents[1]
load_dotenv(_agent_dir / ".env.local")
load_dotenv(_agent_dir.parent / ".env")

AGENT_NAME = os.environ.get("AGENT_NAME")
if not AGENT_NAME:
    raise RuntimeError("AGENT_NAME is required for explicit agent dispatch")

assert_slide_ids_match_deck()
DECK = load_deck()
FACTS = load_facts()
PRESENTER_INSTRUCTIONS = presenter_instructions(DECK, FACTS)
SHOW_SLIDE_DESCRIPTION = show_slide_tool_description(DECK)


def load_worker_realtime_config() -> RealtimeConfig | None:
    """Validate realtime credentials at worker import, unless this is a debug probe."""
    if debug_enabled():
        return None
    return load_realtime_config()


REALTIME_CONFIG = load_worker_realtime_config()

CLICKER_INSTRUCTIONS = (
    "Do not present. Stay silent unless addressed as Assistant. "
    "Call show_slide when the humans move to a topic on another slide."
)

STARTUP_SLIDE_ID = "s1_tipoff"
STARTUP_PLAYER_WAIT_S = 5.0
STARTUP_RETRY_ATTEMPTS = 8
STARTUP_RETRY_DELAY_S = 0.25
STARTUP_RETRYABLE_REASONS = (
    "player not found",
    "recipient not found",
    "unsupported method",
    "not ready",
)


class _RemoteParticipantLike(Protocol):
    identity: str
    attributes: Mapping[str, str]


class _LocalParticipantLike(Protocol):
    identity: str

    async def set_attributes(self, attributes: dict[str, str]) -> None: ...


class _RoomLike(Protocol):
    remote_participants: Mapping[str, _RemoteParticipantLike]
    local_participant: _LocalParticipantLike

    def on(self, event: str, callback: Any) -> Any: ...


class _RoomIOLike(Protocol):
    linked_participant: _RemoteParticipantLike | None

    def set_participant(self, participant_identity: str | None) -> None: ...


class _SessionLike(Protocol):
    @property
    def room_io(self) -> _RoomIOLike: ...


class _AgentLike(Protocol):
    async def update_instructions(self, instructions: str) -> None: ...


class _SlideShower(Protocol):
    async def show_slide(self, slide_id: str) -> str: ...


def _log(event: str, **fields: object) -> None:
    logger.info(json.dumps({"event": event, **fields}))


def participant_role(participant: object) -> str | None:
    attributes = getattr(participant, "attributes", None) or {}
    role = attributes.get("role")
    return role if isinstance(role, str) else None


def find_by_role(room: _RoomLike, role: str) -> _RemoteParticipantLike | None:
    found: _RemoteParticipantLike | None = None
    for participant in room.remote_participants.values():
        if participant_role(participant) != role:
            continue
        if found is not None:
            logger.warning(
                json.dumps(
                    {
                        "event": "multiple_role",
                        "role": role,
                        "kept": found.identity,
                        "ignored": participant.identity,
                    }
                )
            )
            continue
        found = participant
    return found


def is_startup_retryable(result: str) -> bool:
    if not result.startswith("FAILED:"):
        return False
    return any(reason in result for reason in STARTUP_RETRYABLE_REASONS)


def startup_reply_instructions(result: str) -> str:
    if result.startswith("FAILED:"):
        return (
            "The opening slide could not be shown. Tell the player that in one or two "
            "short sentences. Do not describe any slide content, assignments, or facts. "
            "Invite them to try again.\n\n"
            f"{result}"
        )
    return (
        "Greet the player and present the opening slide in exactly three short "
        "sentences, using only this show_slide result. The last sentence must "
        "invite their next question.\n\n"
        f"{result}"
    )


async def wait_for_player(
    room: _RoomLike,
    *,
    timeout_s: float = STARTUP_PLAYER_WAIT_S,
) -> _RemoteParticipantLike | None:
    existing = find_by_role(room, "player")
    if existing is not None:
        return existing

    found: asyncio.Future[_RemoteParticipantLike] = (
        asyncio.get_running_loop().create_future()
    )

    def _maybe_complete(participant: object) -> None:
        if found.done() or not hasattr(participant, "identity"):
            return
        if participant_role(participant) == "player":
            found.set_result(participant)  # type: ignore[arg-type]

    def _on_connected(participant: _RemoteParticipantLike) -> None:
        _maybe_complete(participant)

    def _on_attrs(changed: Mapping[str, str], participant: object) -> None:
        _maybe_complete(participant)

    room.on("participant_connected", _on_connected)
    room.on("participant_attributes_changed", _on_attrs)
    existing = find_by_role(room, "player")
    if existing is not None:
        if not found.done():
            found.set_result(existing)
        return existing
    try:
        return await asyncio.wait_for(found, timeout=timeout_s)
    except asyncio.TimeoutError:
        return None


async def show_startup_slide(
    commander: _SlideShower,
    *,
    attempts: int = STARTUP_RETRY_ATTEMPTS,
    delay_s: float = STARTUP_RETRY_DELAY_S,
    sleep: Any = asyncio.sleep,
) -> str:
    last = (
        "FAILED: slide not shown (player not found). Do not describe it as on screen."
    )
    for attempt in range(1, attempts + 1):
        last = await commander.show_slide(STARTUP_SLIDE_ID)
        applied = not last.startswith("FAILED:")
        retryable = is_startup_retryable(last)
        _log(
            "startup_slide",
            slide_id=STARTUP_SLIDE_ID,
            attempt=attempt,
            applied=applied,
            retryable=retryable,
            result=last,
        )
        if applied or not retryable:
            return last
        if attempt < attempts:
            await sleep(delay_s)
    return last


async def greet_after_startup(session: Any, result: str) -> None:
    await session.generate_reply(
        instructions=startup_reply_instructions(result),
        tool_choice="none",
    )


async def present_opening_slide(
    session: Any,
    commander: _SlideShower,
    room: _RoomLike,
    *,
    player_timeout_s: float = STARTUP_PLAYER_WAIT_S,
    attempts: int = STARTUP_RETRY_ATTEMPTS,
    delay_s: float = STARTUP_RETRY_DELAY_S,
    sleep: Any = asyncio.sleep,
) -> str:
    player = await wait_for_player(room, timeout_s=player_timeout_s)
    _log(
        "startup_player_wait",
        found=player is not None,
        identity=getattr(player, "identity", None),
    )
    result = await show_startup_slide(
        commander, attempts=attempts, delay_s=delay_s, sleep=sleep
    )
    await greet_after_startup(session, result)
    return result


class CoachSwitcher:
    """Switch RoomIO audio to the coach and enter clicker mode. Spike 1."""

    def __init__(
        self, session: _SessionLike, agent: _AgentLike, room: _RoomLike
    ) -> None:
        self._session = session
        self._agent = agent
        self._room = room
        self._tasks: set[asyncio.Task[None]] = set()
        self._lock = asyncio.Lock()
        self._switched_to: str | None = None

    def attach(self) -> None:
        self._room.on("participant_connected", self._on_participant_connected)
        self._room.on("participant_attributes_changed", self._on_attributes_changed)
        self._room.on("participant_disconnected", self._on_participant_disconnected)
        existing = find_by_role(self._room, "coach")
        if existing is not None:
            self._on_participant_connected(existing)

    def _schedule(self, coro: Any, name: str) -> None:
        task = asyncio.create_task(coro, name=name)
        self._tasks.add(task)

        def _done(done: asyncio.Task[None]) -> None:
            self._tasks.discard(done)
            if done.cancelled():
                return
            exc = done.exception()
            if exc is not None:
                logger.error(
                    json.dumps(
                        {
                            "event": "async_task_failed",
                            "task": name,
                            "error": f"{type(exc).__name__}: {exc}",
                        }
                    ),
                    exc_info=exc,
                )

        task.add_done_callback(_done)

    def _on_participant_connected(self, participant: _RemoteParticipantLike) -> None:
        if participant_role(participant) != "coach":
            return
        if self._is_local(participant):
            return
        _log(
            "coach_joined",
            identity=participant.identity,
            role="coach",
        )
        self._schedule(self._switch(participant.identity), "switch_to_coach")

    def _on_attributes_changed(
        self, changed_attributes: Mapping[str, str], participant: object
    ) -> None:
        if (
            changed_attributes.get("role") != "coach"
            and participant_role(participant) != "coach"
        ):
            return
        if not hasattr(participant, "identity"):
            return
        self._on_participant_connected(participant)  # type: ignore[arg-type]

    def _on_participant_disconnected(self, participant: _RemoteParticipantLike) -> None:
        role = participant_role(participant)
        if role != "coach" and participant.identity != self._switched_to:
            return
        linked = self._linked_identity()
        reason = getattr(participant, "disconnect_reason", None)
        _log(
            "coach_left",
            identity=participant.identity,
            role=role,
            linked_identity=linked,
            switched_to=self._switched_to,
            disconnect_reason=str(reason) if reason is not None else None,
            note="no fallback implemented; recording default RoomIO behavior",
        )

    def _is_local(self, participant: object) -> bool:
        local = getattr(self._room, "local_participant", None)
        identity = getattr(participant, "identity", None)
        return (
            local is not None
            and identity is not None
            and identity == getattr(local, "identity", None)
        )

    def _linked_identity(self) -> str | None:
        try:
            linked = self._session.room_io.linked_participant
        except RuntimeError:
            return None
        return linked.identity if linked is not None else None

    async def _switch(self, identity: str) -> None:
        async with self._lock:
            if self._switched_to == identity:
                _log(
                    "coach_switch_skipped", identity=identity, reason="already_switched"
                )
                return
            if self._switched_to is not None:
                logger.warning(
                    json.dumps(
                        {
                            "event": "coach_switch_skipped",
                            "kept": self._switched_to,
                            "ignored": identity,
                        }
                    )
                )
                return
            started = time.perf_counter()
            self._session.room_io.set_participant(identity)
            set_ms = (time.perf_counter() - started) * 1000
            _log(
                "set_participant",
                identity=identity,
                linked_identity=self._linked_identity(),
                latency_ms=round(set_ms, 2),
            )
            await self._agent.update_instructions(CLICKER_INSTRUCTIONS)
            _log("update_instructions", mode="clicker")
            await self._room.local_participant.set_attributes({"mode": "clicker"})
            self._switched_to = identity
            total_ms = (time.perf_counter() - started) * 1000
            _log(
                "mode_set",
                mode="clicker",
                identity=identity,
                switch_latency_ms=round(total_ms, 2),
            )


class Assistant(Agent):
    def __init__(self, commander: SlideCommander | None = None) -> None:
        self._commander = commander
        super().__init__(instructions=PRESENTER_INSTRUCTIONS)

    @function_tool(description=SHOW_SLIDE_DESCRIPTION)
    async def show_slide(
        self,
        slide_id: Annotated[SlideId, Field(description=SHOW_SLIDE_DESCRIPTION)],
    ) -> str:
        if self._commander is None:
            return "FAILED: slide not shown (commander missing). Do not describe it as on screen."
        return await self._commander.show_slide(slide_id)


def _on_realtime_availability(ev: RealtimeAvailabilityChangedEvent) -> None:
    logger.info(
        "realtime_availability_changed model=%s provider=%s available=%s",
        ev.realtime_model.model,
        ev.realtime_model.provider,
        ev.available,
    )


def _on_conversation_item_added(ev: ConversationItemAddedEvent) -> None:
    item = ev.item
    if not isinstance(item, ChatMessage):
        _log(
            "conversation_item_added",
            item_type=getattr(item, "type", type(item).__name__),
        )
        return
    _log(
        "conversation_item_added",
        role=item.role,
        text=item.text_content,
        interrupted=item.interrupted,
    )


def _on_function_tools_executed(ev: FunctionToolsExecutedEvent) -> None:
    for call, output in ev.zipped():
        _log(
            "function_tools_executed",
            name=call.name,
            arguments=call.arguments,
            output=output.output,
            is_error=output.is_error,
        )


def _on_user_input_transcribed(ev: UserInputTranscribedEvent) -> None:
    if not ev.is_final:
        return
    _log(
        "user_input_transcribed",
        transcript=ev.transcript,
        speaker_id=ev.speaker_id,
    )


def _on_session_close(ev: CloseEvent) -> None:
    error = ev.error
    _log(
        "session_close",
        reason=str(ev.reason),
        error=str(error) if error is not None else None,
    )


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
        "agent_name": AGENT_NAME,
    }

    if debug_enabled():
        # Spike 3 live driver: skip GPT Realtime so this job does not consume
        # inference credit. debug_probe calls SlideCommander directly.
        await run_debug_job(ctx, DebugSlideCommander(ctx.room))
        return

    if REALTIME_CONFIG is None:
        raise RuntimeError("realtime config missing outside CHALK_DEBUG")

    commander = SlideCommander(ctx.room)

    # GPT Realtime is turn-based speech-to-speech. The model's own turn
    # detection (semantic VAD by default) owns turn boundaries, so the
    # starter pipeline STT/TTS, TurnDetector, adaptive interruption, and
    # preemptive_generation were removed. Kept: noise cancellation on the
    # room audio input. Docs: https://docs.livekit.io/agents/models/realtime/openai
    # and https://docs.livekit.io/agents/logic/turns#realtime-models
    llm = build_realtime_model(REALTIME_CONFIG)
    logger.info("realtime providers=%s", ",".join(REALTIME_CONFIG.providers))
    if isinstance(llm, RealtimeModelFallbackAdapter):
        llm.on("realtime_availability_changed", _on_realtime_availability)

    session = AgentSession(
        llm=llm,
    )
    assistant = Assistant(commander)

    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
        ),
    )

    session.on("conversation_item_added", _on_conversation_item_added)
    session.on("function_tools_executed", _on_function_tools_executed)
    session.on("user_input_transcribed", _on_user_input_transcribed)
    session.on("close", _on_session_close)

    CoachSwitcher(session, assistant, ctx.room).attach()

    await ctx.connect()
    await present_opening_slide(session, commander, ctx.room)


if __name__ == "__main__":
    cli.run_app(server)
