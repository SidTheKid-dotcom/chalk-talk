# Progress

## Now
Merged (audited): 01, 02, 03 (Spike 3 PASS), 05, 08. Running: 04 Spike 2 tool order (OpenAI), 06 Spike 1 coach audio (TTS clips via lk room join), 07 round 2 (layout).

## Done
- Scaffold: agent guides, product spec, architecture contracts, decisions, risks, references, facts template.
- `lk` CLI installed and authed to project `chalk-talk`. LiveKit agent skills and docs MCP config added.
- `[UNVERIFIED]` pass on ARCHITECTURE and RISKS with `lk docs`. ADR-019 to ADR-022.
- Task files 01-07 written.
- 01 setup merged: agent on gpt-realtime-2.1 with explicit dispatch, web starter, Makefile. Spoken mic turn not yet verified (no mic in executor browser).
- 03 Spike 3 merged: RPC ack after paint, median 117 ms; stale, error codes, hidden tab, agent restart, frozen tab bound all handled.
- 08 model merged: OpenAI plugin first, LiveKit Inference fallback (RealtimeModelFallbackAdapter). Inference credit likely spent (429).
- 05 token route merged: role in token, mic-only, coach room pattern, no human attribute edits, room timeouts and cap.
- 02 deck and facts merged: 19 facts re-verified by auditor, 6 slides, 4 plays, 25 deck tests incl. basketball sanity rules.

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
- None.

## Ship checklist (collected from audits)
- README Known limits: coach link is a bearer link (anyone with it joins as coach); no rate limit on the token route; free-tier cold start and minute caps.
- Vercel: set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `AGENT_NAME` for build and runtime (page checks env at build).
- LiveKit Cloud agent: `AGENT_NAME` must be a secret (`lk agent secrets`), or the worker crash-loops.
- After `lk agent create`: local dev must stop using `--deployment production` (set `LIVEKIT_AGENT_DEPLOYMENT`).
- Agent: cap session length (cost guard).
- Agent nits from audit 08: log `__qualname__` and each fallback model id; parse providers once; validate providers and key at worker start, not per job; comment on tests reading `_models`.
- /player: show a clear message when the agent session ends on error (all realtime models failed).
- `CHALK_DEBUG` must not be set in `lk agent secrets` or any deploy config (enables the debug_probe RPC).
- Decide whether planning files (`CLAUDE.md`, `AGENTS.md`, `.claude/`, `.agents/`, `docs/plan/`) stay public.
