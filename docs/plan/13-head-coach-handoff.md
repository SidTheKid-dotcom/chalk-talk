# 13 — Head-coach handoff, shared video and live coach view

## Goal
A player can request the head coach, a coach can join the same room from `/coach`, both humans can see who is speaking on camera, receive a private briefing, share one AI clicker that follows the active human, and leave without ending the player's session.

## Context
- Product: `docs/PRODUCT.md#demo-script` steps 6-9, `#who-is-in-the-room`
- Contract: `docs/ARCHITECTURE.md#text-streams`, `#agent-modes-and-the-switch`, `#sequence-handoff`
- Decisions: ADR-009, ADR-010, ADR-014, ADR-025
- Design: `docs/DESIGN-BRIEF.md#coach-view`, `#voice-and-camera-chrome`, `#slide-transitions`
- Spike evidence and required fixes: `docs/plan/06-spike-coach-audio.md`, `PROGRESS.md#handoff-task-must-include-audit-06`
- Current LiveKit docs: React `useTracks([Track.Source.Camera])` + `VideoTrack` render camera tracks; `RoomEvent.ActiveSpeakersChanged` / `ParticipantEvent.IsSpeakingChanged` identify speakers. Python `AgentSession` still has one linked participant, changed with `RoomIO.set_participant()`.
- Core/control-plane lane depends on merged tasks 09-11 and may run in parallel with task 12. Frontend integration depends on merged task 12.

## Parallelization boundary
- **Lane A — core now:** agent `call_head_coach`, handoff state, briefing delivery, coach switch/refactor, active-speaker floor router, coach-leave recovery, camera token grants and unit tests. It must not edit React pages, slide components or Hardwood styles.
- **Lane B — after task 12:** player coach-link/QR UI, camera publication controls, two-person video rail, active-speaker styling, private coach page and browser acceptance checks.
- Lane A may use fakes for unit tests but must defer production-deployment live checks while another task owns a local LiveKit worker. Lane B owns the final integrated room check.

## Scope
- Reuse the merged task-12 Hardwood player/lobby primitives for `/coach`; do not introduce a second visual language.
- Add `call_head_coach`: generate the room-bound `/coach?room=` URL, send `show_coach_link` RPC to the player, mark handoff requested, and return only the contracted short result.
- Render a link and QR on `/player` without exposing a server key or granting admin permissions.
- Replace the coach stub with the portrait Scouting Packet coach view: live deck and overlays from agent attributes, mic controls, connection state and private briefing card.
- Allow player and coach tokens to publish only microphone and camera tracks. Add camera on/off controls; no screen share. Starting without camera permission must leave voice usable and show a clear video-off state.
- Render a compact two-person video rail on both `/player` and `/coach`, using subscribed camera tracks from the real room. Show role/name and a fallback portrait when video is off. Exclude the agent participant. Give the current active human a clear speaking border without covering slide content, controls, captions or credits.
- The AI remains one shared, audio-only assistant in the room. Its audio continues to play to both humans.
- Register and clean up the `coach-briefing` text-stream handler. The message is addressed only to the coach identity.
- Move role lookup and coach switching into a focused module. Handle coach present at attach and role-attribute changes without trusting join order.
- Switch in the contract order: briefing, one audible handoff line, clicker instructions, `mode=clicker`, then `set_participant(coach)`.
- After handoff, add a bounded active-speaker floor router for human roles only. Listen to LiveKit's `active_speakers_changed`; keep the current linked human while they remain active, otherwise debounce and switch `RoomIO.set_participant()` to the active player or coach. Never link to the agent or an untrusted role. Log old/new identity, role and switch latency. Sequential player and coach turns must both reach the same AgentSession and tools.
- The clicker prompt remains the semantic gate: hearing a human is not permission to speak. The agent stays silent for ordinary human conversation and acts only when addressed or on the already-approved clear-play trigger. Do not add keyword/regex intent routing.
- Treat simultaneous human speech explicitly: hold the current floor while that participant remains active; do not flap between speakers. If the active-speaker switch clips commands, thrashes, or destabilizes interruption handling in the live acceptance run, keep both video feeds but fall back to the verified coach-only ear after handoff and record the limitation in ADR-010/README.
- Set `RoomOptions(close_on_disconnect=False)`. On coach leave, restore presenter instructions and mode, select the player by role and resume listening. End only when no player remains.
- In clicker mode stay silent unless addressed, while still following topic changes and allowed prepared plays. No keyword/regex intent routing.
- Tests cover camera grants, video-off fallback, active speaker UI, duplicate coaches, coach without prior request, private destination, attributes-changed path, failed instruction update, switch rollback, sequential player/coach floor changes, simultaneous-speaker floor stability and coach-leave recovery.
- Frontend tests cover minimum type scale, fixed stage/court geometry across slide/state/video changes, absence of visible transcripts, forward/backward transition direction, interrupted-transition cleanup and reduced motion.

## Out of scope
- Automated AI coach test harness, final interruption metrics and production deployment.

## Acceptance checks
| Check | How to verify | Evidence required |
|---|---|---|
| Automated checks | agent pytest/ruff and web test/lint/typecheck | exact output |
| Hardwood fit | desktop, 1280x720, 1280x800 and 390x844 screenshot loop | large readable type; no slide/camera/control overlap |
| Slide motion | navigate forward, backward and interrupt during transition | recording or frame sequence; fixed chrome and correct settle state |
| Join flow | player requests coach, phone-size `/coach` joins same live room with camera + mic | player QR/link, participant roles, both-video screenshot |
| Privacy | inspect text-stream destination and player UI | coach receives briefing; player does not |
| State continuity | join coach after a slide highlight/play | matching slide and overlays on both screens |
| Shared video | toggle each camera and speak in turn | both views render real tracks/fallbacks; speaking border follows the human |
| Shared AI floor | player and coach alternate addressed board requests | one AgentSession hears both sequential turns; expected tools apply with switch latency logged |
| Overlap stability | both humans speak briefly at once, then one continues | linked floor does not flap; session and realtime model remain healthy |
| Clicker behavior | each human talks normally, then addresses Assistant | no unsolicited speech; requested board command applies |
| Coach leave | disconnect coach, then player asks a new question | session survives, mode returns to presenter, agent hears player |

## Checklist
- [ ] Implemented
- [ ] Lint and typecheck pass
- [ ] Tests pass (list)
- [ ] Acceptance checks pass with evidence
- [ ] Screenshots attached
- [ ] LEARNINGS.md updated if needed
- [ ] Docs updated if behavior changed

## Report (executor fills)
- Files changed:
- Commands run and key output:
- Not done / not verified:
