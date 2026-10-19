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
- [ ] Implemented
- [ ] Lint and typecheck pass
- [ ] Tests pass (list)
- [ ] Acceptance checks pass with evidence
- [ ] Screenshots attached (UI tasks)
- [ ] LEARNINGS.md updated (if any surprise)
- [ ] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed:
- Commands run and key output:
- Not done / not verified:
