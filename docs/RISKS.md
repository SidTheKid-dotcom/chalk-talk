# Risks and spikes

Run these spikes before feature work. Each spike is a throwaway branch or a minimal script. Record results in `LEARNINGS.md`. Update `DECISIONS.md` if a fallback is taken.

## Spike 1: Agent hears the coach after handoff (highest risk)
- **Question:** Can the agent switch its audio input from the player to the coach mid-session, with GPT Realtime as the model?
- **Known:** `AgentSession` links to one participant. `CoachSwitcher` calls `session.room_io.set_participant(identity)`. `examples/voice_agents/toggle_io.py` was not on livekit/agents main when Spike 1 ran (`LEARNINGS.md`).
- **Spike result, since superseded:** `set_participant` takes one identity. Spike 1 switched to the coach and ignored the player; its timings are in `LEARNINGS.md`. That spike also saw the default `close_on_disconnect=True` end the session on coach leave.
- **Current code:** `close_on_disconnect=False`. Coach leave restores the player (ADR-025). After the switch, a 200 ms floor router can link either trusted human (ADR-028). The agent still hears only one of them at a time.
- **Test:** Room with two browser tabs (player, coach). After a trigger, call `set_participant(coach_identity)`. Coach says "Assistant, show the Kyrie slide."
- **Pass:** Agent responds to the coach's speech and calls `show_slide`. No crash. Agent ignores the player's audio (or hears both, note which). **Result: PASS.**
- **Fail fallback A:** Agent listens only to the coach after handoff (acceptable).
- **Fail fallback B:** Coach taps slides on the phone. Agent stays silent in clicker mode.

## Spike 2: GPT Realtime calls show_slide before speaking
- **Question:** Does the model call `show_slide` before talking about the slide?
- **Known:** Realtime models can speak and then call a tool in the same response. The RPC ack blocks the tool result, not audio already produced. `ToolHandlingOptions(tool_reply_after_audio="skip")`: not found in livekit/agents code search; treat as not existing. Reply control that does exist (events doc): a tool that returns nothing or raises `StopResponse` gets no reply; `FunctionToolsExecutedEvent.cancel_tool_reply()` suppresses the auto reply. Model: `openai/gpt-realtime-2.1` is listed as turn-based on LiveKit Inference (realtime models doc).
- **Test:** Strict instruction ("call show_slide first, then speak; never describe a slide before the tool result"). Run 20 routing questions in text or audio, 3 times. Log order of first audio vs tool call.
- **Board tools:** Run the test twice: with `show_slide` and `call_head_coach` only, then with all five tools. Include the `run_play` items. Log the order of first play-specific audio vs the `run_play` call.
- **Pass:** Tool call comes before slide-specific speech in nearly all runs. Planner sets the bar and records the measured rate.
- **Fail fallback:** Not taken. ADR-026 kept GPT Realtime. The agent has no STT-LLM-TTS pipeline to swap in.
- **Noted, not in the agent:** GPT-Live 1 was considered as another way to order tools. It is not configured. `REALTIME_MODEL` defaults to `gpt-realtime-2.1`.

## Spike 3: RPC show_slide round trip with ack and seq
- **Question:** Does `perform_rpc` to the player identity return an ack after render, with timeout and stale-seq handling?
- **Test:** Agent calls `show_slide` 10 times with increasing seq, plus one stale seq and one unknown slide id. Kill the player tab for one call.
- **Board methods:** Repeat with `highlight`, `run_play` and `add_callout`: one stale seq, one unknown id, one slide mismatch, one rejected callout. Join a coach tab mid-play and check `overlay_state` renders.
- **Pass:** Acks return with `applied` true or false as expected. Stale seq does not render. Unknown id raises `RpcError` 2001. Board errors raise 2004-2007 as in `docs/ARCHITECTURE.md`. Dead tab gives a timeout and the tool returns a failure string. Round trip measured and logged.
- **Fail fallback:** If ack after paint is slow, ack after state commit and note it.

## Risk 4: Free-tier cold start
- **Known:** Research mentioned Build-plan cold starts after idle. This repo has not measured that, and it has no Cloud agent to cold-start. The local worker is `lk agent dev`.
- **Mitigation:** None in the running app. A future Cloud deploy would need its own warm-up note. The README does not claim a cold-start time.

## Risk 5: Inference quota
- **Known:** LiveKit Inference has account quotas. The dollar and concurrency figures are not stored in this repo. Do not quote them from this file.
- **Mitigation (taken, ADR-024):** The default provider list is `openai,inference`. The OpenAI plugin uses `OPENAI_API_KEY`. Inference is the fallback model inside `RealtimeModelFallbackAdapter` when both names are set.
- **Known gap:** If Inference rejects the session, the fallback cannot speak. Task 08 saw a 429 on that path (`LEARNINGS.md`). That result is not a live quota reading.

## Risk 6: Token route production guard
- **Known:** The upstream starter threw in production unless a flag was set.
- **Current code:** `POST /api/token` has no `IS_VERCEL_PREVIEW` check. It requires `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `AGENT_NAME`. `GET` returns 405. `/player` throws at import if `LIVEKIT_URL` is unset. There is no homepage-agent fallback.

## Risk 7: Agent speaks in clicker mode when not addressed
- **Mitigation:** Clicker instructions plus eval items for "not addressed" turns. If it still talks, disable audio output in clicker mode except for name-addressed turns. API exists: `session.output.set_audio_enabled(bool)` (text-and-transcriptions doc). Deciding when to re-enable it is the hard part.

## Risk 8: Unsourced facts
- **Mitigation:** `FACTS.md` gate. A slide fact without verified = y does not ship.

## Risk 9: Wrong tool with five tools
- **Risk:** More tools mean more wrong choices: `run_play` when only a slide was needed, `highlight` on the wrong slide, a free-text callout with a claim, a board tool in clicker mode when nobody addressed the agent.
- **Mitigation:** Enums for every id. Agent-side checks return a failure string with the valid options (target not on slide, callout rule). Clear tool descriptions with "use when / do not use when". Eval positives per tool and negatives (see `docs/PRODUCT.md#eval`). Compare the slide pass rate with and without the board tools (Spike 2).
- **Fallback order:** Drop `add_callout` first, then `highlight`. Keep `run_play`; it carries the demo. Each drop removes the tool from the agent and its eval items. Log the change in `DECISIONS.md` (ADR-015).

## Risk 10: Animation and RPC timing vs speech
- **Risk:** The model speaks before the play starts, or talks faster or slower than the steps. `run_play` from another slide chains two round trips. A barge-in during a play stops the audio but not the animation. Parallel tool calls in one response could apply out of order.
- **Mitigation (current, ADR-029):** `run_play` acks at the first painted frame. Captioned steps then advance only while `lk.agent.state` is `speaking`, using the speech budget in `web/lib/deck/plays.ts` (`700` ms per word plus `1600` ms, clamped to 4–10 s). A pause freezes the frame. A play that never speaks finishes remaining steps at deck speed after `700` ms. A slide change clears the play. One agent-side lock runs RPC tools in call order. There is no on-screen board trace.
- **Fallback:** Ack-at-end was not taken.

## Risk 11: Coach screen out of sync with the player
- **Risk:** The coach renders overlays from the `overlay_state` attribute with no ack. Attribute delay or split updates could show a stale or missing overlay.
- **Mitigation:** Ids only, capped size. Render overlays only when `overlay_state.slide_id` equals `current_slide`. Test with the coach joining mid-play and after a callout. See ADR-016.
- **Fallback:** RPC to both identities with two acks.
