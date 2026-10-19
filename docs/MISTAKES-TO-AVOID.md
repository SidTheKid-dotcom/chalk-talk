# Mistakes to avoid

Distilled from a review of public LiveKit reference repos and a few public voice-slide demos. "Seen in" names the repo that showed the problem (or did it right).

Named repos: `aydrian/teleprompter` and the `livekit-examples` teleprompter (Node + Python), `thesysdev/voice-agent-generativeui`. Other public voice-slide demos are labelled generically: "WS demo" (hand-rolled Realtime WebSocket), "phrase demo" (cloud LLM + browser speech SDK), "local demo" (local LLM + browser speech APIs).

| # | Rule | Seen in |
|---|---|---|
| 1 | Do not mint tokens with `roomAdmin`. Use role-scoped grants (coach: publish audio, subscribe; no admin), a short TTL, a random room per session, and a coach link bound to that room. | teleprompter |
| 2 | Do not target `remote_participants[0]` or "first participant". Address player and coach by identity or role attribute. Critical with 3 participants. | livekit-examples teleprompter (Python) |
| 3 | Get the ack before speaking: `await perform_rpc`, then return the tool result. No fire-and-forget slide change. | WS demo, thesys |
| 4 | Return a failure string to the model on RPC timeout or error, so it does not narrate a slide that is not on screen. | — |
| 5 | Stale tool calls: use a seq on `show_slide`. After an interruption, do not apply out-of-order slides. | thesys (AbortController idea), phrase demo (req_id) |
| 6 | Interruption truncation: rely on LiveKit Agents (truncates to what was played; verify in logs). Do not hand-roll. Do not keep full interrupted replies in history. | WS demo (no truncate), phrase demo (full reply kept) |
| 7 | No keyword or regex intent routing. Let the model call tools. | local demo, phrase demo |
| 8 | No JSON-in-text "action" protocols. Use real function tools with enum or bounded schemas. | local demo, phrase demo |
| 9 | No deprecated audio APIs (ScriptProcessorNode, audioop). No browser speechSynthesis. Let the LiveKit SDK handle media. | WS demo, local demo |
| 10 | No API keys in the browser. Everything goes through the token route. No CORS `*` on anything credentialed. | WS demo |
| 11 | No hard-coded timers for state (setTimeout restarts, VAD poll loops, fixed cooldowns). | phrase demo, thesys |
| 12 | Unregister RPC and text-stream handlers in effect cleanup, to avoid "method already registered" after reconnect. | teleprompter and thesys do this right |
| 13 | Throw `RpcError` for bad input. Do not return "Error:" strings. | teleprompter |
| 14 | Do not commit build output or private AI planning docs. Keep `.gitignore` for `.next`, `__pycache__`, `.env`. | local demo (target/), WS demo (plan doc) |
| 15 | Commit history: incremental, meaningful commits. A single dump looks bad. | several demos had very few commits |
| 16 | README: concise and honest. Diagram, a "why" for each choice, known limits. No filler, no emoji walls. | — |
| 17 | Deploy: live Vercel URL plus agent on LiveKit Cloud. | only teleprompter and thesys deploy |
| 18 | Tests and evals: unit tests for tool handlers and token roles, plus a scripted eval of slide and board-tool selection, with negative cases. | few have tests |
| 19 | Prompt: one source of truth. Do not duplicate the deck in prompt and code. No "use tools aggressively" or filler phrases. | thesys, phrase demo |
| 20 | Logging: structured. No emoji spam. | teleprompter |
| 21 | Do not keep a fixed shared room name. | teleprompter |
| 22 | Do not expose an open GET token route with arbitrary room or name. | teleprompter |
| 23 | Do not schedule async work from sync event handlers without care (`asyncio.create_task` from `session.on`). Keep a reference and log errors. | livekit-examples teleprompter (Python) |
| 24 | Do not let the model author UI (layout, coordinates, markup, free numbers on screen). Use bounded board tools with enum ids from the deck data. Validate callout text in the agent and the browser. | thesys shows the generative-UI alternative; we chose not to (ADR-015) |
| 25 | Do not sync one screen by command and the other by guesswork. One state of record (`overlay_state` attribute) for every viewer, written only after the ack. | — |
