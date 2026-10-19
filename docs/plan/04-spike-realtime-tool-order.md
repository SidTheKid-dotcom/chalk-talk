# 04 — Spike 2: GPT Realtime calls show_slide before it speaks about the slide

## Goal
We know, with a measured rate, whether `openai/gpt-realtime-2.1` calls `show_slide` (and `run_play`) before slide-specific speech, with 2 tools and with 5 tools.

## Context
- Risks: `docs/RISKS.md#spike-2-gpt-realtime-calls-show_slide-before-speaking`, `#risk-9-wrong-tool-with-five-tools`
- Product: `docs/PRODUCT.md#eval` (item format, example utterances, title-word rule)
- Contract: `docs/ARCHITECTURE.md#agent-tools`, `#tools-by-mode`
- Decision: ADR-002 (fallback: pipeline), ADR-015, ADR-021 (harness lives in `evals/spikes/`)
- Skills: `.agents/skills/testing-livekit-agents`, `.agents/skills/debugging-livekit-agents`
- Depends on: 01, 02. Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env` to the worktree root.

## Scope
- `evals/spikes/tool_order.py`: runs the agent's realtime model against 20 routing utterances (from PRODUCT examples; at least 10 without title words) plus 6 `run_play` utterances, 3 runs each.
- Tool bodies in the harness return a fixed success string ("Slide s2_lebron is on screen. Title: ...") built from deck data. This is a measurement harness, not demo code. Label it so in the file header.
- For each turn, record the event order: did any assistant audio/transcript about the slide come before the first `show_slide` / `run_play` call? Use the LiveKit test harness (`AgentSession` run results / events) in text input first.
- Then an audio check: 10 utterances spoken through `lk agent debugger --audio` or a live mic. Log the same order from session events.
- Two configs: (A) tools `show_slide`, `call_head_coach` (stub). (B) all five tools (stubs for board tools with enums from deck data).
- Try the prompt rule: "Call show_slide first. Do not describe a slide before its tool result." Also try one variant with a short spoken lead-in allowed ("One sec, pulling it up.") and report if that changes the rate.
- Record results in `LEARNINGS.md` and a table in the report.

## Out of scope
- Real RPC (task 03), UI, the full eval (later task), switching to a pipeline (planner decides after this).

## Pass bar (set by planner)
- Tool-before-slide-speech ≥ 90% across 3 text runs in config B, and no worse than 10 points below config A.
- Audio check: ≥ 8 of 10.
- Below the bar: report the numbers. Do not switch models. Planner decides on the fallback.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Harness runs 3x per config | `uv run python evals/spikes/tool_order.py --config A --runs 3` and B | output with per-run rate |
| Correct-tool rate | same | table: utterance group, expected tool, correct %, tool-first % |
| Audio order check | debugger audio or mic | log excerpt per utterance with event order |
| Parallel call order | any turn with two tool calls | log lines showing start/end order (feeds the ARCHITECTURE note on concurrency) |
| Truncation on interruption | one live interruption | `conversation_item_added` log showing `interrupted` and the stored text |

## Checklist
- [ ] Implemented
- [ ] Lint and typecheck pass
- [ ] Tests pass (list)
- [ ] Acceptance checks pass with evidence
- [ ] Screenshots attached (UI tasks)
- [ ] LEARNINGS.md updated (if any surprise)
- [ ] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed:
- Commands run and key output:
- Not done / not verified:
