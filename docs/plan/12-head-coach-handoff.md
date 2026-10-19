# 12 — Head-coach handoff and live coach view

## Goal
A player can request the head coach, a coach can join the same room from `/coach`, receive a private briefing, take over while the agent becomes a quiet clicker, and leave without ending the player's session.

## Context
- Product: `docs/PRODUCT.md#demo-script` steps 6-9, `#who-is-in-the-room`
- Contract: `docs/ARCHITECTURE.md#text-streams`, `#agent-modes-and-the-switch`, `#sequence-handoff`
- Decisions: ADR-009, ADR-010, ADR-014, ADR-025
- Design: `docs/DESIGN-BRIEF.md#coach-phone-view-390844-portrait`
- Spike evidence and required fixes: `docs/plan/06-spike-coach-audio.md`, `PROGRESS.md#handoff-task-must-include-audit-06`
- Depends on merged tasks 09-11.

## Scope
- Add `call_head_coach`: generate the room-bound `/coach?room=` URL, send `show_coach_link` RPC to the player, mark handoff requested, and return only the contracted short result.
- Render a link and QR on `/player` without exposing a server key or granting admin permissions.
- Replace the coach stub with the portrait Scouting Packet coach view: live deck and overlays from agent attributes, mic controls, connection state and private briefing card.
- Register and clean up the `coach-briefing` text-stream handler. The message is addressed only to the coach identity.
- Move role lookup and coach switching into a focused module. Handle coach present at attach and role-attribute changes without trusting join order.
- Switch in the contract order: briefing, one audible handoff line, clicker instructions, `mode=clicker`, then `set_participant(coach)`.
- Set `RoomOptions(close_on_disconnect=False)`. On coach leave, restore presenter instructions and mode, select the player by role and resume listening. End only when no player remains.
- In clicker mode stay silent unless addressed, while still following topic changes and allowed prepared plays. No keyword/regex intent routing.
- Tests cover duplicate coaches, coach without prior request, private destination, attributes-changed path, failed instruction update, switch rollback and coach-leave recovery.

## Out of scope
- Automated AI coach test harness, final interruption metrics and production deployment.

## Acceptance checks
| Check | How to verify | Evidence required |
|---|---|---|
| Automated checks | agent pytest/ruff and web test/lint/typecheck | exact output |
| Join flow | player requests coach, phone-size `/coach` joins same live room | player QR/link, participant roles, coach screenshot |
| Privacy | inspect text-stream destination and player UI | coach receives briefing; player does not |
| State continuity | join coach after a slide highlight/play | matching slide and overlays on both screens |
| Clicker behavior | coach talks normally, then addresses Assistant | no unsolicited speech; requested board command applies |
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
