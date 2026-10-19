# 01 — Setup: agent and web from starters, env, local run

## Goal
A Python agent (from `agent-starter-python`) and a Next.js app (from `agent-starter-react`) run locally against the `chalk-talk` LiveKit Cloud project, and a browser tab talks to the agent by voice.

## Context
- Product: `docs/PRODUCT.md` (read "Who is in the room" only)
- Contract: `docs/ARCHITECTURE.md#components`, `#token-route` (read only; the token route is task 05)
- Decision: `DECISIONS.md` ADR-002 (GPT Realtime), ADR-012 (Python), ADR-013 (hosting), ADR-022 (token route comes later)
- Risks: `docs/RISKS.md#risk-6-token-route-production-guard`
- Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env` into your worktree root, and into `web/.env.local`. It holds `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY`, `AGENT_NAME`. Never commit either file. Never print values.
- LiveKit docs: use the LiveKit docs MCP, or `lk docs search|get-page|code-search`. Skill: `.agents/skills/building-livekit-agents`.

## Scope
- `agent/`: create with `lk agent init agent --template agent-starter-python` (if it prompts, clone https://github.com/livekit-examples/agent-starter-python into `agent/` and delete its `.git`). `uv sync`.
  - Model: `openai/gpt-realtime-2.1` through LiveKit Inference (check the exact Python form in the realtime models doc: `inference.RealtimeModel(model=...)` or a model string). Keep the OpenAI plugin as a commented fallback only if the starter shows it.
  - Register with an explicit agent name read from `AGENT_NAME` (explicit dispatch; check the agent-dispatch doc for the Python field).
  - Instructions: one short paragraph: "You are the Warriors' assistant coach before Game 7 of the 2016 NBA Finals. Greet the player in one sentence." No tools yet. No facts.
  - Keep the starter's VAD/turn setup unless it conflicts with a realtime model; note what you kept.
- `web/`: clone https://github.com/livekit-examples/agent-starter-react into `web/`, delete its `.git`, `pnpm install`.
  - Configure the starter so it dispatches `AGENT_NAME` (use the starter's own config mechanism; check its README).
  - Do not rewrite the token route. Do not add pages. Leave the production guard as is (task 05 replaces the route).
- Root: add `Makefile` (or `justfile`, pick one) with `agent-dev`, `web-dev`, `agent-test`, `web-lint`, `web-typecheck`. Update the `## Commands` section of `AGENTS.md` with the real commands.
- `.gitignore`: make sure `agent/.venv`, `web/.next`, `web/node_modules` and any `.env.local` are ignored. Check with `git status`.

## Out of scope
- Slides, tools, RPC, deck data, styling, token route changes, deploy.

## Steps
1. Scaffold `agent/`, set model and agent name, `uv sync`, run the starter's tests.
2. Scaffold `web/`, set dispatch, `pnpm install`, lint, typecheck.
3. Run `lk agent dev` (or the starter's dev command) and `pnpm dev`. Open the app, allow the mic, say hello.
4. Confirm in the agent log: job received for a room, the participant joined, the realtime session started, the agent spoke.
5. Commit in small steps (one for agent scaffold, one for web scaffold, one for commands/docs).

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Agent deps install and tests pass | `cd agent && uv sync && uv run pytest` | output tail |
| Web lint and typecheck pass | `cd web && pnpm lint && pnpm exec tsc --noEmit` | output tail |
| Agent registers with explicit name | agent dev log | log line with the agent name |
| Voice round trip works | browser tab, say "hello" | agent log lines for job, session start, and the agent's reply transcript; screenshot of the page connected |
| Model is gpt-realtime-2.1 | grep the agent code | the line, plus the doc page you checked it against |
| No secrets committed | `git status`, `git diff --cached` before each commit; `~/.agents/skills/hackathon-playbook/scripts/secret_scan.sh` | scan output |

## Checklist
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed:
  - `agent/` from `lk agent init agent --template agent-starter-python` (no nested `.git`). Customized `agent/src/agent.py` for `inference.RealtimeModel(model="openai/gpt-realtime-2.1")`, `agent_name` from `AGENT_NAME`, short Warriors coach instructions, `generate_reply` greeting. Dropped starter STT/TTS/TurnDetector (conflicts with GPT Realtime). Kept ai-coustics noise cancellation.
  - `agent/tests/test_agent.py` smoke tests (starter pytest file was fully commented; bare `pytest` exited 5).
  - `agent/.env.example` now includes `AGENT_NAME=chalk-talk-agent`. `agent/uv.lock` committed.
  - `web/` cloned from `agent-starter-react`, nested `.git` deleted. Dispatch via starter `agentName={process.env.AGENT_NAME}` in `web/app/page.tsx`. Token route **not** rewritten (production guard left as-is).
  - `web/.env.example` `AGENT_NAME=chalk-talk-agent`.
  - Root `Makefile` (`agent-dev`, `web-dev`, `agent-test`, `web-lint`, `web-typecheck`).
  - `AGENTS.md` Commands block (task 01), `README.md` Run locally, `LEARNINGS.md`.
  - Not committed: `.env`, `agent/.env.local`, `web/.env.local`, `agent/.venv`, `web/node_modules`, `web/.next`.
- Commands run and key output:
  - `lk agent init agent --template agent-starter-python --install=false --skills=false --yes` — created `agent/` against project `chalk-talk`.
  - `cd agent && uv sync` — livekit-agents 1.8.8, 79 packages.
  - `cd agent && uv run ruff check src tests` — All checks passed.
  - `cd agent && uv run pytest -v` — `2 passed` (`test_explicit_dispatch_name_is_set`, `test_assistant_greets_as_warriors_coach`).
  - `cd web && pnpm install` — 758 packages, pnpm 9.15.9 (from packageManager).
  - `cd web && pnpm lint && pnpm exec tsc --noEmit` — lint exit 0 (2 starter warnings in agents-ui visualizers, not touched); tsc exit 0.
  - `lk agent dev --deployment production --log-level INFO` (CLI 2.19 registers a random `dev-` deployment by default; no cloud agent exists, so production was used).
    - `registered worker {"agent_name": "chalk-talk-agent", "deployment": "", ...}`
    - `received job request {"job_id": "AJ_sQUy3CdV2W5q", "room": "voice_assistant_room_6744", "agent_name": "chalk-talk-agent", ...}`
    - `RoomIO linked to participant {"lk.pii.participant_identity": "voice_assistant_user_3296", "lk.pii.room_name": "voice_assistant_room_6744", ...}`
  - `cd web && pnpm dev` — Ready at http://localhost:3000.
  - Browser: START CALL connected to LiveKit Cloud; text box "hello" (no mic in this environment). UI transcript:
    - Agent: "Hey, let’s lock in—this is your moment, and we’ve got your back every second out there."
    - User: "hello"
    - Agent: "Hey, welcome in—take a breath, and let’s focus on what we can control tonight."
  - `bash ~/.agents/skills/hackathon-playbook/scripts/secret_scan.sh` — no key patterns; no `.env` tracked. Flags existing tracked `AGENTS.md` / `CLAUDE.md` / `.agents/` / `.claude/` (pre-existing, not secrets).
- Not done / not verified:
  - Spoken mic turn: this preview has no usable microphone. Round trip was live-room **text** chat, not voice. Debugger was not needed after the live room connected.
  - Worker INFO logs do not print the assistant transcript; transcript evidence is the web UI. Job + RoomIO link are in the agent log.
  - `lk agent debugger` not run (live room already showed a full turn).
  - Did not deploy (`lk agent create`) or change the token route.
  - First job warned ~918ms blocked importing `openai.types.realtime`; not prewarmed this task.
- Branch: `t3/project-setup`
- Commits (`git log --oneline main..HEAD`):
  - `56348de` Add Makefile and document local agent and web commands.
  - `29e3798` Scaffold Next.js web app from LiveKit React starter.
  - `f597826` Scaffold Python agent from LiveKit starter with GPT Realtime.
  - plus this report/learnings commit.

### Acceptance evidence
| Check | Result |
|---|---|
| Agent deps + tests | `uv sync` ok; `uv run pytest -v` **2 passed** |
| Web lint + typecheck | `pnpm lint` exit 0 (2 starter warnings); `tsc --noEmit` exit 0 |
| Explicit agent name | `registered worker {"agent_name": "chalk-talk-agent", ...}` |
| Round trip | job `AJ_sQUy3CdV2W5q` for `voice_assistant_room_6744`; `RoomIO linked`; UI transcript of greeting + "hello" + reply. Screenshots: welcome, connected listening, hello turn. |
| Model | `agent/src/agent.py` `model="openai/gpt-realtime-2.1"` against https://docs.livekit.io/agents/models/realtime/openai (`inference.RealtimeModel(model="openai/gpt-realtime-2.1", voice="marin")`) |
| No secrets | `.env*` ignored; scan found no key patterns in history |

Screenshots (not committed):
- `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf1y0dy-c1fe1911.png` (welcome)
- `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf1ybsk-67014f5a.png` (connected)
- `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf1z9fn-943a7121.png` (hello turn)

