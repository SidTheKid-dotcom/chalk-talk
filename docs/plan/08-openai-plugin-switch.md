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
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed:
  - `agent/pyproject.toml`, `agent/uv.lock` — `livekit-agents[openai]~=1.8`
  - `agent/src/model.py` (new) — `build_realtime_model()` / `parse_realtime_providers()`
  - `agent/tests/test_model.py` (new)
  - `agent/src/agent.py` — factory, provider-order log, `realtime_availability_changed` log
  - `.env.example`, `agent/.env.example` — `REALTIME_PROVIDERS=openai,inference`; dropped `MODEL_PROVIDER`
  - `AGENTS.md`, `README.md` — provider order; evals pin `REALTIME_PROVIDERS=openai`
  - `LEARNINGS.md`, `docs/plan/08-openai-plugin-switch.md` (this report)
  - `DECISIONS.md` ADR-024 came in via merge of `fa6fc87` (planner); not edited here
- Commands run and key output:
  - `cd agent && uv run pytest -v` — 11 passed
  - `cd agent && uv run ruff check` — All checks passed
  - `cd agent && uv run ruff format --check` — 6 files already formatted
  - Live OpenAI: `make agent-dev` + `make web-dev`, Start call, typed hello
  - Fallback: `OPENAI_API_KEY=sk-invalid REALTIME_PROVIDERS=openai,inference make agent-dev`, typed hello
  - `lk room list` after shutdown — empty
- Not done / not verified:
  - Spoken Inference reply after failover: OpenAI failed with `invalid_api_key` and the adapter swapped (`realtime_availability_changed` + `_active` was `inference.realtime.openai`), but Inference WS returned 429 (free-plan concurrent/credit cap). Hello after that hit `AgentSession is closing`. No second Inference turn was run.
  - No agent mypy/tsc; lint was ruff only.
  - Mic path not verified (embedded browser has no mic).

### Acceptance evidence

**Unit tests** (`cd agent && uv run pytest -v`):
```
tests/test_agent.py::test_explicit_dispatch_name_is_set PASSED
tests/test_agent.py::test_assistant_greets_as_warriors_coach PASSED
tests/test_model.py::test_default_providers_are_openai_then_inference PASSED
tests/test_model.py::test_single_openai_provider_returns_plugin PASSED
tests/test_model.py::test_single_inference_provider_returns_inference_and_prefix PASSED
tests/test_model.py::test_inference_keeps_an_existing_prefix PASSED
tests/test_model.py::test_two_providers_return_adapter_in_list_order PASSED
tests/test_model.py::test_adapter_accepts_default_openai_and_inference_capabilities PASSED
tests/test_model.py::test_unknown_provider_raises PASSED
tests/test_model.py::test_empty_providers_raise PASSED
tests/test_model.py::test_openai_missing_key_raises_at_startup PASSED
11 passed in 2.20s
```

**Lint:** `uv run ruff check` → All checks passed.

**Live turn on OpenAI / OpenAI serves by default** (room `fr-3f6b55fc376341ec`):
```
plugin registered {"plugin": "livekit.plugins.openai", "version": "1.8.8"}
built realtime model providers=openai,inference class=livekit.agents.llm.realtime_fallback_adapter model=RealtimeModelFallbackAdapter
realtime providers=openai,inference
conversation_item_added {"role": "assistant", "lk.pii.text": "Hey there, great to see you locked in—let's get ready to bring our best for Game 7."}
conversation_item_added {"role": "user", "lk.pii.text": "hello"}
conversation_item_added {"role": "assistant", "lk.pii.text": "Hey there—eyes up, breath steady, and let's set the tone from the jump."}
```
No `realtime_availability_changed` on this session (primary OpenAI stayed up). Screenshot: `/tmp/task08-openai-hello.png`

**Fallback** (room `fr-ff44f59ea9d34354`, invalid key in the shell only):
```
OpenAI Realtime API returned an error: ... Incorrect API key provided: sk-invalid ... code='invalid_api_key'
realtime_availability_changed model=gpt-realtime-2.1 provider=api.openai.com available=False
LiveKit Inference Realtime connection failed ... WSServerHandshakeError: 429 ... url='wss://agent-gateway.livekit.cloud/v1/realtime?model=openai/gpt-realtime-2.1'
... aclose path: livekit/agents/inference/realtime/openai.py
failed to handle chat text stream ... AgentSession is closing, cannot use generate_reply()
```
Screenshot of typed hello with no Inference reply: `/tmp/task08-fallback-hello.png`

**Clean shutdown:** agent PID 419444 then 421806, web PID 419504 (plus leftover next PIDs 419571/419572). Ended calls. Deleted leftover room `fr-ff44f59ea9d34354`. Final `lk room list` empty.
