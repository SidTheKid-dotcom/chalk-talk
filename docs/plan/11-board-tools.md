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
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence (live board path, play timing logs, overlay inspect, guardrail; remaining E2E gaps below)
- [x] Screenshots attached (including mid-motion after audit fix)
- [x] LEARNINGS.md updated if needed
- [x] Docs updated if behavior changed (none; contracts unchanged)

## Report (executor fills)
- Files changed:
  - Agent: `agent/src/callout.py`; `agent/src/deck_data.py`; `agent/src/slide_commander.py`; `agent/src/prompts.py`; `agent/src/agent.py`; `agent/src/debug_probe.py`; `agent/tests/test_callout.py`; `agent/tests/test_slide_commander.py`; `agent/tests/test_prompts.py`; `agent/tests/test_agent.py`
  - Web: `web/lib/deck/callout.ts`; `web/lib/deck/callout.test.ts`; `web/lib/deck/commands.ts`; `web/lib/deck/commands.test.ts`; `web/lib/deck/plays.ts`; `web/lib/deck/plays.test.ts`; `web/lib/deck/rpc.ts`; `web/lib/deck/rpc.test.ts`; `web/hooks/usePlayMotion.ts`; `web/components/deck/SlideView.tsx`; `web/components/app/view-controller.tsx`; `web/styles/scouting.css`
  - Docs: `LEARNINGS.md`; this task report
- Commands run and key output:
  - `python3 scripts/sync_deck.py --check` — `sync check passed`
  - `cd agent && uv run pytest -q` — original `98 passed, 2 skipped`; after audit fix `99 passed, 2 skipped in 2.28s`
  - `cd agent && uv run ruff check src tests` — `All checks passed!`
  - `cd agent && uv run ruff format --check` on the files this task changed — original `10 files already formatted`; audit-fix files `2 files already formatted`
  - `cd web && pnpm test` — original `67 passed (67)`; after audit fix `Test Files  8 passed (8)` / `Tests  72 passed (72)`
  - `cd web && pnpm lint` — exit 0; existing unused `error` warning in `components/agents-ui/agent-audio-visualizer-aura.tsx:34` and unnecessary `_barCount` dependency warning in `components/agents-ui/agent-audio-visualizer-radial.tsx:162`
  - `cd web && pnpm exec tsc --noEmit` — exit 0, no output
  - Live room `fr-620d590d91904fad`, worker `AW_VmCBuqEUmqdz`, player `player-f0c4c5f9e3`, agent `agent-AJ_Jw894kAM5D3x`. Mic blocked in the embedded browser; typed questions only.
  - Startup: `rpc_roundtrip show_slide seq=1 s1_tipoff applied=true` (151.5 ms)
  - Typed `Show me how we trap LeBron.` from slide 1: `executing tool run_play {"play_id":"p_blitz_lebron_pnr"}` then `rpc_roundtrip show_slide seq=2 s2_lebron applied=true` (122.6 ms) then `rpc_roundtrip run_play seq=3 s2_lebron applied=true duration_ms=5000` (151.0 ms). Slide ack before play ack.
  - Typed `Show me that trap play again.`: `rpc_roundtrip run_play seq=4` on `s2_lebron` (126.2 ms); no extra `show_slide`.
  - Typed `Highlight LeBron on the court.`: `rpc_roundtrip highlight seq=5 target=cle_james applied=true active=["cle_james"]` (117.9 ms)
  - Typed `Put Iguodala on LeBron up on the board.`: `rpc_roundtrip add_callout seq=6 callout_id=c6 applied=true` (129.4 ms); arguments `{"text":"Iguodala on LeBron"}`
  - Typed `Put a note that LeBron scores 40 a night.`: no `add_callout` / no RPC. Model refused: `I can't put that up because it's an invented stat and I don't have a verified fact ID for it.`
  - `lk room participants get --room fr-620d590d91904fad --identity agent-AJ_Jw894kAM5D3x` after play: `overlay_state={"v":1,"slide_id":"s2_lebron","seq":3,"highlights":[],"play":{"play_id":"p_blitz_lebron_pnr","seq":3},"callouts":[]}`
  - After highlight: `overlay_state={"v":1,"slide_id":"s2_lebron","seq":5,"highlights":["cle_james"],"play":{"play_id":"p_blitz_lebron_pnr","seq":4},"callouts":[]}`; `current_slide=s2_lebron`; `slide_seq=2`
  - After valid callout: `overlay_state={"v":1,"slide_id":"s2_lebron","seq":6,"highlights":["cle_james"],"play":{"play_id":"p_blitz_lebron_pnr","seq":4},"callouts":[{"callout_id":"c6","text":"Iguodala on LeBron"}]}`
  - Failure path: typed `Highlight Green on the court.`; `rpc_roundtrip highlight seq=7 gsw_green applied=true` (121.0 ms) completed before `lk room participants remove`. Player then showed `The film session ended.` Live in-flight 1401/1502 was not timed. Unit tests still cover missing player, timeout, stale, and 2001-2007 for all three tools.
- Screenshots:
  - Play last frame (caption `Weak side rotates home`): `/tmp/task11-evidence/play-last-frame.png` and `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvf8gv8x-684ab9c0.png`
  - Replay last frame: `/tmp/task11-evidence/play-replay-last-frame.png`
  - Highlight LeBron (gold ring + caption `LeBron is highlighted.`): `/tmp/task11-evidence/highlight-lebron.png`
  - Coach's note `Iguodala on LeBron` (Kalam, distinct from F07 NoteCard): `/tmp/task11-evidence/callout-coach-note.png`
  - Invented-stat refusal, board unchanged: `/tmp/task11-evidence/callout-invented-stat-refused.png`
  - Session closed after player remove: `/tmp/task11-evidence/session-closed.png`
- Audit-fix follow-up (preserves `317155c`, `10e20c7`, `4810d80`):
  - HIGH: `seedDeckFromAgent` now ignores same/lower-seq echoes for the same agent. A later higher seq animates only when `play.seq` is new; unchanged play seq keeps `playAnimate`; initial connect / new agent identity still seeds `playAnimate:false`. Tests: same-seq RPC echo, new play seq after initial connect, highlight/callout seq advance during an active play.
  - MEDIUM: `reduceAddCallout` dropped the raw text-length 2002 MALFORMED precheck. Short/long text use the shared trimmed rule and return 2005 CALLOUT_REJECTED. Padded valid text stores the trimmed note.
  - LOW: `SlideCommander._add_callout_locked` strips `fact_id` and text; empty after strip is `None`, so whitespace-only fact ids cannot pick the fact payload branch.
  - Re-run: `python3 scripts/sync_deck.py --check` — `sync check passed`. Agent `99 passed, 2 skipped in 2.28s`; ruff check/format passed. Web `72 passed (72)`; lint only the pre-existing agents-ui warnings; `tsc --noEmit` exit 0.
  - Live after the echo fix, room `fr-6b5077cf6e6044b6`, worker `AW_yJY5MjytSpeb`, player `player-59ea6d9310`, agent `agent-AJ_zRomqyxexwJD`:
    - Startup `show_slide` seq 1 `s1_tipoff` 131.9 ms
    - Typed `Show me how we trap LeBron.`: `run_play p_blitz_lebron_pnr` then `show_slide` seq 2 664.8 ms then `run_play` seq 3 298.7 ms `duration_ms=5000`. First-step caption `Screen comes at the top` observed live; last frame `Weak side rotates home`.
    - Typed `Show me that trap play again.`: `run_play` seq 4 147.9 ms, no extra `show_slide`. Mid-step caption `Tag the roller behind` observed via poll.
    - Typed `Run the trap play one more time.`: `run_play` seq 5 537.0 ms. Mid-motion PNG captured at caption `Tag the roller behind` (markers mid-route, T.THOMPSON still near the screen). Then last-frame PNG `Weak side rotates home` (T.THOMPSON in the paint). Animation completed; it did not snap at ~100 ms.
  - Mid-motion PNG: `/tmp/task11-evidence/play-mid-motion.png` and `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvf95n7r-6a348368.png`
  - Last-frame after that replay: `/tmp/task11-evidence/play-last-frame-after-fix.png` and `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvf95zoi-f9b5c7fc.png`
- Not done / not verified:
  - Same-room reload restore is still blocked by the token route creating a new random player room (ADR-008; task 10). Overlay seeding from attributes is unit-tested.
  - Live close-during-RPC for each tool was not captured; highlight seq 7 acked in 121 ms before the kick. Bounded failure strings are unit-tested.
  - Physical microphone voice turns are still impossible in the embedded browser.
  - `CHALK_DEBUG=1` debug_probe still does not publish `lk.agent.state`; live verification used the realtime worker.
  - Other-worktree production workers (`t3-716ac30b` next-server 452823, `t3-3d2b4a8d` agent 468777) were left running.
  - No product, architecture, or facts docs changed. Deck JSON was not rewritten. `.gitignore`, `opencode.json`, and `design/hardwood` were not touched.
