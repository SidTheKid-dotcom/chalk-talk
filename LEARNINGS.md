# Learnings

Surprises, gotchas and fixes found while building. One entry per line. Newest last.

Format: `- [area] What happened. Why. Fix or workaround. (source: task file / doc link)`

- [livekit/rpc] RPC codes 1001-1999 are reserved for LiveKit. App codes moved to 2001-2007. (RPC doc "Errors"; ADR-020)
- [livekit/attributes] A participant with `canUpdateOwnMetadata` can rewrite its own attributes, including `role`. Human tokens must not get it. (participant-attributes doc; ADR-022)
- [livekit/attributes] Attributes are capped at 64 KiB total across keys and values. (participant-attributes doc)
- [livekit/agents] `set_participant` takes one identity. The agent hears one human at a time. (`room_io.py`)
- [livekit/agents] `ToolHandlingOptions(tool_reply_after_audio=...)` from early research does not exist in livekit/agents. Use `StopResponse` or `cancel_tool_reply()` to control replies. (code search; events doc)
- [livekit/agents] livekit-agents 1.8.7+ reports realtime `e2e_latency` in assistant message metrics when local VAD is set. (changelog 1.8.7)
- [tooling] The docs MCP may be pending approval in a session. `lk docs search|get-page|code-search|changelog` gives the same source from the shell.
- [livekit/realtime] GPT Realtime 2.1 is turn-based and owns turn detection (semantic VAD by default). Starter STT/TTS, TurnDetector, adaptive interruption, and preemptive_generation conflict; drop them and keep noise cancellation. (docs: /agents/models/realtime/openai, /agents/logic/turns#realtime-models; task 01)
- [livekit/cli] `lk agent init AGENT-NAME` uses that name as both the directory and the dispatch name. Override `@server.rtc_session(agent_name=...)` from `AGENT_NAME`. (CLI agent-development doc; task 01)
- [livekit/cli] CLI 2.19+ `lk agent dev` registers under a random `dev-` deployment, so a starter token that dispatches production may miss the local worker. Pass `--deployment production` when no cloud agent exists. (CLI agent-development doc; task 01)
- [agent/tests] The Python starter's pytest file is fully commented, so `uv run pytest` exits 5 with 0 tests. Add a tiny import/instructions smoke test. (task 01)
- [livekit/agents] First GPT Realtime job stalled ~900ms importing `openai.types.realtime` on the job process. Prewarm that module if cold-start lag matters. (task 01)
- [livekit/logs] Worker INFO logs the job and RoomIO link, not the assistant transcript. The reply is in the web chat UI. (task 01)
- [web] The embedded preview browser has no mic: `getUserMedia` throws `NotSupportedError`. The /player page must catch mic failure and show a message. Voice tests need a real browser. (audit 01)
- [livekit/agents] Adding plain `vad=` to a realtime session keeps server turn detection; adding `turn_detection` or `interruption` with it switches to client-side turns. VAD is needed for `e2e_latency`. (agent_activity.py; audit 01)
- [agent/tests] Importing agent.py raises if AGENT_NAME is unset, so a fresh clone fails pytest. Set a default in tests/conftest.py and keep the fail-fast raise. (audit 01; task 01 r2)
- [facts] Basketball-Reference series page now includes the Game 7 score, series winner and Finals MVP. Shipped claims use Games 1-6 box scores, the game list, and the 2015-16 team page only. (source: task 02)
- [facts] Game 5 series summary says "PTS 2 tied 41"; the names are only on the box score (LeBron James 41, Kyrie Irving 41). (source: task 02)
- [facts] Game 5 Warriors box lists Draymond Green as "Player Suspended". Game 3 box lists Kevin Love as Inactive. (source: task 02)
- [deck] Architecture sketch caption "Two defenders jump the ball" fails callout rule 5 (spelled-out number). Use "Both defenders jump the ball". (source: task 02)
- [facts] Page titles contain a pipe before "Basketball-Reference.com". Drop the site suffix in the Verified cell so the markdown table still has five columns. (source: task 02)
- [tooling] This worktree has `python3` and `uv`, not `python`. Deck commands in AGENTS.md use `python3`. (source: task 02)
- [deck] Two plays on s4 need different formations. `play.start` (ADR-023) lets the short-roll begin as a pick-and-roll instead of the stagger. (source: task 02 round 2)
- [deck] A stagger screener cannot hold the ball. Put Klay at the top as the passer; Curry only gets it on a pass. (source: task 02 round 2)
- [deck] Trap geometry: both trappers finish beside the handler toward the rim, not above him toward half court. (source: task 02 round 2)
- [deck] Slide 5 pace is F19 (Warriors). Say "our pace", not theirs. Love copy can only use F13 + F17. (source: task 02 round 2)
- [facts] A soft claim ("Love produced when he played") passed planner review but was false across Games 5-6. Any slide sentence that judges performance needs a fact per game it covers, not one game. (audit 02)
- [facts] Basketball-Reference returns 403 to curl and plain WebFetch. A search-provider fetch (parallel-search web_fetch) reads the full pages. (audit 02)
