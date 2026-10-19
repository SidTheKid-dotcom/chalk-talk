# 08 — Realtime model: OpenAI plugin first, LiveKit Inference fallback

## Goal
The agent and the eval harness build their realtime model from one factory: a `RealtimeModelFallbackAdapter` over an ordered provider list from `REALTIME_PROVIDERS` (default `openai,inference`). The OpenAI plugin with our key serves every session unless it fails; then LiveKit Inference takes over with chat context kept.

## Context
- Decision: `DECISIONS.md` ADR-024 (amends ADR-002)
- Risks: `docs/RISKS.md#risk-5-free-tier-quota`
- Docs: OpenAI plugin section of https://docs.livekit.io/agents/models/realtime/openai (install `livekit-agents[openai]~=1.8`, `openai.realtime.RealtimeModel(model=..., voice=...)`, auth via `OPENAI_API_KEY`)
- Verified by planner: `gpt-realtime-2.1` and `gpt-realtime-2.1-mini` are available on our key (`/v1/models` returned 200).
- Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env` into the worktree root. It has `OPENAI_API_KEY`. Never commit or print it.

## Scope
- `agent/src/model.py`: `build_realtime_model()`.
  - Reads `REALTIME_PROVIDERS` (comma list, allowed `openai`, `inference`, default `openai,inference`) and `REALTIME_MODEL` (default `gpt-realtime-2.1`; the inference entry uses `openai/` + that id). Voice `marin` for both.
  - One provider: return that model directly. Two or more: return `livekit.agents.llm.RealtimeModelFallbackAdapter(models=[...])` in that order. Read its constructor in the installed package (`agent/.venv/.../livekit/agents/llm/realtime_fallback_adapter.py`): it requires matching capabilities, so configure both models so they agree (check turn detection defaults of each).
  - Unknown or empty provider raises a clear `ValueError`. `openai` in the list with no `OPENAI_API_KEY` raises at startup.
- `agent/src/agent.py`: use the factory. Log the provider order at session start (structured log line). Log `realtime_availability_changed` events from the adapter (check the event name and payload in the installed source).
- Add the plugin with `uv add "livekit-agents[openai]~=1.8"`. Check `openai.realtime.RealtimeModel` params in the installed source; do not guess.
- `.env.example` (root and `agent/`): add `REALTIME_PROVIDERS=openai,inference` and `REALTIME_MODEL=gpt-realtime-2.1`, one comment line each. No key values.
- Tests (no network): single provider returns the plain model class; two providers return the adapter with models in order; model strings correct; unknown provider and missing key raise; the adapter accepts the two configured models (no capability `ValueError`).
- `AGENTS.md` and `README.md`: one line each on the provider order and that evals pin `REALTIME_PROVIDERS=openai`.

## Out of scope
- Prompts, tools, RPC, web. The eval harness in `evals/spikes/` (task 04 adopts the factory when it resumes).

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Unit tests | `cd agent && uv run pytest -v` | output |
| Lint | `cd agent && uv run ruff check` | output |
| Live turn on OpenAI | `make agent-dev` + `make web-dev`, start call, typed "hello" in chat (no mic in the embedded browser) | agent log showing the OpenAI plugin session and the reply; screenshot |
| OpenAI serves by default | agent log | provider-order log line and the session served by the OpenAI plugin |
| Fallback works | run once with `OPENAI_API_KEY` set to an invalid value in the shell only (not in any file), `REALTIME_PROVIDERS=openai,inference`; type hello | log showing the OpenAI failure, the availability-changed event, and a reply served by Inference. Keep it to one turn. |
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
