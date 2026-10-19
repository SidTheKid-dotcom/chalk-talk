# 11 — Board tools: highlight, run play and guarded callouts

## Goal
The presenter and clicker can change the current slide with the three bounded board tools, and the player and coach state stay consistent through acked RPC plus `overlay_state`.

## Context
- Product: `docs/PRODUCT.md#board-tools-the-agent-changes-slide-content`, `#demo-script` steps 3, 5 and 9
- Contract: `docs/ARCHITECTURE.md#agent-tools`, `#rpc-methods-agent---browser`, `#overlay-state`, `#tools-by-mode`
- Decisions: ADR-015, ADR-016, ADR-017, ADR-023, ADR-026
- Risks: `docs/RISKS.md#risk-9-wrong-tool-with-five-tools`, `#risk-10-animation-and-rpc-timing-vs-speech`
- Depends on merged tasks 09 and 10.

## Scope
- Extend the agent command path with one lock and one increasing seq shared by `show_slide`, `highlight`, `run_play` and `add_callout`.
- Expose the three tools with ids generated from deck and verified facts data. Tool results contain only acked state and deck-owned labels, play steps or fact claims.
- Validate target-to-slide, play-to-slide and the exact callout rule before RPC. `run_play` changes slide first when required. Never write `overlay_state` before an applied ack.
- Implement browser RPC handlers and rendering for all three tools. A stale seq is acknowledged but not rendered. A slide change clears every overlay.
- Keep at most two highlights, one play and three callouts. A fact callout shows the approved claim verbatim; a text callout uses the distinct coach-note style.
- Animate plays from deck data and ack after the first painted frame. The last frame remains. A highlighted marker follows its play motion.
- Unit tests cover every validation and error path in both Python and TypeScript, including digits, symbols, spelled-out numbers, wrong slide, stale seq and capped state.

## Out of scope
- Coach joining, briefing and mode switching; status metrics; deployment; the final E2E harness.

## Acceptance checks
| Check | How to verify | Evidence required |
|---|---|---|
| Automated checks | agent pytest/ruff; web test/lint/typecheck; deck sync check | exact output |
| Live board path | real `/player`, local agent and LiveKit Cloud; spoken or typed requests for each tool | tool logs, RPC ack logs and screenshots |
| Play timing | run the LeBron play from another slide | slide ack before play ack; screenshot during and after motion |
| State sync | reload player after overlays; inspect attributes | restored end state and matching `overlay_state` |
| Guardrail | request an invented stat and invalid free-text callouts | no RPC; failure/refusal evidence |
| Failure path | freeze or close player during each tool | bounded failure string; no false narration |

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
