# Chalk Talk

Chalk Talk is a voice AI assistant coach. It walks a Warriors player through a six-slide game plan for Game 7 of the 2016 NBA Finals. The slides follow your questions, and you can cut the coach off at any time. When you ask for the head coach, a real person joins the call from a phone, gets a private briefing, and takes over while the AI runs the slides.

**Status: work in progress.** This README only describes what is built and verified. Sections below are filled in as the work lands.

## What it does
- Opens on the acked tip-off slide before the assistant speaks.
- Routes natural questions to one of six prepared slides from deck-owned topics.
- Grounds each spoken answer in the selected slide's points, notes, and verified fact claims.
- Keeps slide state in LiveKit participant attributes so reconnecting viewers can recover it.

## Try it
_Live link and demo video: to be added._

## Run locally
Secrets live in `.env` (repo root) and `web/.env.local`. Copy them from the private machine env; never commit them.

```bash
cd agent && uv sync
cd web && pnpm install
make agent-dev      # cd agent && lk agent dev --deployment ${LIVEKIT_AGENT_DEPLOYMENT:-production}
make web-dev        # http://localhost:3000
make agent-test
make web-lint
make web-typecheck
```

Once a cloud agent exists (`lk agent create`), a local worker on production takes real traffic. Set `LIVEKIT_AGENT_DEPLOYMENT` then.

`AGENT_NAME` must match on the agent (`@server.rtc_session(agent_name=...)`) and in the player token's explicit dispatch. `POST /api/token` mints short-lived player and coach tokens with a `role` attribute. A missing `LIVEKIT_URL` fails loudly; there is no homepage-agent fallback. The realtime model uses `REALTIME_PROVIDERS=openai,inference` by default (OpenAI plugin first, LiveKit Inference fallback). Evals pin `REALTIME_PROVIDERS=openai`. `CHALK_DEBUG=1` skips realtime credential checks and the GPT session so the RPC probe can run without an OpenAI key.

## Architecture
_Diagram and summary: to be written. Design contracts live in `docs/ARCHITECTURE.md`._

## Decisions
See `DECISIONS.md`.

## Known limits
_To be written._
