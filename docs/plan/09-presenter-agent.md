# 09 — Presenter agent: deck-driven prompt, grounded show_slide, slide 1 on start

## Goal
In presenter mode the agent shows slide 1 on start, routes questions to the right slide with a content-free lead-in at most, and narrates only from the slide's points, notes and verified facts returned by `show_slide`.

## Context
- Product: `docs/PRODUCT.md#slides`, `#demo-script` (steps 1-2), `#hidden-depth-panel` (not built here)
- Contract: `docs/ARCHITECTURE.md#agent-tools` (show_slide result), `#agent-modes-and-the-switch` (presenter row), `#tools-by-mode`
- Decisions: ADR-006, ADR-011, ADR-024, ADR-026 (lead-in rule, grounding, topic list in tool descriptions)
- Spike 2 evidence: `LEARNINGS.md` lines tagged `[spike 2]`
- Mistakes: `docs/MISTAKES-TO-AVOID.md` rows 7, 8, 19, 20
- Skills: `.agents/skills/building-livekit-agents/SKILL.md`, `.agents/skills/testing-livekit-agents/SKILL.md`

## Scope
- `agent/src/prompts.py` (new): `presenter_instructions(deck, facts)` builds the system prompt from deck data, not hand-written slide copy (MISTAKES row 19). Contents in substance:
  - Role: Warriors assistant coach, pre-game film room before Game 7 of the 2016 Finals. Never state the Game 7 result, the series winner or the Finals MVP.
  - Rule: call `show_slide` before speaking about a slide. At most one short lead-in before the tool (examples: "One sec, pulling up the LeBron plan."). Before the tool result: no plan content, assignments, play steps, facts or numbers.
  - Rule: after the tool result, speak only from the returned points, notes and fact claims. Numbers only from returned fact claims. If the result starts with `FAILED:`, say the slide could not be shown and do not describe it.
  - Slide-6 topics: offer the head coach (the `call_head_coach` tool comes in task 13; for now say the head coach owns late-game calls).
  - Short spoken answers (voice): two to four sentences, then invite the next question.
  - No "use tools aggressively" or filler (MISTAKES row 19).
- `show_slide` tool: the `slide_id` description lists every slide id with its title and topics, generated from deck data (fix for "push the pace" going to s1). Add a `topics` field per slide to `deck/deck.json` + `deck/schema.json` if needed (sync copies with `scripts/sync_deck.py`, add a schema test), or derive topics from existing fields; say which.
- `show_slide` tool result on ack: slide title, points, notes, and the claim text of each `fact_id` on the slide (from `facts.json`), plus the slide's board menu (targets and play titles) for later tasks. Keep it compact.
- On session start: show `s1_tipoff` through the real `SlideCommander` path, then greet and present slide 1 per the prompt. Replace the current one-sentence greeting.
- Audit 08 nits: log the realtime model class with `__qualname__` and each fallback model id; parse providers once; validate `REALTIME_PROVIDERS`, `REALTIME_MODEL` and the OpenAI key at worker start (module level or `__main__`), not per job.
- Tests (pytest, no network): prompt contains every slide id and title from deck data and no digits except from fact claims; tool description lists topics; tool result contains points, notes and fact claims; FAILED path returns the failure string unchanged.
- Behavior tests with the LiveKit test harness (`testing-livekit-agents` skill), text input, `REALTIME_PROVIDERS=openai`, kept small (at most 8 turns per run): "Give me the big picture" -> s1; "Should we push it or slow it down?" -> s5; "How do we stop LeBron?" -> s2; "What about the other guy who scores from anywhere?" -> s3; one grounding check: after s2 the reply names Iguodala as the primary (from the slide points) and invents no numbers. Use the SDK's judge helpers if available; check the API in the installed version.

## Out of scope
- Board tools (`highlight` already exists in SlideCommander; do not expose new tools), `call_head_coach`, coach switch changes, web.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Unit tests | `cd agent && uv run pytest -q && uv run ruff check` | output |
| Behavior tests | the harness tests above, 2 runs | per-item pass/fail table, transcript of the s2 turn |
| Slide 1 on start | `make agent-dev` + `make web-dev`, Start call, type "hello" | agent log: show_slide s1_tipoff applied before the first assistant message; screenshot |
| Pace routing | live typed "Should we push the pace?" | log show_slide s5_xfactors |
| Config fails at start | `REALTIME_PROVIDERS=bogus make agent-dev` | error before worker registers |
| Shutdown | stop PIDs, `lk room list` | empty list |

## Checklist
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence (audit 09 live startup order verified; see room-list and microphone limits below)
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed: `agent/src/agent.py`, `agent/src/deck_data.py`, `agent/src/model.py`, `agent/src/prompts.py`, presenter/model/commander tests, `deck/deck.json`, `deck/schema.json`, generated deck copies, `scripts/test_deck.py`, `README.md`, and `LEARNINGS.md`.
- Audit 09 follow-up files: `agent/src/agent.py` (startup wait/retry + FAILED-only greeting + debug skip), `agent/tests/conftest.py`, `agent/tests/test_agent.py`, `agent/tests/test_presenter_behavior.py`, `agent/tests/test_model.py`, `deck/deck.json` + synced copies, `scripts/test_deck.py`, `README.md`, `LEARNINGS.md`.
- Commands run and key output:
  - `cd agent && uv run pytest -q`: 70 passed, 2 provider-backed tests skipped by default.
  - `cd agent && uv run ruff check`: all checks passed.
  - `uv run --with pytest --with jsonschema pytest scripts -q`: 31 passed.
  - `python3 scripts/sync_deck.py --check`: sync check passed.
  - `CHALK_DEBUG=1 OPENAI_API_KEY= ... uv run python -c "from agent import REALTIME_CONFIG"`: `debug_import_ok`; REALTIME_CONFIG is None.
  - Same import without CHALK_DEBUG: `ValueError: OPENAI_API_KEY is required...` at module import, before worker registration.
  - Provider-backed LiveKit harness, `RUN_AGENT_BEHAVIOR_TESTS=1 REALTIME_PROVIDERS=openai`, two fresh sessions: 2 passed. Event order on every turn was `message, function_call, function_call_output, message`. Pre-tool lead-ins were content-free and <=20 words. Post-tool answers were non-empty. Both `s2_lebron` post-tool replies named Iguodala and used no unreturned numbers.
  - Live room `fr-fbb16c11fdaa4336`: `startup_player_wait found=true identity=player-5a025ab664`; `rpc_roundtrip show_slide seq=1 applied=true` (155.0 ms); `startup_slide attempt=1 applied=true`; then first assistant message. No duplicate tool call.
  - Screenshot: homepage deck placeholder after ack, `slide: Tip-off: tonight and the three keys`, `seq: 1`.
- Not done / not verified: microphone audio was unavailable in the headless browser. Chat input stayed disabled, so this audit live check used Start call only (startup order), not a typed pace turn. `/player` is not on this branch (task 10). Local task-owned agent/web PIDs were stopped and room `fr-fbb16c11fdaa4336` was deleted. Final `lk room list` was empty.
- Unresolved: none of the four audit findings remain. `opencode.json` is still a pre-existing uncommitted local change and was not touched.
