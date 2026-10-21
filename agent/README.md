# Chalk Talk agent

Python worker for Chalk Talk. It joins a LiveKit Cloud room as Floppy and drives the six-slide board with GPT Realtime.

The session is built in `src/agent.py` and `src/model.py`:

- `REALTIME_PROVIDERS` defaults to `openai,inference`. One provider returns that realtime model. Two return `RealtimeModelFallbackAdapter` in that order.
- `REALTIME_MODEL` defaults to `gpt-realtime-2.1`. Voice is `marin`. An Inference id without a slash is sent as `openai/<id>`.
- `OPENAI_API_KEY` is required when `openai` is in the provider list.
- `AGENT_NAME` is required. It is the explicit-dispatch name.
- `NEXT_PUBLIC_APP_URL` is required for the coach join link.
- There is no STT-LLM-TTS pipeline in the session. The `livekit-plugins-ai-coustics` dependency is not used by `src/`.

Env files: `src/agent.py` loads `agent/.env.local`, then the repo-root `.env`. The first value wins.

```bash
uv sync
# from the repo root
make agent-dev    # lk agent dev --deployment ${LIVEKIT_AGENT_DEPLOYMENT:-production}
make agent-test   # uv run pytest
```

`CHALK_DEBUG=1` skips realtime credential checks and the GPT session and registers `debug_probe`. `CHALK_SESSION_DEBUG=1` logs transcripts on a normal session.

The worker is local. This folder has a `Dockerfile` and no `livekit.toml`. See the repo-root `README.md` and `DECISIONS.md` ADR-013.

`scenarios.yaml` is leftover starter scenarios. They are not the Game 7 deck, and no simulations workflow in this repo runs them.
