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
  - Slide-6 topics: offer the head coach (the `call_head_coach` tool comes in task 12; for now say the head coach owns late-game calls).
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
- [ ] Acceptance checks pass with evidence (live typed path passed; see room-list and microphone limits below)
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed: `agent/src/agent.py`, `agent/src/deck_data.py`, `agent/src/model.py`, `agent/src/prompts.py`, presenter/model/commander tests, `deck/deck.json`, `deck/schema.json`, generated deck copies, `scripts/test_deck.py`, `README.md`, and `LEARNINGS.md`.
- Commands run and key output:
  - `cd agent && uv run pytest -q`: 56 passed, 2 provider-backed tests skipped by default.
  - `cd agent && uv run ruff check`: all checks passed.
  - `uv run --with pytest --with jsonschema pytest scripts -q`: 29 passed.
  - `python3 scripts/sync_deck.py --check`: sync check passed.
  - Provider-backed LiveKit harness, `REALTIME_PROVIDERS=openai`, two fresh sessions: 2 passed; all eight routing items selected the expected slide. Both `s2_lebron` replies named Iguodala and used no unreturned numbers.
  - `REALTIME_PROVIDERS=bogus ... lk agent dev --deployment production`: import failed on the unknown provider before `registered worker` appeared.
  - Live room: startup log order was applied `show_slide(s1_tipoff)` seq 1, `startup_slide`, then the first assistant message; no duplicate tool call. Typed `Should we push the pace?` applied `show_slide(s5_xfactors)` and rendered slide 5.
  - Screenshots captured for the acked opening slide and the live slide-5 pace route.
  - Local agent and task-owned web PIDs were stopped. `lk room list` later showed one different active room from concurrent work, so it was not deleted.
- Not done / not verified: microphone audio was unavailable in the headless browser, so live input used the typed text path. The final account-wide room list was not empty because another concurrent session created a different room after this task's room closed; no unrelated room was terminated.
