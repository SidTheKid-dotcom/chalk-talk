# 02 — Deck data and facts pipeline

## Goal
`deck/deck.json` holds all six slides, diagrams, zones, markers and the four plays; `deck/facts.json` is generated from verified `FACTS.md` rows; a schema test and a sync check pass.

## Context
- Product: `docs/PRODUCT.md#slides` (all six slides, framing rule, plays)
- Contract: `docs/ARCHITECTURE.md#deck-data-additions` (ids, per-slide table, shape sketch, schema rules), `#callout-rule` (captions must pass rules 3-5)
- Decision: `DECISIONS.md` ADR-011 (fixed deck), ADR-015, ADR-019 (one source, generated copies)
- Facts: `FACTS.md` (rules at the top)
- Design (for marker layout sense only): `design/concepts/slide-2-stop-lebron.jpg` to `slide-6-last-two-minutes.jpg`. Never take names, facts or text from images.

## Scope
1. **Verify facts.** Open the Basketball-Reference box score pages for the 2016 Finals games (links from the series page in `FACTS.md`).
   - F06: find who tied at 41 in Game 5. Split into F06 (score, verified) and a new row with the names, verified only if the box score shows it.
   - F13 (Love), F14 (Warriors 2015-16 record), F15 (fouls / suspension context): fill each with one exact claim and exact URL, or leave `n` with the reason. Only facts known before Game 7.
   - Add up to 6 more facts that the slides need (for example: Green's suspension for Game 5, Warriors' regular-season record). Each with an exact URL that you opened.
   - Write "checked by executor 02 on <page title>" in the Verified cell. No dates.
2. **`scripts/build_facts.py`**: parses the `FACTS.md` table. Writes `deck/facts.json`: `[{"id","claim","slide","source_url","source_domain"}]` with only rows whose Verified cell starts with `y`. Fails on duplicate ids or a missing URL.
3. **`deck/deck.json`**: follows the shape sketch in `docs/ARCHITECTURE.md#deck-data-additions`. Per slide: `id`, `number`, `section` (lower-third text), `title`, up to 3 `points`, `notes` (what the agent may say, in substance), `fact_ids`, `cutouts` (file names from `design/players/`, per `docs/DESIGN-BRIEF.md#player-cutouts`), `diagram` (or null), `cards` (slide 6 `k_jr_card` only). Top level: `players` (id → label, team), `zones` (id → label, shape, box), `plays`.
   - Text on slides with numbers must come from a fact (reference the `fact_id`; do not paste the number into `points`). `points` and `notes` carry no digits unless they quote a fact via its id.
   - Plays: 2-5 steps, captions ≤ 40 chars, no numbers, arrow kinds from the allowed list. Positions are basketball-plausible coaching diagrams (ADR-015; PRODUCT says they are a plan, not a claim).
4. **`deck/schema.json`** (JSON Schema) and **`scripts/test_deck.py`** (pytest): every rule in `docs/ARCHITECTURE.md` "Rules for the deck schema test", plus: slide ids match the enum; each slide's targets match the per-slide table; every `fact_id` exists in `facts.json`; cutout files exist; captions pass the callout text rules 3-5.
5. **`scripts/sync_deck.py`**: copies `deck/deck.json` and `deck/facts.json` to `agent/data/` and `web/lib/deck/` (creates dirs). `--check` exits non-zero if any copy differs. Commit the copies.
6. Run with `uv run --with pytest --with jsonschema pytest scripts`. Add the command to `AGENTS.md` `## Commands` (append; task 01 also edits that section, keep your lines in one block).

## Out of scope
- Agent tools, prompts, web rendering, the callout rule implementation in agent/web (later task). Do not create other files in `agent/` or `web/` besides the data copies.

## Steps
1. Verify facts, edit `FACTS.md`.
2. Write `build_facts.py`, generate `facts.json`.
3. Write `deck.json` slide by slide.
4. Write schema + tests until green. Add one failing-fixture test per rule (bad caption, unknown marker, too many steps).
5. Sync, check, commit in small steps.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Facts verified | each new or changed `FACTS.md` row | list: id, claim, URL, the exact text you saw on the page |
| No post-Game-7 facts | grep `FACTS.md` and `deck.json` for result, winner, MVP | grep output |
| Schema and rules pass | `uv run --with pytest --with jsonschema pytest scripts -v` | full test list output |
| Negative fixtures fail as expected | same run | the named negative tests passing |
| Sync check | `python scripts/sync_deck.py --check`, then edit a copy and run again | both outputs (pass, then fail) |
| No digits outside facts | test that scans `points`, `notes`, captions | test name in output |

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
