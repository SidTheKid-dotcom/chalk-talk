# Risks and spikes

Run these spikes before feature work. Each spike is a throwaway branch or a minimal script. Record results in `LEARNINGS.md`. Update `DECISIONS.md` if a fallback is taken.

## Spike 1: Agent hears the coach after handoff (highest risk)
- **Question:** Can the agent switch its audio input from the player to the coach mid-session, with GPT Realtime as the model?
- **Known:** `AgentSession` links to one participant (default: the first to join). `RoomIO.set_participant(identity)` and `session.room_io.set_participant(...)` are documented in Python (sessions doc, turns doc, `livekit/agents` `examples/voice_agents/toggle_io.py`).
- **Unknown:** Does it work cleanly with the realtime model mid-session? Can the agent hear both humans at once, or only one? `[UNVERIFIED]`
- **Test:** Room with two browser tabs (player, coach). After a trigger, call `set_participant(coach_identity)`. Coach says "Assistant, show the Kyrie slide."
- **Pass:** Agent responds to the coach's speech and calls `show_slide`. No crash. Agent ignores the player's audio (or hears both, note which).
- **Fail fallback A:** Agent listens only to the coach after handoff (acceptable).
- **Fail fallback B:** Coach taps slides on the phone. Agent stays silent in clicker mode.

## Spike 2: GPT Realtime calls show_slide before speaking
- **Question:** Does the model call `show_slide` before talking about the slide?
- **Known:** Realtime models can speak and then call a tool in the same response. The RPC ack blocks the tool result, not audio already produced. LiveKit has `ToolHandlingOptions(tool_reply_after_audio="skip")` to avoid double replies (from research; confirm in docs) `[UNVERIFIED]`.
- **Test:** Strict instruction ("call show_slide first, then speak; never describe a slide before the tool result"). Run 20 routing questions in text or audio, 3 times. Log order of first audio vs tool call.
- **Board tools:** Run the test twice: with `show_slide` and `call_head_coach` only, then with all five tools. Include the `run_play` items. Log the order of first play-specific audio vs the `run_play` call.
- **Pass:** Tool call comes before slide-specific speech in nearly all runs. Planner sets the bar and records the measured rate.
- **Fail fallback:** Swap to an STT-LLM-TTS pipeline (one config change plus STT and TTS models). Keep tools and RPC unchanged.

## Spike 3: RPC show_slide round trip with ack and seq
- **Question:** Does `perform_rpc` to the player identity return an ack after render, with timeout and stale-seq handling?
- **Test:** Agent calls `show_slide` 10 times with increasing seq, plus one stale seq and one unknown slide id. Kill the player tab for one call.
- **Board methods:** Repeat with `highlight`, `run_play` and `add_callout`: one stale seq, one unknown id, one slide mismatch, one rejected callout. Join a coach tab mid-play and check `overlay_state` renders.
- **Pass:** Acks return with `applied` true or false as expected. Stale seq does not render. Unknown id raises `RpcError` 1001. Board errors raise 1004-1007 as in `docs/ARCHITECTURE.md`. Dead tab gives a timeout and the tool returns a failure string. Round trip measured and logged.
- **Fail fallback:** If ack after paint is slow, ack after state commit and note it.

## Risk 4: Free-tier cold start
- **Known:** Build plan cold starts of about 10-20 s after idle (from research).
- **Mitigation:** Warm the agent before sharing the link and before recording. README states it.

## Risk 5: Free-tier quota
- **Known:** Hard caps on agent minutes and inference credit (from research; confirm on pricing page).
- **Mitigation:** Use the OpenAI plugin with our own key if Inference credit runs low. Keep dev sessions short.

## Risk 6: Token route production guard
- **Known:** `agent-starter-react` token route throws in production unless a flag is set (from research).
- **Mitigation:** Handle deliberately in the token route task. Keep role validation.

## Risk 7: Agent speaks in clicker mode when not addressed
- **Mitigation:** Clicker instructions plus eval items for "not addressed" turns. If it still talks, disable audio output in clicker mode except for name-addressed turns `[UNVERIFIED]` best API.

## Risk 8: Unsourced facts
- **Mitigation:** `FACTS.md` gate. A slide fact without verified = y does not ship.

## Risk 9: Wrong tool with five tools
- **Risk:** More tools mean more wrong choices: `run_play` when only a slide was needed, `highlight` on the wrong slide, a free-text callout with a claim, a board tool in clicker mode when nobody addressed the agent.
- **Mitigation:** Enums for every id. Agent-side checks return a failure string with the valid options (target not on slide, callout rule). Clear tool descriptions with "use when / do not use when". Eval positives per tool and negatives (see `docs/PRODUCT.md#eval`). Compare the slide pass rate with and without the board tools (Spike 2).
- **Fallback order:** Drop `add_callout` first, then `highlight`. Keep `run_play`; it carries the demo. Each drop removes the tool from the agent and its eval items. Log the change in `DECISIONS.md` (ADR-015).

## Risk 10: Animation and RPC timing vs speech
- **Risk:** The model speaks before the play starts, or talks faster or slower than the steps. `run_play` from another slide chains two round trips. A barge-in during a play stops the audio but not the animation. Parallel tool calls in one response could apply out of order.
- **Mitigation:** `run_play` acks at the first frame, so speech starts with the motion. The tool result gives step captions in order, and each step shows its caption on screen, so the board explains itself if speech drifts. Keep plays short (2-5 steps). A slide change clears the play. One agent-side lock runs RPC tools in call order. Measure round trips in Spike 3 and log them in the board trace.
- **Fallback:** If speech and motion drift badly, ack at the end of the play and narrate after. Accept the extra pause.

## Risk 11: Coach screen out of sync with the player
- **Risk:** The coach renders overlays from the `overlay_state` attribute with no ack. Attribute delay, size limits or split updates `[UNVERIFIED]` could show a stale or missing overlay.
- **Mitigation:** Ids only, capped size. Render overlays only when `overlay_state.slide_id` equals `current_slide`. Test with the coach joining mid-play and after a callout. See ADR-016.
- **Fallback:** RPC to both identities with two acks.
