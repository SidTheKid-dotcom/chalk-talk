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
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [ ] Screenshots attached (UI tasks) — N/A, not a UI task
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

Screenshots: N/A (not a UI task). Lint: `python3 -m py_compile` on the three scripts (no ruff/mypy config for this path). FACTS.md updated; README/DECISIONS unchanged.

## Report (executor fills)
- Files changed:
  - `FACTS.md` — verified F01–F19 from opened Basketball-Reference pages
  - `scripts/build_facts.py` — FACTS.md → deck/facts.json
  - `scripts/sync_deck.py` — copy to agent/data and web/lib/deck; `--check`
  - `scripts/test_deck.py` — schema, per-slide table, callout captions, digits, negative fixtures
  - `deck/deck.json` — six slides, zones, players, four plays
  - `deck/schema.json` — JSON Schema
  - `deck/facts.json` — generated, 19 verified rows
  - `agent/data/deck.json`, `agent/data/facts.json` — synced copies
  - `web/lib/deck/deck.json`, `web/lib/deck/facts.json` — synced copies
  - `AGENTS.md` — Commands block for task 02
  - `LEARNINGS.md` — fact and caption gotchas
  - `docs/plan/02-deck-and-facts.md` — this report
- Commands run and key output:
  - `python3 scripts/build_facts.py` → `wrote 19 verified facts to deck/facts.json`
  - `uv run --with pytest --with jsonschema pytest scripts -v` → 8 passed (see below)
  - `python3 -m py_compile scripts/build_facts.py scripts/sync_deck.py scripts/test_deck.py` → `py_compile ok`
  - `python3 scripts/sync_deck.py` → copied four files
  - `python3 scripts/sync_deck.py --check` → `sync check passed`; after appending to `web/lib/deck/facts.json` → `copy differs: web/lib/deck/facts.json` exit 1; recopy restored pass
  - grep for post-Game-7 terms: only the prohibition lines in FACTS.md and a slide-6 note that the JR card "does not speak to this series result"
- Not done / not verified:
  - `python` is not on PATH here; commands used `python3` (recorded in AGENTS.md and LEARNINGS.md)
  - No ruff/mypy in this worktree for `scripts/`; syntax-checked with `py_compile`
  - Did not open Game 7 box score content into shipped claims. Series page lists Game 7, Jun 19 and the later result; F08 uses the date and home site from the game list plus Game 6 box 3-3, not the Game 7 score
  - Play titles keep PRODUCT wording (`Draymond short-roll 4-on-3`); digits are banned in points, notes, and captions only

### Facts verified (id, claim, URL, exact page text)

All verified cells: `y (checked by executor 02 on <page title without the site suffix>)`. Document titles on Basketball-Reference include a pipe (`| Basketball-Reference.com`); the suffix was dropped so the markdown table stays at five columns.

| id | Claim | URL | Exact text seen |
|---|---|---|---|
| F01 | 2016 NBA Finals: Cleveland Cavaliers vs Golden State Warriors, both listed as #1 seeds. | https://www.basketball-reference.com/playoffs/2016-nba-finals-cavaliers-vs-warriors.html | Title: `2016 NBA Finals - Cavaliers vs. Warriors \| Basketball-Reference.com`. Heading: `#1 Cleveland Cavaliers (4-3) vs. #1 Golden State Warriors (3-4)`. Claim uses only the #1 seeds, not the series record. |
| F02 | Game 1 (Jun 2): Warriors 104, Cavaliers 89. | same series page | `Game 1, Jun 2` / `Cleveland Cavaliers 89` / `Golden State Warriors 104`. Also Game 1 box: Cavaliers 89, Warriors 104. |
| F03 | Game 2 (Jun 5): Warriors 110, Cavaliers 77. | same series page | `Game 2, Jun 5` / `Cleveland Cavaliers 77` / `Golden State Warriors 110`. |
| F04 | Game 3 (Jun 8): Cavaliers 120, Warriors 90. | same series page | `Game 3, Jun 8` / `Golden State Warriors 90` / `Cleveland Cavaliers 120`. |
| F05 | Game 4 (Jun 10): Warriors 108, Cavaliers 97. Warriors led the series 3-1 after Game 4. | same series page | `Game 4, Jun 10` / `Golden State Warriors 108` / `Cleveland Cavaliers 97`. 3-1 derived from F02–F05. |
| F06 | Game 5 (Jun 13): Cavaliers 112, Warriors 97. | https://www.basketball-reference.com/boxscores/201606130GSW.html | Title: `2016 NBA Finals Game 5: Cavaliers vs Warriors, June 13, 2016 \| Basketball-Reference.com`. Header: `Cleveland Cavaliers 112` `2-3`; `Golden State Warriors 97` `3-2`. Series page also: `PTS 2 tied 41`. |
| F07 | Game 6 (Jun 16): Cavaliers 115, Warriors 101. LeBron James scored 41 (game top scorer). | https://www.basketball-reference.com/boxscores/201606160CLE.html | Title: `2016 NBA Finals Game 6: Warriors vs Cavaliers, June 16, 2016 \| Basketball-Reference.com`. Header: `Golden State Warriors 101` `3-3`; `Cleveland Cavaliers 115` `3-3`. Basic stats: `LeBron James \| 42:35 \| 16 \| 27 \| .593 \| 3 \| 6 \| .500 \| 6 \| 8 \| .750 \| 2 \| 6 \| 8 \| 11 \| 4 \| 3 \| 1 \| 3 \| 41`. Series page: `PTS L. James-CLE 41`. |
| F08 | Series tied 3-3 before Game 7. Game 7 on Jun 19 at Golden State. | series page | Game 6 box both clubs `3-3`. Series page: `Game 7, Jun 19`. Home site from 2-3-2 list (Games 1, 2, 5 box scores at Oracle Arena / `...GSW.html`); Game 7 result on that page was not used. |
| F09 | Game 1 top scorer: Kyrie Irving, 26 points. | https://www.basketball-reference.com/boxscores/201606020GSW.html | Title: `2016 NBA Finals Game 1: Cavaliers vs Warriors, June 2, 2016 \| Basketball-Reference.com`. `Kyrie Irving \| 37:39 \| ... \| 26`. Series page: `PTS K. Irving-CLE 26`. |
| F10 | Game 2 top scorer: Draymond Green, 28 points. | series page | `Game 2, Jun 5` / `PTS D. Green-GSW 28`. |
| F11 | Game 4 top scorer: Stephen Curry, 38 points. | series page | `Game 4, Jun 10` / `PTS S. Curry-GSW 38`. |
| F12 | Game 3 top scorer: LeBron James, 32 points. | https://www.basketball-reference.com/boxscores/201606080CLE.html | Title: `2016 NBA Finals Game 3: Warriors vs Cavaliers, June 8, 2016 \| Basketball-Reference.com`. `LeBron James \| 40:04 \| 14 \| 26 \| .538 \| ... \| 32`. Series page: `PTS L. James-CLE 32`. |
| F13 | Kevin Love scored 17 points and grabbed 13 rebounds in 37:21 in Game 1 (Jun 2). | Game 1 box | `Kevin Love \| 37:21 \| 7 \| 17 \| .412 \| 2 \| 5 \| .400 \| 1 \| 1 \| 1.000 \| 2 \| 11 \| 13 \| 2 \| 1 \| 0 \| 4 \| 2 \| 17`. |
| F14 | 2015-16 Golden State Warriors regular-season record: 73-9, finished 1st in NBA Western Conference. | https://www.basketball-reference.com/teams/GSW/2016.html | Title: `2015-16 Golden State Warriors Roster and Stats \| Basketball-Reference.com`. `Record: 73-9, Finished 1st in NBA Western Conference`. Page also says `Lost NBA Finals (3-4)`; that was not used. |
| F15 | Game 5 (Jun 13): Draymond Green listed as Player Suspended. | Game 5 box | Warriors basic stats: `Draymond Green \| Player Suspended`. |
| F16 | Game 5 (Jun 13): LeBron James 41 points, Kyrie Irving 41 points. | Game 5 box | `LeBron James \| 42:38 \| 16 \| 30 \| .533 \| ... \| 41` and `Kyrie Irving \| 39:47 \| 17 \| 24 \| .708 \| ... \| 41`. |
| F17 | Game 3 (Jun 8): Kevin Love listed Inactive. | Game 3 box | `Inactive: GSW Kevon Looney , James Michael McAdoo CLE Sasha Kaun , Kevin Love`. |
| F18 | Game 6 (Jun 16): Draymond Green 5 personal fouls. | Game 6 box | `Draymond Green \| 40:44 \| 3 \| 7 \| .429 \| ... \| 5 \| 8` (PF 5, PTS 8). |
| F19 | 2015-16 Warriors regular-season Pace: 99.3 (2nd of 30). | GSW 2016 team page | `Pace: 99.3 (2nd of 30)`. |

F06 was split: score stays F06; names are F16 from the Game 5 box. Extra rows F16–F19 (4 of 6 allowed).

### Acceptance evidence

**No post-Game-7 facts** (`grep -n -iE 'result|winner|MVP' FACTS.md deck/deck.json`):
```
FACTS.md:6:- Pre-game framing: ... Do not use the Game 7 result on any slide.
FACTS.md:33:Do not use (post-Game-7 knowledge): Game 7 final score, series winner, Finals MVP.
deck/deck.json:177: ... The card is a later-year joke; it does not speak to this series result.
```
No Game 7 score, series winner, or Finals MVP in claims.

**Schema, rules, negative fixtures, no digits** (`uv run --with pytest --with jsonschema pytest scripts -v`):
```
scripts/test_deck.py::test_schema_and_rules_pass PASSED
scripts/test_deck.py::test_points_notes_captions_have_no_digits PASSED
scripts/test_deck.py::test_bad_caption_fails PASSED
scripts/test_deck.py::test_unknown_marker_fails PASSED
scripts/test_deck.py::test_too_many_steps_fails PASSED
scripts/test_deck.py::test_facts_json_matches_verified_markdown PASSED
scripts/test_deck.py::test_build_facts_duplicate_id_fails PASSED
scripts/test_deck.py::test_build_facts_missing_url_fails PASSED
============================== 8 passed in 0.25s ===============================
```

**Sync check** (`python3 scripts/sync_deck.py --check`):
```
sync check passed
```
Then `echo 'mutated' >> web/lib/deck/facts.json` and `--check` again:
```
copy differs: web/lib/deck/facts.json
check_exit=1
```
Recopy restored `sync check passed`.
