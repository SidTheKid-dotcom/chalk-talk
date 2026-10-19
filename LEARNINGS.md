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
- [livekit/cli] `lk agent dev` registers under a random `dev-` deployment by default; starter tokens dispatch to production. Use `--deployment production` locally until a cloud agent exists. (lk agent dev --help; audit 01)
- [web] The embedded preview browser has no mic: `getUserMedia` throws `NotSupportedError`. The /player page must catch mic failure and show a message. Voice tests need a real browser. (audit 01)
- [livekit/agents] Adding plain `vad=` to a realtime session keeps server turn detection; adding `turn_detection` or `interruption` with it switches to client-side turns. VAD is needed for `e2e_latency`. (agent_activity.py; audit 01)
