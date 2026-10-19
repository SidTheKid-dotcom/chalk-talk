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
