import asyncio
import json
import logging
import os
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

from coach_switcher import (
    CoachLinkCommander,
    CoachSwitcher,
    HandoffState,
    find_by_role,
    participant_role,
)
from debug_probe import DebugSlideCommander, debug_enabled, run_debug_job
from deck_data import (
    FactId,
    PlayId,
    SlideId,
    TargetId,
    assert_slide_ids_match_deck,
    load_deck,
    load_facts,
)
from model import RealtimeConfig, build_realtime_model, load_realtime_config
from prompts import (
    add_callout_tool_description,
    call_head_coach_tool_description,
    highlight_tool_description,
    presenter_instructions,
    run_play_tool_description,
    show_slide_tool_description,
)
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
HIGHLIGHT_DESCRIPTION = highlight_tool_description(DECK)
RUN_PLAY_DESCRIPTION = run_play_tool_description(DECK)
ADD_CALLOUT_DESCRIPTION = add_callout_tool_description(FACTS)
CALL_HEAD_COACH_DESCRIPTION = call_head_coach_tool_description()


def load_worker_realtime_config() -> RealtimeConfig | None:
    """Validate realtime credentials at worker import, unless this is a debug probe."""
    if debug_enabled():
        return None
    return load_realtime_config()


REALTIME_CONFIG = load_worker_realtime_config()

CLICKER_INSTRUCTIONS = (
    "Do not present. Stay silent unless addressed as Assistant. "
    "Call show_slide when the humans move to a topic on another slide. "
    "When addressed, you may call highlight, run_play, or add_callout; "
    "run_play is also allowed when the humans clearly discuss a prepared play."
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


def load_app_url() -> str:
    app_url = os.environ.get("NEXT_PUBLIC_APP_URL")
    if not app_url:
        raise RuntimeError("NEXT_PUBLIC_APP_URL is required for coach join links")
    return app_url


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


class _SlideShower(Protocol):
    async def show_slide(self, slide_id: str) -> str: ...


def _log(event: str, **fields: object) -> None:
    logger.info(json.dumps({"event": event, **fields}))


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


class Assistant(Agent):
    def __init__(
        self,
        commander: SlideCommander | None = None,
        coach_link: CoachLinkCommander | None = None,
    ) -> None:
        self._commander = commander
        self._coach_link = coach_link
        super().__init__(instructions=PRESENTER_INSTRUCTIONS)

    @function_tool(description=SHOW_SLIDE_DESCRIPTION)
    async def show_slide(
        self,
        slide_id: Annotated[SlideId, Field(description=SHOW_SLIDE_DESCRIPTION)],
    ) -> str:
        if self._commander is None:
            return "FAILED: slide not shown (commander missing). Do not describe it as on screen."
        return await self._commander.show_slide(slide_id)

    @function_tool(description=HIGHLIGHT_DESCRIPTION)
    async def highlight(
        self,
        target: Annotated[TargetId, Field(description=HIGHLIGHT_DESCRIPTION)],
    ) -> str:
        if self._commander is None:
            return (
                "FAILED: highlight not shown (commander missing). "
                "Do not say it is highlighted."
            )
        return await self._commander.highlight(target)

    @function_tool(description=RUN_PLAY_DESCRIPTION)
    async def run_play(
        self,
        play_id: Annotated[PlayId, Field(description=RUN_PLAY_DESCRIPTION)],
    ) -> str:
        if self._commander is None:
            return (
                "FAILED: play not shown (commander missing). "
                "Do not describe it as on screen."
            )
        return await self._commander.run_play(play_id)

    @function_tool(description=ADD_CALLOUT_DESCRIPTION)
    async def add_callout(
        self,
        fact_id: Annotated[
            FactId | None, Field(default=None, description=ADD_CALLOUT_DESCRIPTION)
        ] = None,
        text: Annotated[
            str | None,
            Field(
                default=None,
                description=(
                    "Short coaching instruction. No digits or spelled-out numbers."
                ),
            ),
        ] = None,
    ) -> str:
        if self._commander is None:
            return "FAILED: callout not shown (commander missing)."
        return await self._commander.add_callout(fact_id, text)

    @function_tool(description=CALL_HEAD_COACH_DESCRIPTION)
    async def call_head_coach(self) -> str:
        if self._coach_link is None:
            return "FAILED: coach link not shown (commander missing)."
        return await self._coach_link.request_handoff()


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
    handoff_state = HandoffState()
    coach_link = CoachLinkCommander(ctx.room, load_app_url(), handoff_state)

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
    assistant = Assistant(commander, coach_link)

    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
            close_on_disconnect=False,
        ),
    )

    if os.environ.get("CHALK_SESSION_DEBUG") == "1":
        session.on("conversation_item_added", _on_conversation_item_added)
        session.on("function_tools_executed", _on_function_tools_executed)
        session.on("user_input_transcribed", _on_user_input_transcribed)

    switcher = CoachSwitcher(
        session,
        assistant,
        ctx.room,
        commander,
        handoff_state,
        presenter_instructions=PRESENTER_INSTRUCTIONS,
        clicker_instructions=CLICKER_INSTRUCTIONS,
    )
    switcher.attach()

    def _on_close(ev: CloseEvent) -> None:
        switcher.detach()
        _on_session_close(ev)

    session.on("close", _on_close)

    await ctx.connect()
    await present_opening_slide(session, commander, ctx.room)


if __name__ == "__main__":
    cli.run_app(server)
