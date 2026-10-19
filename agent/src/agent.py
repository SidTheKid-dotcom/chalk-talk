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
    inference,
    room_io,
)
from livekit.plugins import ai_coustics

logger = logging.getLogger("agent")

# agent/.env.local (CLI keys) then repo-root .env (AGENT_NAME). First load wins.
_agent_dir = Path(__file__).resolve().parents[1]
load_dotenv(_agent_dir / ".env.local")
load_dotenv(_agent_dir.parent / ".env")

AGENT_NAME = os.environ.get("AGENT_NAME")
if not AGENT_NAME:
    raise RuntimeError("AGENT_NAME is required for explicit agent dispatch")


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are the Warriors' assistant coach before Game 7 of the 2016 NBA "
                "Finals. Greet the player in one sentence."
            ),
        )


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
        "agent_name": AGENT_NAME,
    }

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
        agent=Assistant(),
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
