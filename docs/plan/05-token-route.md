# 05 — Role-checked token route

## Goal
`POST /api/token` mints short-lived, role-scoped tokens for `player` (new random room, explicit agent dispatch) and `coach` (existing room, no dispatch), with the `role` attribute in the token.

## Context
- Contract: `docs/ARCHITECTURE.md#token-route`, `#participant-identities-and-attributes`
- Decision: ADR-001, ADR-014, ADR-022 (replace starter route; no `canUpdateOwnMetadata` for humans)
- Risks: `docs/RISKS.md#risk-6-token-route-production-guard`
- Mistakes: `docs/MISTAKES-TO-AVOID.md` rows 1, 10, 21, 22
- Depends on: 01. Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env` to `web/.env.local`.

## Scope
- Replace the starter's token route. Request and response exactly as in the contract. Grants exactly as listed. TTL about 15 min. `role` set via `AccessToken` `attributes`. Identity `player-<random>` / `coach-<random>`.
- Coach: check the room exists (RoomService list by name) before minting; 404 if not. Use server-side keys only.
- 400 for unknown role or missing room for coach. 405 for GET.
- Update the starter's client code to call the new route with `{"role":"player"}`. Add `/coach?room=...` page stub that requests a coach token and joins (no UI beyond connect status).
- Vitest tests: decode the JWT, assert grants, attributes, TTL, dispatch present only for player, no admin, no `canUpdateOwnMetadata`.

## Out of scope
- Coach UI, briefing, agent changes.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Unit tests | `pnpm test` | output |
| Player token works live | open app | agent log shows dispatch and participant with `role=player` |
| Coach token joins same room | open `/coach?room=<name>` in a second tab | agent log lists both participants with roles |
| Bad requests | `curl` 400 / 404 / 405 cases | curl output (no token values printed) |
| Client cannot change role | in browser console try `setAttributes({role:'coach'})` | error output |

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
