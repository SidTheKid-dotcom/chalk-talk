# Chalk Talk — agent guide

Chalk Talk is a voice AI assistant coach. It presents a 6-slide Game 7 plan. Slides follow your questions. The agent can also highlight players, run plays and add notes on the slide. You can interrupt it. A real human coach can join and take over.

## The brief
- Build a voice AI app that presents 5-6 slides.
- The app changes slides based on the user's questions.
- The user can interrupt the agent.
- Keep the frontend and backend lightweight.
- Judged on technical creativity, product instincts and shipping speed.
- Deliver a GitHub repo link. Reviewers will ask "why X, why not Y".

## The product in 5 lines
1. The user is a Warriors player before Game 7 of the 2016 NBA Finals.
2. An AI assistant coach presents a fixed, hand-built 6-slide game plan.
3. Questions move the deck. Interruptions stop the agent at once.
4. "Get me the head coach" makes a join link. A real person joins from a phone.
5. The coach gets a private briefing. The agent hands off and becomes a quiet clicker that still works the board on request.

Full spec: `docs/PRODUCT.md`.

## Architecture summary
- One LiveKit Cloud room per session. Random room name. Participants: player, agent, coach.
- Agent: Python `livekit-agents` 1.8.x. `AgentSession` with GPT Realtime (`openai/gpt-realtime-2.1`).
- Agent modes: `presenter` and `clicker`.
- Tools: `show_slide(slide_id, seq)`, `call_head_coach()`, and three board tools: `highlight(target)`, `run_play(play_id)`, `add_callout(fact_id | text)`.
- Board tools are a fixed menu. The model picks ids from the deck data. It never makes layout.
- Every slide and board tool sends RPC to the player (found by role attribute). It waits for the ack.
- The current slide and the board (`overlay_state`) are agent attributes. The coach and late joiners render from them.
- Overlays clear on slide change.
- The coach briefing is a private text stream (topic `coach-briefing`).
- Frontend: Next.js from `agent-starter-react`. Pages `/player` and `/coach`. Token route with role.
- Deploy: agent on LiveKit Cloud, frontend on Vercel.

Full contracts: `docs/ARCHITECTURE.md`. Decisions: `DECISIONS.md`.

## UI design
- Direction: Scouting Packet. A printed scouting sheet on a manila desk, blue ink, gold highlighter, rust stamps.
- Source of truth for all UI: `docs/DESIGN-BRIEF.md` and `design/`. Read the brief before any UI task.
- `design/concepts/` images guide the look only. They have glitches. Draw courts, markers and plays in code from deck data. Take names and facts from `FACTS.md` and deck data, never from images.
- `design/refs/` shows the target taste.
- `design/players/` holds licensed Wikimedia Commons player photos as plain transparent cutouts, plus `CREDITS.md`. The app draws the paper border, shadow, rotation and caption. Never add a photo without a credits row.
- `local-assets/` (gitignored, optional) holds the slide 6 meme image, which cannot be licensed. It is never committed. If it is missing, slide 6 shows a text-only fallback card.

## Repo map (planned)
```
agent/        Python agent (livekit-agents). Deck data, tools, modes, prompts.
web/          Next.js app. /player, /coach, token route, slides, status panel.
evals/        Tool-choice eval: utterances -> expected and forbidden tool calls.
docs/         PRODUCT, ARCHITECTURE, RISKS, REFERENCES, MISTAKES-TO-AVOID, DESIGN-BRIEF.
docs/plan/    One task file per unit of work. Use TEMPLATE.md.
design/       UI concept images (concepts/), taste refs (refs/), licensed player cutouts (players/). See docs/DESIGN-BRIEF.md.
DECISIONS.md  ADR-style "why X, not Y".
FACTS.md      Every slide fact with its source URL.
PROGRESS.md   Current state. Keep the Now block true.
LEARNINGS.md  Surprises and gotchas found while building.
```

## Roles
- **Planner** = Claude Code (Opus). Plans and researches. Writes `docs/plan/<task>.md`. Delegates with `delegate_task`. Reviews diffs. Does not edit app code.
- **Executor** = Cursor (Grok). Takes one task file at a time. Implements it. Runs checks. Ticks the checklist. Reports evidence.
- **Auditor** = a separate Claude thread. Reviews each diff before merge.

## Hard rules
- Keep all keys server-side in `.env`. Never send a key to the browser.
- Done means verified. Show evidence: command output, test result, screenshot.
- Make small, meaningful commits. One idea per commit.
- Keep `README.md` and `DECISIONS.md` current.
- Source every slide fact in `FACTS.md` with a URL. Do not invent numbers.
- Use no mock data in the demo path. Do not fake anything in the demo.
- Never use `remote_participants[0]`. Find participants by the `role` attribute.
- Get the RPC ack before the agent narrates a slide.
- Send an increasing `seq` with every `show_slide` and board RPC. Use one counter. The browser drops stale seq values.
- Board tools use enums from the deck data only. No freehand or generated layout.
- A callout with a fact or stat must use a verified `fact_id`. Free text has no numbers. Check the rule in agent and browser.
- Clear all overlays on slide change. Write `overlay_state` only after an ack.
- Mark any API you did not verify as `[UNVERIFIED]`. Check LiveKit docs (MCP) first.
- Do not write dates, timelines or timestamps into plans.

## Private context
- `context/` is gitignored. It does not exist in new git worktrees.
- Read it by absolute path: `/home/sidvish/Documents/Work/Personal/synthio-take-home/context/`
- Never copy private context into public files.

## Commands
```bash
# --- task 01: agent + web local run ---
make agent-dev          # cd agent && lk agent dev
make web-dev            # cd web && pnpm dev
make agent-test         # cd agent && uv run pytest
make web-lint           # cd web && pnpm lint
make web-typecheck      # cd web && pnpm exec tsc --noEmit
cd agent && uv sync
cd web && pnpm install
lk agent debugger start
lk agent debugger say "hello"
lk agent debugger stop
# CLI 2.19+ registers `lk agent dev` under a random dev- deployment.
# If the browser cannot reach the local agent, use: cd agent && lk agent dev --deployment production
```

## Mistakes to avoid (short list)
Full list with sources: `docs/MISTAKES-TO-AVOID.md`.
- No `roomAdmin` in tokens. Role-scoped grants, short TTL, random room.
- No `remote_participants[0]`. Target by identity or role.
- Ack before speak. Return a failure string on RPC timeout or error.
- Use `seq` to drop stale slide and board calls.
- No model-made UI. Board content comes from enums and deck data.
- Do not hand-roll interruption. Let LiveKit truncate history.
- No keyword or regex intent routing. No JSON-in-text actions.
- No deprecated audio APIs. No browser speechSynthesis.
- No keys in the browser. No CORS `*`.
- No hard-coded timers for state.
- Unregister RPC and text-stream handlers in effect cleanup.
- Do not commit build output or AI planning docs from context/.
- One source of truth for the deck. No "use tools aggressively" prompts.
- Structured logs. No emoji spam.

## Pointers
- Product: `docs/PRODUCT.md`
- Architecture and contracts: `docs/ARCHITECTURE.md`
- UI design: `docs/DESIGN-BRIEF.md`, `design/`
- Risks and spikes: `docs/RISKS.md`
- References: `docs/REFERENCES.md`
- Task template: `docs/plan/TEMPLATE.md`
