# Chalk Talk — product spec

## Pitch
A voice AI assistant coach presents the Warriors' game plan for Game 7 of the 2016 NBA Finals against the Cavaliers. The slides follow your questions. You can cut the coach off at any time. Ask "show me how we trap LeBron" and the play runs on the court diagram while the agent explains it. When you ask for the head coach, a real person joins the live call, reads a private briefing, and takes over. The AI steps back, runs the slides and works the board on request.

## Who is in the room
| Participant | Who | Device | Sees | Hears / speaks |
|---|---|---|---|---|
| Player | The user | Laptop browser, `/player` | Slides, overlays, mic, camera, bottom-rail state (Listening / Thinking / Speaking / Waiting), coach link + QR | Talks to the agent, then to the coach |
| Agent | Floppy, the AI assistant coach | Local Python worker in a LiveKit Cloud room. No Cloud agent deployment is configured in this repo. | — | Greets on a blank board. After a question, presents from the deck. After handoff, speaks only when the model judges the turn addressed as Floppy or Assistant |
| Coach | A real human | Phone or browser, `/coach` via join link or QR | Slides, overlays, mic, camera, private briefing card, mode label once set | Talks to the player and can address the agent |

## Board tools: the agent changes slide content
The agent can change what is on the current slide, not only which slide is shown. It uses a fixed menu of three tools. The model picks ids from enums in the deck data. It never generates layout, coordinates or free numbers.

| Tool | What appears | Example ask |
|---|---|---|
| `highlight(target)` | A ring or glow on one player marker or one court zone of the current slide's diagram | "Where does Kyrie attack from?" |
| `run_play(play_id)` | One template play animates: markers move, arrows draw, a short caption per step | "Show me how we trap LeBron." |
| `add_callout(fact_id \| text)` | A short note card on the current slide | Coach: "Assistant, put Iguodala on LeBron." |

Shared behavior:
- Every board change goes to the player browser over RPC and waits for the ack, like `show_slide`. The agent does not describe a board change that was not acked.
- Both screens show the same board. The coach's phone and any late joiner render the current overlays.
- All overlays clear when the slide changes.
- `run_play` switches to the play's slide first if needed, through the same acked slide path.
- Limits: at most 2 highlights and 3 callouts at once (the oldest drops). One play at a time; its last frame stays until the slide changes or another play runs.
- Presenter mode: the agent uses `highlight` and `run_play` when they directly answer the question or when asked to show something. It adds a callout only when a human asks to put something up.
- Clicker mode: the prompt allows a board tool when a human addresses the agent as Floppy or Assistant. `run_play` may also run when the humans clearly discuss one of the plays. `show_slide` runs when the topic changes. The prompt says to stay silent unless addressed. It does not cap the addressed reply at one sentence, and the code does not enforce silence.
- Callout guardrail: any callout with a fact or stat must use a `fact_id` from `FACTS.md` (verified = y). The card then shows that approved claim verbatim. Free text is only for short coaching instructions: at most 60 characters and 8 words, one line, no digits, no `%`, no spelled-out numbers. Exact rule: `docs/ARCHITECTURE.md#callout-rule`. This mirrors Synthio's on-label approved-claims guardrail.

Not included: freehand play drawing, model-authored layouts or diagrams, new plays made up live. If asked, the agent says it can run the prepared plays and names them.

## Demo script
1. The player opens `/player` and starts the session. The board stays blank. The agent says the opening greeting and waits. It does not load slide 1 until asked for the plan.
2. Player: "How do we stop LeBron?" The agent shows slide 2 after the ack and answers from the tool result.
3. Player: "Show me how we trap him." The agent calls `run_play(p_blitz_lebron_pnr)`. The blitz animates on slide 2. Captioned steps advance while `lk.agent.state` is `speaking`.
4. Player cuts in: "Wait, what about Kyrie?" LiveKit stops the playout and truncates history. The agent shows slide 3 (the play overlay clears) and answers. Nothing on screen lists the interruption or a turn latency.
5. Player: "Where does he attack from?" The agent calls `highlight(cle_irving)`. The Kyrie marker is highlighted, and the deck's attack zone for him (`z_right_wing`) lights with it.
6. Player: "Get me the head coach." The agent calls `call_head_coach`. After the ack the tool tells the model to say one short line and wait. The line is not fixed. A coach join link and QR appear on the player's screen.
7. A real person opens the link and joins as Coach. Only the coach sees the briefing card: paraphrased topics, the main worry, the summary, and the current slide. The agent then says one handoff line naming that worry and the current slide id. It is not a fixed Kyrie sentence.
8. The agent enters clicker mode and links the coach, then the floor router can move the ear to whichever trusted human is speaking. It stays quiet unless addressed as Floppy or Assistant. It changes slides as topics come up.
9. Coach: "Let's go back to LeBron." The clicker prompt says to show slide 2 without presenting. Coach: "Assistant, put Iguodala on LeBron." The agent may call `add_callout` with short text that passes the callout rule. The card appears on both screens after the ack. The code does not force that exact string.

The demo path uses no mock data and fakes nothing. The coach is a real person.

## Slides
All slides are React, drawn from `deck/deck.json`. Diagrams carry player markers and court zones that the board tools can highlight, and plays that `run_play` animates. Real players appear as licensed paper cutouts from `design/players/` (see `docs/DESIGN-BRIEF.md`). Slide 1 draws GSW/CLE badges when the local logo files are absent. Human camera tiles are separate from the slide. There is no game film and no screen share. Every fact or number on a slide or callout must be in `FACTS.md` with a source URL and verified = y. The slide copy that ships is the deck, not the outline below.

Framing rule: this is a pre-game room before Game 7. Slides may only use facts known before Game 7 (regular season and Finals Games 1-6). Never use the Game 7 result.

Plays and diagrams are a coaching plan, not a claim about what happened. Planner check: the exact steps, marker positions and lineups below are basketball-plausible placeholders. The planner must check them before build. Do not claim a team ran a play in the series, and do not invent shot locations or historical stats. A play caption or zone may not carry a number.

Player marker ids (full list in `docs/ARCHITECTURE.md#deck-data-additions`): Warriors `gsw_curry`, `gsw_thompson`, `gsw_green`, `gsw_iguodala`, `gsw_barnes`; Cavaliers `cle_james`, `cle_irving`, `cle_love`, `cle_smith`, `cle_tthompson`.

### Slide 1 — Tip-off: Game 7 and the three keys
- Shows: the stakes (series tied 3-3, Game 7 at home), and three keys that preview slides 2-5.
- Diagram: none. No highlight targets, no plays. Callouts allowed.
- Agent says in substance: welcome, what is at stake, the three keys, invite questions.
- Routes here: openers and "what's the plan overall".
- Eval examples: "Give me the big picture before we start." / "What are we trying to do tonight?"

### Slide 2 — How do we stop LeBron?
- Shows: defensive plan for LeBron James. Who is the primary defender, help rules, what to give up.
- Diagram: half court, Warriors defending, help-side positions marked.
- Highlight targets: all 10 player markers; zones `z_paint`, `z_top_key`, `z_left_wing`, `z_right_wing`, `z_left_corner`, `z_right_corner`.
- Play: `p_blitz_lebron_pnr` "Blitz the LeBron pick-and-roll". Screen comes at the top, two defenders trap the ball, the back line tags the roller, the weak side rotates. Make someone else beat us.
- Agent says in substance: the coverage, the help rotation, the one thing not to allow.
- Routes here: anything about their best player, their primary scorer and playmaker, number 23.
- Eval examples: "Their big guy keeps bulldozing to the rim, what do we do?" / "Who's on 23?"

### Slide 3 — Kyrie in isolation: who guards him and how
- Shows: plan for Kyrie Irving in isolation. Matchup, when to switch, when to show help.
- Diagram: half court, isolation on the wing, switch / no-switch options. The Kyrie marker starts at the plan's isolation spot.
- Highlight targets: all 10 player markers; zones `z_top_key`, `z_left_wing`, `z_right_wing`, `z_left_elbow`, `z_right_elbow`, `z_paint`.
- Play: `p_switch_kyrie` "Switch everything on Kyrie". A screen comes for Kyrie, the defenders switch, the new defender stays in front, help stays home on the shooters.
- Agent says in substance: who takes him, how to handle the switch, where help comes from.
- Routes here: their point guard, ball handling, one-on-one scoring.
- Eval examples: "Their guard keeps breaking us down one on one." / "What about the other guy who can score from anywhere?"

### Slide 4 — Our offense: Steph and Klay off screens, Draymond as playmaker
- Shows: off-ball screens for Stephen Curry and Klay Thompson, Draymond Green as the short-roll playmaker.
- Diagram: half court, Warriors on offense, screen paths for the shooters, short-roll pass lanes.
- Highlight targets: all 10 player markers; zones `z_top_key`, `z_left_wing`, `z_right_wing`, `z_left_corner`, `z_right_corner`, `z_high_post`, `z_paint`.
- Plays:
  - `p_steph_stagger` "Steph off a staggered screen". Curry starts low, runs off two screens in a row, catches on the wing or top. Shoot, or hit the screener slipping.
  - `p_draymond_short_roll` "Draymond short-roll 4-on-3". The defense traps Curry on the pick-and-roll. Curry passes to Green in the high post. Green plays 4-on-3: lob, corner, or drive.
- Agent says in substance: how we get shooters open, Draymond's reads, what to look for early.
- Routes here: anything about scoring, shooters, getting open, our sets.
- Eval examples: "How do we get our shooters clean looks?" / "What's Dray's job when they trap?"

### Slide 5 — X-factors: Love, bench, fouls, pace
- Shows: Kevin Love matchup, bench minutes, foul situation, tempo.
- Diagram: optional pace or rotation strip (text). No court, so no highlight targets and no plays. Callouts allowed.
- Agent says in substance: the swing factors and what each one asks of us.
- Routes here: role players, depth, foul trouble, speed of the game.
- Eval examples: "What decides this if the stars cancel out?" / "Should we push it or slow it down?"

### Slide 6 — The last two minutes
- Shows: a placeholder "Head coach's call" frame. The agent does not decide late-game plays.
- Diagram: half court, blank for the coach. Zones only, no markers, no plays. The coach can say "Assistant, highlight the left corner."
- Hidden element: the JR card `k_jr_card` (LeBron arms spread at J.R. Smith, from the 2018 Finals). It is pre-placed and hidden. `highlight(k_jr_card)` reveals it through the normal acked board path. Look and fallback: `docs/DESIGN-BRIEF.md#slide-6-the-jr-card`.
- Agent says in substance: this decision belongs to the head coach. Offers to call him.
- JR beat: slide 6 notes tell the model that if they ask about the clock, the score, or closing, it should reveal the JR card after the ack and say one short line, at most once. That limit is in the notes, not a counter in the agent. In clicker mode the prompt only allows `highlight` when addressed. The public build shows the text card when `local-assets/` has no image.
- The JR card is from 2018. It does not reveal the 2016 Game 7 result, winner or MVP, and the agent never does either.
- Routes here: late-game and closing questions. The agent should offer `call_head_coach`.
- Eval examples: "Who takes the last shot?" / "What do we run down one with a minute left?" / "How do we manage the clock at the end?" (expects `highlight(k_jr_card)`).

### Handoff routing (eval)
- "Get me the head coach." / "I want to hear this from Coach." / "Can someone with authority make this call?" -> `call_head_coach`.

## Eval
Intended shape, not a runner. There is no `evals/` directory and no script that executes the items below. Each item was specified with a mode (`presenter` or `clicker`), a starting slide, who speaks, the utterance, the expected tool calls, and forbidden tool calls. Nothing in CI prints a pass rate.

Size: 35-45 items.
- At least 20 slide and handoff items (examples per slide above).
- At least 3 positive items per board tool.
- At least 8 negative items (the agent must not call a board tool, or must not call it with free text).
- Clicker-mode items for addressed and not-addressed turns.

Eval rule: at least half of the slide items and at least one item per board tool must avoid the title words (no "LeBron", "Kyrie", "offense", "trap", "highlight" in those items). This tests understanding, not keyword match.

Baseline, if a runner is added later: run the slide and handoff items once with only `show_slide` and `call_head_coach` registered, then with all five tools. Nothing in this repo does that run. The fallback order in `docs/RISKS.md` has not been applied; all five tools stay registered.

Board tool examples (expected):
| Mode, slide | Speaker: utterance | Expected | Notes |
|---|---|---|---|
| presenter, s2 | Player: "Show me how we trap LeBron." | `run_play(p_blitz_lebron_pnr)` | |
| presenter, s1 | Player: "Walk me through what we do when their best guy comes off a screen." | `run_play(p_blitz_lebron_pnr)` | Agent switches to s2 inside the tool. No title words. |
| presenter, s2 | Player: "Show me the switch on their point guard." | `run_play(p_switch_kyrie)` | Switches to s3. |
| presenter, s4 | Player: "How do we get Steph loose?" | `run_play(p_steph_stagger)` or `show_slide(s4_offense)` only | Either passes. |
| presenter, s4 | Player: "When they double our shooter, what does Dray do with it? Show me." | `run_play(p_draymond_short_roll)` | |
| presenter, s3 | Player: "Where does Kyrie attack from?" | `highlight(cle_irving)`, or `highlight` of the zone where the deck places his marker | |
| presenter, s2 | Player: "Who's guarding their main guy? Point him out." | `highlight(gsw_iguodala)` or `highlight(cle_james)` | No title words. |
| clicker, s6 | Coach: "Assistant, highlight the left corner." | `highlight(z_left_corner)` | |
| presenter, s6 | Player: "What if it's tied and the clock's running down?" | `highlight(k_jr_card)` | Agent says one short JR line. No title words. |
| clicker, s2 | Coach: "Assistant, put Iguodala on LeBron." | `add_callout(text="Iguodala on LeBron")` | Text may vary; must pass the text rule. |
| clicker, s2 | Coach: "Assistant, put his Game 6 number up." | `add_callout(fact_id=F07)` | |
| presenter, s3 | Player: "Write that down: stay home on the shooters." | `add_callout(text=...)` | |

Negative examples (forbidden):
| Mode, slide | Speaker: utterance | Expected | Forbidden |
|---|---|---|---|
| presenter, s1 | Player: "How do we stop LeBron?" | `show_slide(s2_lebron)` | `run_play`, `add_callout` |
| presenter, s4 | Player: "Should we push the pace?" | `show_slide(s5_xfactors)` | `highlight`, `run_play` |
| presenter, s2 | Player: "Put a note up: LeBron scores forty a night." | No callout with text. Agent says it can only post sourced facts. | `add_callout(text=...)` |
| clicker, s2 | Coach: "Assistant, note that he shot badly last game." | No free-text callout. A `fact_id` callout only if a verified fact matches. | `add_callout(text=...)` |
| presenter, s4 | Player: "Draw me a new play where Klay posts up." | No board tool. Agent names the prepared plays. | `run_play`, `add_callout` |
| presenter, s3 | Player: "Highlight Shaq." | No tool. Agent says he is not on the board. | `highlight` |
| presenter, s1 | Player: "Highlight the paint." | Agent asks which play or slide, or calls `show_slide` to a slide with `z_paint` and then `highlight(z_paint)` | `highlight` while s1 is on screen |
| clicker, s2 | Coach to player: "Iguodala's on LeBron tonight, you help early." | No tool, no speech (not addressed) | `add_callout`, `highlight` |
| clicker, s4 | Coach to player: "We need better looks for Klay." | No speech. `run_play(p_steph_stagger)` is allowed (clear play match), not required. | `add_callout`, `highlight`, speech |

## Wow moments
1. Interruption mid-sentence: the agent stops at once and the right slide appears.
2. "Show me how we trap LeBron": the play animates on the court while the agent explains it.
3. A real human joins from a phone and never asks the player to repeat anything. The board on the phone already matches the player's screen.
4. The private briefing card appears only on the coach's phone.
5. Clicker mode: the AI stays quiet but keeps the slides in step with the humans. "Assistant, put Iguodala on LeBron" puts a card on both screens at once.
6. The bottom rail shows whether Floppy is listening, thinking, or speaking while the board moves.

### Agent state on screen
Built: a pill for Listening, Thinking, Speaking, or Waiting, on the player rail and the coach header. The coach side panel also shows Presenter or Clicker once the agent has set `mode`.
Not built: latency per turn, an interruption log, a slide trace, a board trace, or a handoff timeline. `StatusStrip` implements those labels and is not mounted. `chalk-talk-events` is not sent.

## Why Synthio will love it
| Chalk Talk | Synthio |
|---|---|
| Assistant coach presents a game plan | Ather presents to an HCP |
| Player's question moves the deck | A doctor's objection needs the right content |
| Agent runs a play or highlights a player while it talks | A doctor-facing agent pulls up the chart or figure on request and builds the explanation while it speaks |
| Interrupt any time | Natural barge-in on a voice call |
| "Get me the head coach" | Caller asks for a human expert |
| Private briefing card | Warm transfer with context; the caller never repeats themselves |
| Head coach sticks to deck facts | On-label guardrail: answers stay inside approved content |
| Stat callouts need a `fact_id`; free text has no numbers | Approved-claims guardrail: any claim shown maps to an approved claim |
| Board tools are a fixed menu, not generated UI | Regulated content: the agent picks approved assets, it does not author them |
| Unit tests on the callout rule, token roles and board commands. No pass-rate script is in the repo | Synthio's eval framework |

One line: you never repeat yourself to the human. This is a warm handoff in an NBA jersey.

## Acceptance criteria (per brief requirement)
| Requirement | Acceptance check |
|---|---|
| Presents 5-6 slides | 6 slides render from `deck/deck.json` and its synced copies. The opening board is blank. Slide 1 loads when the player asks for the plan, after the ack. |
| Changes slides based on questions | The presenter prompt and `show_slide` description route from deck topics. No eval script reports a pass rate. |
| Changes slide content (board tools) | `highlight`, `run_play` and `add_callout` RPC to the player and wait for the ack. A failure string is returned on timeout or `RpcError`. Stale seq is ignored. Overlays clear on slide change. A late joiner reads `overlay_state`. |
| Callout guardrail | Agent and browser both apply the callout rule. A fact card shows the facts-file claim. Unverified fact ids are not in the tool enum. |
| Can be interrupted | Player speech is handled by LiveKit barge-in. There is no on-screen interruption log. |
| Lightweight frontend | Next.js app, `/player` and `/coach`, run locally. Not deployed to Vercel in this repo. |
| Lightweight backend | One Python agent plus `POST /api/token`. The worker runs locally against a LiveKit Cloud room. No Cloud agent deployment is configured. |
| Demo | README links a recorded video. There is no hosted link in the repo. |
| Grounded facts | Every slide and callout fact appears in `FACTS.md` with a verified source. |

## Ranked deliverables
1. Live deployed link. Not in the repo (ADR-013).
2. A demo video is linked from the README.
3. README: what, how to run, mermaid diagram, decisions summary, known limits.
4. `DECISIONS.md`.
5. Agent-state pill on the rail. The latency and trace panel is not mounted.
6. Eval script. Not in the repo. The item list above is the spec only.
7. Tests that are in the repo include the deck check under `scripts/`, agent pytest (`make agent-test`), and `pnpm test` in `web/`. This file does not quote a count.

## Cut list
Live stats APIs, unlicensed player photos, game film, screen share, freehand play drawing, model-generated layouts or diagrams, new plays made up live, more than 4 plays, board tools beyond the three, moving people between rooms, an STT-LLM-TTS pipeline or a pipeline/Realtime toggle, any-topic deck generation. Human camera tiles are in the app; they are not game film. Team marks on slide 1 are drawn badges unless local logo files are present. Board fallback order if a future eval demands it: drop `add_callout` first, then `highlight`; keep `run_play`. That order has not been applied. The three board tools are all registered.
