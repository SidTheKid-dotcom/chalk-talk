# Decisions

ADR-style. Each entry: decision, why, alternatives rejected, cost, how we'd revisit. Newest decisions go at the bottom with the next number. Status is "accepted" unless marked.

---

## ADR-001: One LiveKit room per session
- **Decision:** Each session is one LiveKit Cloud room with a random name. Participants: player, agent, coach.
- **Why:** A real human coach joins live. Three parties must hear each other in one call. A room with a server-side agent is the simplest way to get that.
- **Rejected:** Direct browser-to-OpenAI Realtime (1:1 only, no room). A fixed shared room name (sessions collide; seen in a reference repo).
- **Cost:** More moving parts: an agent server, a token route, cold starts on the free tier.
- **Honest note:** Without the human join we would not add LiveKit. For a single user, direct Realtime is the fastest path.
- **Revisit:** If the human handoff is cut, reconsider direct Realtime.

## ADR-002: GPT Realtime as the voice model
- **Decision:** `AgentSession` uses OpenAI GPT Realtime (`openai/gpt-realtime-2.1`) via LiveKit Inference or the OpenAI plugin.
- **Why:** Most natural voice, native tool calls, lowest effort. In LiveKit the model is one config line, so it can change later.
- **Rejected:** STT-LLM-TTS pipeline as default (more control and live captions, but more tuning; kept as the fallback). A live pipeline/Realtime toggle (cut for scope).
- **Cost:** The model may speak before calling `show_slide`. With server VAD, most LiveKit interruption options (including adaptive interruption) do not apply. User transcripts arrive late. No exact scripted `say()`. Higher per-minute cost than a cheap pipeline.
- **Revisit:** If Spike 2 shows speech before the tool call in more than a small share of eval runs, switch to the pipeline (one config change plus STT/TTS choice).

## ADR-003: Not direct browser Realtime
- **Decision:** Do not connect the browser straight to OpenAI Realtime.
- **Why:** No room, so no human join. Prompt and tools live in the client. No server-side guardrails or audit.
- **Rejected because:** It fails the core demo (human handoff).
- **Crisp answer:** "For one user that's the fastest path. Your product is multi-party and regulated: a human expert joins, you need auditable transcripts and server-side guardrails, and you'll swap models per call. That needs a room with a server-side agent, which is LiveKit. Realtime is one config line there."
- **Revisit:** Single-user prototypes.

## ADR-004: Not Deepgram Voice Agent API
- **Decision:** Do not use Deepgram's Voice Agent WebSocket.
- **Why:** It is a single-user WebSocket. No room. Needs a hand-built audio bridge and hand-built playback cancellation.
- **Cost of choosing LiveKit instead:** More setup.
- **Revisit:** Phone-only single-caller bots where a managed socket is enough.

## ADR-005: Not Pipecat
- **Decision:** Use LiveKit Agents, not Pipecat.
- **Why:** Pipecat is a good pipeline framework but does not ship its own media server. LiveKit gives the room (SFU), agent framework, client SDKs with RPC and attributes, and Cloud deploy together.
- **Cost:** Some gravity toward LiveKit Cloud features.
- **Revisit:** If we needed a different transport provider.

## ADR-006: RPC with ack for slide changes
- **Decision:** `show_slide` uses `perform_rpc` to the player and waits for an ack before returning the tool result.
- **Why:** The agent must not talk about a slide that is not on screen. On timeout or error the tool returns a failure string, so the model does not narrate a missing slide.
- **Rejected:** Fire-and-forget broadcast (one reference repo skips the ack for latency; the UI can fail silently). Data packets (no response). Attributes alone (no ack).
- **Cost:** One extra round trip. Render is local, so this is small. Measure it in Spike 3.
- **Caveat:** The ack blocks the tool result, not audio the model already produced in the same response (see ADR-002).
- **Revisit:** If measured round trip hurts the feel.

## ADR-007: Increasing seq on every show_slide
- **Decision:** The agent attaches an increasing `seq`. The browser ignores any seq at or below the last applied one.
- **Why:** After interruptions, out-of-order or stale calls must not flip the slide back.
- **Rejected:** Abort controllers only (stop streams, not out-of-order RPC). Timers.
- **Cost:** A counter and a check. Tested in unit tests.
- **Note:** ADR-016 extends this one counter to the board RPCs (`highlight`, `run_play`, `add_callout`).

## ADR-008: Participant attribute for the current slide
- **Decision:** After an ack, the agent sets `current_slide` and `slide_seq` attributes.
- **Why:** Attributes are state of record. Late joiners (the coach) and reconnects render the right slide for free.
- **Rejected:** Re-sending RPC on join (extra code, race-prone).
- **Cost:** Two state paths (RPC command, attribute state). Kept consistent by setting the attribute only after ack.

## ADR-009: Private text-stream briefing for the coach
- **Decision:** The briefing is sent as text with `topic="coach-briefing"` to the coach identity only.
- **Why:** A card is faster to read than to listen to. The player does not hear it. It is auditable.
- **Rejected:** A spoken whisper (needs a separate consultation room). A broadcast message (the player would see it).
- **Cost:** The coach must glance at the phone.
- **Revisit:** SIP or phone handoff, where a spoken whisper in a consultation room fits.

## ADR-010: Clicker mode instead of the agent leaving
- **Decision:** After handoff the agent stays in the room, stays quiet, changes slides as topics come up, and speaks only when addressed as "Assistant".
- **Why:** The humans keep a synced deck without touching anything. It shows the agent supporting the human, not replacing them.
- **Rejected:** Agent leaves the room (slides stop following). Moving participants between rooms (cut for scope).
- **Cost:** Depends on switching audio input to the coach (Spike 1). Risk of the agent speaking when not addressed. Spike 1 (task 06) passed: mid-session `set_participant` works with GPT Realtime; the agent then hears only the coach. Coach leave currently closes the session (default `close_on_disconnect`); fallback-to-player is proposed, not built.
- **Fallback:** The coach taps slides on the phone.

## ADR-011: Fixed hand-built deck, not generated
- **Decision:** Six hand-built slides about one game. No "any topic" generation.
- **Why:** Every fact must be sourced. A generated deck cannot be checked live. A fixed deck lets us test routing with an eval and keeps the demo honest. It mirrors on-label content: the agent speaks only from approved material.
- **Rejected:** LLM-generated deck from a topic (unverifiable facts, slower, less polish).
- **Cost:** Not reusable for other topics without new content.
- **Revisit:** If reviewers weight "any topic" heavily, the deck format is data-driven, so a new deck is a new data file.

## ADR-012: Python agent, not Node
- **Decision:** Agent is Python `livekit-agents`.
- **Why:** The Python SDK leads on turn and participant features (for example `set_participant` for multi-participant listening is documented as Python-only), and has the most examples.
- **Rejected:** Node agent (one language end to end, but behind on these features).
- **Cost:** Two languages in the repo.

## ADR-013: Managed hosting
- **Decision:** Agent on LiveKit Cloud (`lk agent create`). Frontend on Vercel.
- **Why:** Fastest path to a live link that reviewers can click.
- **Rejected:** Self-hosting LiveKit server and agent (more ops; loses Cloud-only extras).
- **Cost:** Free-tier cold starts of about 10-20 s and hard usage caps. Warm up before sharing.
- **Revisit:** Production with PHI would need a paid plan with a BAA, or self-hosting.

## ADR-014: Role-scoped tokens with explicit dispatch
- **Decision:** Token route sets `role`, uses a random room, explicit agent dispatch (player only), short TTL, and no admin grants.
- **Why:** Anonymous users must not get `roomAdmin`. The agent must know who is player and who is coach from attributes, not join order.
- **Rejected:** `roomAdmin: true` for everyone (seen in a reference repo). Open GET token route.
- **Cost:** The coach link is a bearer link. Anyone with it can join. Noted as a known limit.

## ADR-015: Bounded board tools, not generative UI or slide-switch only
- **Decision:** The agent can change slide content with three tools: `highlight(target)`, `run_play(play_id)` and `add_callout(fact_id | text)`. Targets, plays and facts are enums from the deck and facts data. Each tool uses the acked RPC path of `show_slide`. Overlays clear on slide change. The tools work in presenter and clicker mode.
- **Why:** Switching slides only shows a static page. Pointing at a player, running a play and pinning a note let the agent build the explanation while it talks. That is the closest match to a doctor-facing agent that pulls up a chart on request. A fixed menu keeps every pixel checkable: the model picks ids, the deck owns geometry and text, and stats come only from verified `FACTS.md` rows.
- **Rejected:** Slide switch only (safe, but the deck stays static and the "agent builds the explanation" moment is lost). Freehand or generative UI, where the model emits layout, coordinates or components (seen as the goal of `thesysdev/voice-agent-generativeui`; unverifiable output, invented plays and numbers on screen, hard to eval, more latency). Freehand play drawing by the user (cut for scope).
- **Clicker trigger:** Any board tool when a human addresses the agent. `run_play` also when the humans clearly discuss a prepared play. Highlight and callout need address, because an unasked note on the coach's screen is noise.
- **Cost:** Five tools instead of two, so more wrong-tool risk and more eval items. More frontend work: overlay layer, animation, two callout card styles, attribute rendering on the coach page. More RPC round trips per turn, and `run_play` may chain two (slide, then play).
- **Revisit:** Run the slide eval items with two tools, then with five. If the slide pass rate drops, or board items fall below the planner's bar, cut in this order: `add_callout`, then `highlight`. Keep `run_play`, because it carries the demo moment.

## ADR-016: Overlay sync by acked RPC to the player plus an agent attribute
- **Decision:** Board changes go to the player as RPC with an ack. After `applied: true`, the agent writes the result into its own participant attribute `overlay_state` (JSON, ids only). The coach page and late joiners render from the attribute. One agent-owned `seq` covers all agent -> player commands. A slide change writes the new slide and a cleared `overlay_state` in one `set_attributes` call.
- **Why:** Same pattern as ADR-006 and ADR-008: RPC is the command with an ack that gates narration, the attribute is state of record. Late joiners and reconnects get the current board for free. One counter makes order clear across methods, so a stale highlight cannot land on a newer slide.
- **Rejected:** RPC broadcast to both identities (two acks per change; what to do when only one acks; a late joiner needs a replay of past commands). Room metadata or room attributes (set through the server API, a second state surface next to `current_slide`, write rights `[UNVERIFIED]`; no gain over the agent attribute). Attribute only, no RPC (no ack, so the agent could narrate a board the player never saw). A data packet or text stream to both (no ack, no state for late joiners).
- **Cost:** The coach's animation starts when the attribute arrives, so it is not frame-synced with the player's. The coach is not acked: a coach rendering bug fails silently. Attribute size is limited to 64 KiB total (verified); atomic update is not documented; the value is capped small, and the browser ignores overlays whose `slide_id` differs from `current_slide`.
- **Revisit:** If the coach lag is visible in the Loom, or if the coach ever needs to be guaranteed in sync (e.g. a regulated audit of what each party saw), send RPC to both and ack both.

## ADR-017: Callout guardrail
- **Decision:** A callout is either a `fact_id` or short free text. A fact card shows the `FACTS.md` claim verbatim, with its id and source. Free text is a coaching instruction: 3-60 characters, at most 8 words, one line, no digits, no `%` `#` `$`, no spelled-out numbers from two upward. The agent and the browser both check it. Exact rule: `docs/ARCHITECTURE.md#callout-rule`.
- **Why:** Any stat on screen must be sourced. It mirrors Synthio's approved-claims guardrail: the agent may show a claim only from approved content, with the reference attached. Coaches still need quick notes like "Iguodala on LeBron", which carry no claim.
- **Rejected:** Free text with a model-side "be accurate" prompt only (cannot be checked). Fact callouts only (blocks the coach's matchup note, the clicker demo moment). A classifier for claims (more latency and another model to eval).
- **Cost:** The code check catches numbers, not every claim. "He shot badly last game" passes the code rule. The prompt and eval negatives must cover it. "one" is allowed so "one-on-one" works, which leaves a small gap.
- **Revisit:** If eval or demo runs show unsourced claims in text callouts, restrict text to a pattern ("<our player> on <their player>", plus a short list of instructions).

## ADR-018: Real player photos as licensed paper cutouts; broadcast meme kept local-only
- **Decision:** Real players appear as Wikimedia Commons photos under CC BY, CC BY-SA or public domain, cut out and stored in `design/players/` with `CREDITS.md`. The app renders them as paper cutouts with a typewriter name caption and a visible "Photo credits" link. The slide 6 LeBron and J.R. Smith meme is a broadcast frame. It lives in the gitignored `local-assets/` folder, is loaded only at dev and demo time, and falls back to a text-only card when missing. It is revealed by `highlight(k_jr_card)`, a new card id in the existing target enum.
- **Why:** Faces make the film room feel real. The repo is public, so every committed image must carry a license that allows reuse and modification, with credit. CC BY-SA cutouts are shared under the same license. The meme has no reusable license, so it cannot be committed or deployed. A fallback card keeps slide 6 working without it. Reusing `highlight` keeps the board a fixed menu with no new tool.
- **Rejected:** Getty, AP, NBA.com or news photos (no reuse license). Committing the meme (not licensable). A new `show_card` tool (one more tool for one beat; more wrong-tool risk).
- **Cost:** Some photos are from other seasons than 2016 (see `CREDITS.md`). Background removal edges are imperfect at small sizes. The public build shows the fallback card, not the meme.
- **Revisit:** If a licensed photo from the 2015-16 season appears for a player, swap it in and update `CREDITS.md`.

## ADR-019: One deck source, generated copies for each deploy
- **Decision:** `deck/deck.json` is the only hand-edited deck file. `deck/facts.json` is generated from `FACTS.md` by `scripts/build_facts.py` (verified rows only). `scripts/sync_deck.py` copies both into `agent/data/` and `web/lib/deck/`. The copies are committed. `scripts/sync_deck.py --check` fails if a copy differs from the source, and both test suites run it.
- **Why:** The agent builds on LiveKit Cloud from `agent/` and the frontend builds on Vercel from `web/`. Neither build reliably sees files outside its folder. Committed copies with a check keep one source without depending on monorepo build settings.
- **Rejected:** Import `../deck` from both sides (breaks isolated builds). Hand-kept copies (drift). Serving the deck over RPC or attributes (the browser needs geometry before the agent connects).
- **Cost:** A sync step. Forgetting it fails the check, not the demo.
- **Revisit:** If both deploys move to one monorepo build.

## ADR-020: App RPC error codes 2001-2007
- **Decision:** App `RpcError` codes move from 1001-1007 to 2001-2007. Meanings are unchanged.
- **Why:** The LiveKit RPC doc reserves 1001-1999 for LiveKit internal errors (verified with `lk docs`, RPC page, "Errors"). Our planned codes collided.
- **Rejected:** Keep 1001-1007 (could be confused with built-in errors such as 1500 or 1502).
- **Cost:** None. Nothing was built.

## ADR-021: Spikes land on the real scaffold
- **Decision:** Spikes run on the real `agent/` and `web/` setup. Spike 3's RPC client and browser handler are written as production code with tests, and are kept if the auditor approves. Spike 2's measurement harness lives in `evals/spikes/` and is not in the demo path.
- **Why:** The RPC ack path is core code in every later task. Writing it twice wastes effort.
- **Rejected:** Throwaway branches for every spike (`docs/RISKS.md` default).
- **Cost:** Spike code gets a full review. If a spike fails, its code is reverted before the fallback.

## ADR-022: Own role-checked token route; human tokens cannot edit attributes
- **Decision:** Replace the starter's token route with `POST /api/token` per `docs/ARCHITECTURE.md#token-route`. Player and coach tokens do not get `canUpdateOwnMetadata`. The `role` attribute is set in the token.
- **Why:** The participant-attributes doc says a participant with `canUpdateOwnMetadata` can update its own attributes. A player could then claim `role=coach`. The starter's production guard exists because its route mints open tokens; a role-checked route with short TTL and no admin grants is the deliberate fix, not a deleted guard.
- **Rejected:** Patch the starter route (keeps its open shape). Deleting the guard without a replacement.
- **Cost:** The browser cannot set its own attributes. Not needed: the agent owns all state.

## ADR-023: Plays carry their own start formation; slides carry matchups
- **Decision:** A play may set `start` (marker positions and ball holder). Slides with markers set `matchups` (defender to player). The deck test enforces simple basketball rules: defenders between their man and the rim at start, no screener holds the ball, the ball moves only by a pass, trappers stay near the ball.
- **Why:** Slide 4 has two plays that need different formations (stagger with Curry low; pick-and-roll with Curry up top). The first deck draft broke basic basketball (a defender behind his man, a ball handler setting a screen). A reviewer who knows basketball sees that at once. Rules in a test stop it from coming back.
- **Rejected:** One slide per play (more slides than the brief allows). Freehand per-play layout chosen by the model (ADR-015).
- **Cost:** One more short animation step before a play. A few more schema fields.

## ADR-024: OpenAI plugin first, LiveKit Inference as automatic fallback
- **Decision:** The agent's realtime model is a `RealtimeModelFallbackAdapter` (livekit-agents 1.8.8, `livekit.agents.llm`) over an ordered list from `REALTIME_PROVIDERS` (default `openai,inference`). `openai` is the OpenAI plugin (`openai.realtime.RealtimeModel`) with our `OPENAI_API_KEY`; `inference` is LiveKit Inference (`inference.RealtimeModel`). Both use `REALTIME_MODEL` (default `gpt-realtime-2.1`) and voice `marin`. Evals pin `REALTIME_PROVIDERS=openai`. Rooms, RPC, attributes, dispatch and agent hosting stay on LiveKit. Amends ADR-002.
- **Why:** The free Build plan caps LiveKit Inference at $2.50 of credit a month (about 50 realtime minutes) and 5 concurrent realtime sessions, as a hard cap (quotas doc; `lk docs pricing-info`). With Inference first, the credit would run out during the Loom or reviewer sessions, and every later session would pay a failed connect before the swap. OpenAI first keeps every session smooth and turns the free credit into an outage backup. The adapter keeps chat context and re-issues an in-progress reply on swap (adapter docstring). `gpt-realtime-2.1` is available on our key (`GET /v1/models/gpt-realtime-2.1` returned 200).
- **Rejected:** Inference first with OpenAI fallback (credit cliff, slower starts after it). OpenAI only (no failover story). Upgrading the LiveKit plan (billing setup for a demo). `gpt-realtime-2.1-mini` by default (kept as a one-variable option; tool-choice quality matters more than cost).
- **Cost:** Model usage bills to our OpenAI account. Our OpenAI org's data settings apply on the primary path. One more secret on LiveKit Cloud (`OPENAI_API_KEY`). The adapter requires both models to agree on audio output and turn detection capabilities; a mismatch raises at startup.
- **Synthio angle:** The voice agent survives a model provider outage mid-call with context kept. That is the reliability story a regulated voice product needs.
- **Revisit:** On a paid LiveKit plan, consider `inference,openai` for one bill and Inference's own OpenAI/Azure routing.

## ADR-025: Coach leave returns the agent to the player; "addressed" is judged by the model
- **Decision:** (1) The agent session must survive the coach leaving. Disable close-on-disconnect for the linked participant, and on `role=coach` leave, find `role=player`, `set_participant(player)`, restore presenter instructions and set `mode=presenter`. If no player remains, end the session. (2) In clicker mode, the model decides whether a turn is addressed to it ("Assistant, ...", or clearly a request to the board), from the instruction and examples. No string match on the word "Assistant".
- **Why:** Spike 1 showed the default closes the whole session when the linked coach hangs up (`CloseReason.PARTICIPANT_DISCONNECTED`), which would strand the player mid-demo. It also showed realtime ASR heard "Assistant" as "Distant"; the model still acted correctly, while a keyword check would have failed (and keyword routing is banned, MISTAKES row 7).
- **Rejected:** Keep the default close (fragile demo). Hear both humans (not supported: one linked participant). A keyword gate on "Assistant" (brittle, banned).
- **Cost:** More state to test: presenter -> clicker -> presenter. The model may answer a turn not meant for it; clicker eval items cover addressed and not-addressed turns (Risk 7).
- **Revisit:** If eval shows unaddressed replies above the planner's bar, disable audio output in clicker mode except after an explicit address (`session.output.set_audio_enabled`).

## ADR-026: Keep GPT Realtime; allow a short content-free lead-in before slide tools
- **Decision:** Stay on `gpt-realtime-2.1` (no pipeline fallback). The presenter may say one short lead-in ("One sec, pulling up the LeBron plan.") before `show_slide` or a board tool, but never plan content, assignments, names of plays' steps, facts or numbers before the tool result. The prompt states this rule with examples. The full eval checks it (pre-tool line at most 20 words and no slide content) and also checks that post-tool narration is grounded in the tool result.
- **Why:** Spike 2 (task 04, 312 text turns on OpenAI) measured any-speech-before-tool at 57% in config B, below the 90% bar the harness implemented. The bar in the task file was "tool before slide speech". Planner review of all 344 pre-tool lines: max 21 words, mean 12.7; a content-marker scan (digits, player names, plan terms, facts) flagged 31, and all 31 only echo the user's topic ("pulling up that trap look"). Slide content before tool: 0 of 344. Correct tool 96-100%. Board tools cost 5.8 points of tool-first vs two tools, within the 10-point limit. A lead-in also covers the RPC round trip (median 117 ms, Spike 3): the slide lands while the line plays.
- **Rejected:** STT-LLM-TTS pipeline (more latency and tuning; it does not remove pre-tool text either, since text LLMs also lead in before tool calls). Forcing `tool_choice` on every turn (blocks small talk; untested on realtime audio ordering).
- **Cost:** A lead-in can promise a slide that then fails to show; the tool returns FAILED and the model must say so. Grounding is enforced by prompt and eval, not by code.
- **Found in the same run:** With a title-only stub result, the model invented slide content ("three keys" not in the deck). The real tool result must carry the slide's points, notes and fact claims, and the prompt must say to speak only from them. "Push or slow it down?" went to s1 instead of s5 five times: tool descriptions must list each slide's topics from deck data.
- **Open:** Audio check (10 spoken turns) not done; needs a human mic (`evals/spikes/audio_check.sh`).

## ADR-027: Hardwood Broadcast replaces Scouting Packet
- **Decision:** Redesign only the frontend around the Hardwood Broadcast direction in `docs/DESIGN-BRIEF.md`: fixed 16:9 hardwood stage, large condensed headlines, dark matte coaching panels, scoreboard/rail chrome, no visible speech captions or typed question bar, and short horizontal push transitions. Player and coach video tiles remain outside the slide geometry. Agent, deck, facts, RPC and tool contracts do not change.
- **Why:** User testing found the Scouting Packet type too small and long captions could influence layout. A reference voice-slide demo showed a better interaction hierarchy: stable fitted canvas, fewer larger groups, state-only voice chrome, visible human presence and spatial slide transitions. The existing `design/hardwood/` concepts already express that hierarchy in the basketball theme.
- **Rejected:** Keep polishing the paper layout (does not solve the preference mismatch). Copy the reference demo's visual theme (wrong product). Let the model rewrite slide text, as some demos allow (conflicts with sourced, approved game-plan content).
- **Cost:** A focused frontend rewrite and new visual regression baseline. Existing deck, board tools and handoff logic remain reusable.
- **Guardrail:** Static slide copy stays immutable. The agent may highlight, run prepared plays and add guarded callouts only.

## ADR-028: One debounced active-human floor after handoff
- **Decision:** After the coach handoff, keep one `RoomIO` linked participant and route it between trusted `role=player` and `role=coach` humans from `active_speakers_changed`. Hold the current participant while they remain active. Otherwise debounce for 200 ms before switching. On coach leave, disable the router and restore the player/presenter path.
- **Why:** `RoomIO.set_participant()` accepts one identity, but the shared clicker should hear sequential requests from either human. Holding the current active floor prevents overlap from flapping the realtime input.
- **Rejected:** Mix both microphone tracks into a custom input (more media plumbing and echo risk). Trust join order or identity prefixes (roles are the contract). Keyword intent routing (brittle and banned; the model remains the semantic gate). Switching immediately on every speaker event (thrashes during overlap).
- **Cost:** A new speaker's first audio can precede the debounced switch. Live phone/laptop validation may show clipping or instability that unit fakes cannot reproduce.
- **Fallback:** Keep both camera feeds but link only the coach after handoff, as verified in Spike 1.
