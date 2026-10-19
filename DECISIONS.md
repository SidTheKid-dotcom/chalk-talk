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
- **Cost:** Depends on switching audio input to the coach (Spike 1). Risk of the agent speaking when not addressed.
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
- **Cost:** The coach's animation starts when the attribute arrives, so it is not frame-synced with the player's. The coach is not acked: a coach rendering bug fails silently. Attribute size and atomic update behavior are `[UNVERIFIED]`; the value is capped small, and the browser ignores overlays whose `slide_id` differs from `current_slide`.
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
