# Progress

## Now
SPEED MODE (user records the demo tonight). One audit per task; fix rounds are verified by the planner, not re-audited. Cut: task 14 automated E2E driver, task 04 harness merge, status-panel metrics beyond "—".
Running: 12 Hardwood fixes, 13A handoff-core fixes (Grok 4.7). Next: merge 12 + 13A, then 13B (coach link + /coach page + briefing card; video rail only if cheap), then deploy (LiveKit Cloud agent + Vercel), README, Loom.

## Done
- Scaffold: agent guides, product spec, architecture contracts, decisions, risks, references, facts template.
- `lk` CLI installed and authed to project `chalk-talk`. LiveKit agent skills and docs MCP config added.
- `[UNVERIFIED]` pass on ARCHITECTURE and RISKS with `lk docs`. ADR-019 to ADR-022.
- Task files 01-07 written.
- 01 setup merged: agent on gpt-realtime-2.1 with explicit dispatch, web starter, Makefile. Spoken mic turn not yet verified (no mic in executor browser).
- 06 Spike 1 merged: coach audio switch works mid-session (0.66 ms, no realtime reset). ADR-025: coach leave returns to player; model judges 'addressed'.
- 07 UI lab merged: all six slides, coach view and primitives at /lab from deck data; marker overlap test.
- 03 Spike 3 merged: RPC ack after paint, median 117 ms; stale, error codes, hidden tab, agent restart, frozen tab bound all handled.
- 08 model merged: OpenAI plugin first, LiveKit Inference fallback (RealtimeModelFallbackAdapter). Inference credit likely spent (429).
- 05 token route merged: role in token, mic-only, coach room pattern, no human attribute edits, room timeouts and cap.
- 02 deck and facts merged: 19 facts re-verified by auditor, 6 slides, 4 plays, 25 deck tests incl. basketball sanity rules.
- 09 presenter merged: deck-generated routing and grounded tool results; acked slide 1 before greeting; startup race retries; 70 agent tests plus provider-backed behavior checks; second audit PASS.
- 10 player page merged: Scouting Packet start/live/ended states, real RPC deck, captions and typed fallback; 49 web tests, six-slide overlap check and second audit PASS.
- 11 board tools merged: locked shared seq, acked highlight/play/callout state, guarded claims and deck-driven play motion; 99 agent tests, 72 web tests, live mid-motion evidence and second audit PASS.

## Next
| Wave | Tasks | Gate |
|---|---|---|
| 0 | 01 setup, 02 deck and facts | none |
| 1 | 03 spike RPC, 04 spike tool order, 05 token route, 07 UI lab | 01 and 02 merged |
| 1b | 06 spike coach audio | 03 and 05 merged |
| 2 | presenter agent, /player slides | spikes pass or fallbacks chosen |
| 3 | board tools, handoff + /coach, status panel, eval | wave 2 |
| 4 | deploy | wave 3 |
| 5 | freeze: E2E, README, secret scan, UI audit, Loom | deploy |

## Blocked
- Task 04 harness merge: fix multi-tool scoring, reconcile metric labels/manual-review evidence, clear ruff, and complete the human audio/interruption checks.

## Handoff task must include (audit 06)
- `RoomOptions(close_on_disconnect=False)`; on coach leave clear the switched state, `set_participant(player)` by role, restore presenter mode (ADR-025).
- Switch order per ARCHITECTURE: briefing, handoff line, clicker instructions, `mode` attribute, `set_participant` last; or roll back on failure.
- Attributes-changed handler only on `changed_attributes["role"] == "coach"`.
- Move `CoachSwitcher`, `find_by_role`, `participant_role` to `agent/src/coach_switcher.py`; `SlideCommander.find_player` uses `find_by_role`. Move the four debug `session.on` loggers out of `agent.py` or behind debug (they log transcripts at INFO).
- Tests: attributes-changed path, coach present at attach, second coach after leave, failing `update_instructions` logged; add `drain()` instead of reading `_tasks`.

## Lane B (task 13) must include (audit 13A)
- Live check: speaker change, then "Assistant, ..." command. The floor router may clip the first words of a new speaker (active-speaker detection + debounce + new stream). If the command is lost, take the ADR-028 fallback (coach-only ear after handoff).
- README known limit: if the briefing or handoff line fails, the coach is ignored until they rejoin.

## Ship checklist (collected from audits)
- BEFORE ANY PUBLIC PUSH: git history contains a private name and a private Loom link (commits from the Hardwood planning, e.g. `44e82be`). Current files are clean. Rewrite or squash history before the first push to a public remote, then run `secret_scan.sh` and `git log -p | grep -i -E '<private terms>'` to confirm.
- README Known limits: coach link is a bearer link (anyone with it joins as coach); no rate limit on the token route; free-tier cold start and minute caps.
- Vercel: set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `AGENT_NAME` for build and runtime (page checks env at build).
- LiveKit Cloud agent: `AGENT_NAME` must be a secret (`lk agent secrets`), or the worker crash-loops.
- After `lk agent create`: local dev must stop using `--deployment production` (set `LIVEKIT_AGENT_DEPLOYMENT`).
- Agent: cap session length (cost guard).
- Agent nits from audit 08: log `__qualname__` and each fallback model id; parse providers once; validate providers and key at worker start, not per job; comment on tests reading `_models`.
- /player: show a clear message when the agent session ends on error (all realtime models failed).
- /player: featured fact card must not cover the Photo credits link (license), cutouts or court markers; move it into the left column. Coach view: BRIEFING stamp collides with the binder clip.
- `CHALK_DEBUG` must not be set in `lk agent secrets` or any deploy config (enables the debug_probe RPC).
- Decide whether planning files (`CLAUDE.md`, `AGENTS.md`, `.claude/`, `.agents/`, `docs/plan/`) stay public.
