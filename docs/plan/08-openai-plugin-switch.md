# 08 — Realtime model via the OpenAI plugin, with a provider switch

## Goal
The agent and the eval harness build their realtime model from one factory. The default is the OpenAI plugin with our key (`gpt-realtime-2.1`). `MODEL_PROVIDER=inference` switches back to LiveKit Inference.

## Context
- Decision: `DECISIONS.md` ADR-024 (amends ADR-002)
- Risks: `docs/RISKS.md#risk-5-free-tier-quota`
- Docs: OpenAI plugin section of https://docs.livekit.io/agents/models/realtime/openai (install `livekit-agents[openai]~=1.8`, `openai.realtime.RealtimeModel(model=..., voice=...)`, auth via `OPENAI_API_KEY`)
- Verified by planner: `gpt-realtime-2.1` and `gpt-realtime-2.1-mini` are available on our key (`/v1/models` returned 200).
- Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env` into the worktree root. It has `OPENAI_API_KEY`. Never commit or print it.

## Scope
- `agent/src/model.py`: `build_realtime_model()` reads `MODEL_PROVIDER` (`openai` default, `inference`) and `REALTIME_MODEL` (default `gpt-realtime-2.1`; for inference prefix `openai/`). Voice `marin` for both. Unknown provider raises a clear error. Missing `OPENAI_API_KEY` with provider `openai` raises a clear error at startup, not mid-call.
- `agent/src/agent.py`: use the factory. Nothing else changes.
- Add the plugin dependency with `uv add "livekit-agents[openai]~=1.8"`. Check the installed plugin's `RealtimeModel` signature with `lk docs code-search` or the installed source; do not guess.
- `.env.example` (root and `agent/`): add `MODEL_PROVIDER=openai` and `REALTIME_MODEL=gpt-realtime-2.1` with a one-line comment each. No values for keys.
- Tests (no network): factory returns the plugin class for `openai`, the inference class for `inference`, the right model string for each, and raises on unknown provider and on missing key.
- `AGENTS.md` and `README.md`: one line each on the switch.

## Out of scope
- Prompts, tools, RPC, web. The eval harness in `evals/spikes/` (task 04 adopts the factory when it resumes).

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Unit tests | `cd agent && uv run pytest -v` | output |
| Lint | `cd agent && uv run ruff check` | output |
| Live turn on OpenAI | `make agent-dev` + `make web-dev`, start call, typed "hello" in chat (no mic in the embedded browser) | agent log showing the OpenAI plugin session and the reply; screenshot |
| No Inference use on default | agent log or code path | log line or a test proving `openai` is the default |
| Clean shutdown | stop agent and web by PID; end the call | `lk room list` showing no leftover room from your run |

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
