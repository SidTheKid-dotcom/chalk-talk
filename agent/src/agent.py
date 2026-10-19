import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit.plugins import ai_coustics

from debug_probe import DebugSlideCommander, debug_enabled, run_debug_job
from deck_data import SlideId, assert_slide_ids_match_deck
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


class Assistant(Agent):
    def __init__(self, commander: SlideCommander | None = None) -> None:
        self._commander = commander
        super().__init__(
            instructions=(
                "You are the Warriors' assistant coach before Game 7 of the 2016 NBA "
                "Finals. Greet the player in one sentence. "
                "Call show_slide before you speak about a slide."
            ),
        )

    @function_tool
    async def show_slide(self, slide_id: SlideId) -> str:
        """Show this slide on the player's board before you speak about it."""
        if self._commander is None:
            return "FAILED: slide not shown (commander missing). Do not describe it as on screen."
        return await self._commander.show_slide(slide_id)


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

    commander = SlideCommander(ctx.room)

    # GPT Realtime is turn-based speech-to-speech. The model's own turn
    # detection (semantic VAD by default) owns turn boundaries, so the
    # starter pipeline STT/TTS, TurnDetector, adaptive interruption, and
    # preemptive_generation were removed. Kept: noise cancellation on the
    # room audio input. Docs: https://docs.livekit.io/agents/models/realtime/openai
    # and https://docs.livekit.io/agents/logic/turns#realtime-models
    session = AgentSession(
        llm=inference.RealtimeModel(
            model="openai/gpt-realtime-2.1",
            voice="marin",
        ),
    )

    await session.start(
        agent=Assistant(commander),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
        ),
    )

    await ctx.connect()

    await session.generate_reply(
        instructions="Greet the player in one sentence.",
    )


if __name__ == "__main__":
    cli.run_app(server)
