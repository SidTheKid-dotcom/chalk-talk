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
- Update the starter's client code to call the new route with `{"role":"player"}`.
- Remove the starter's silent fallback in `web/app/page.tsx` to `https://livekit.com/api/homepage-agent/token` when `LIVEKIT_URL` is unset (audit 01). A missing env must fail loudly, never reach another agent.
- Room names: use a cryptographically random id (for example `fr-` + 10 chars from `crypto.randomUUID()`), not `Math.random()` (MISTAKES row 21).
- Add `/coach?room=...` page stub that requests a coach token and joins (no UI beyond connect status).
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
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed:
  - `web/lib/token.ts`, `web/lib/token.test.ts` — mint player/coach JWTs (`role` attributes, 15m TTL, crypto `fr-` rooms, player-only `RoomConfiguration` dispatch).
  - `web/app/api/token/route.ts`, `web/app/api/token/route.test.ts` — `POST /api/token` per contract; coach `RoomServiceClient.listRooms([name])` → 404; GET 405; 400 for unknown role / missing coach room / invalid JSON. Starter production guard replaced by the role-checked route (ADR-022).
  - `web/app/page.tsx`, `web/components/app/app.tsx` — `TokenSource.custom` POSTs `{"role":"player"}`; missing `LIVEKIT_URL` throws instead of falling back to the homepage agent.
  - `web/app/coach/page.tsx` — `/coach?room=` stub joins and shows connect status.
  - `web/vitest.config.mts`, `web/package.json`, `web/pnpm-lock.yaml` — `pnpm test` / vitest.
  - `web/.env.example`, `README.md` — no homepage-agent fallback; document the role-checked route.
  - `LEARNINGS.md`, `docs/plan/05-token-route.md` — report and gotchas.
  - Merge from `main` brought in deck/facts copies (no conflict).
  - Not committed: `.env`, `web/.env.local`, `agent/.env.local`.
- Commands run and key output:
  - LiveKit docs MCP: `AccessToken` options take `attributes` + `ttl`; `addGrant(VideoGrant)`; `roomConfig` + `RoomAgentDispatch`; `TokenVerifier.verify`; `RoomServiceClient.listRooms(names?)`; `TokenSource.custom`. Docs: `/frontends/reference/tokens-grants/`, `/agents/server/agent-dispatch/`.
  - `cd web && pnpm test` — `Test Files  2 passed (2)` / `Tests  12 passed (12)`.
  - `cd web && pnpm lint && pnpm exec tsc --noEmit` — exit 0. Two pre-existing starter warnings in `agent-audio-visualizer-*.tsx` (not touched).
  - `make agent-dev` — `registered worker {"agent_name": "chalk-talk-agent", ...}`.
  - `make web-dev` — Ready at http://localhost:3000.
  - Player live (`/` Start call, room `fr-47f4c57215`, identity `player-2455767379`):
    - Agent: `received job request {"dispatch_id": "AD_HT3gUgPfCJFq", "room": "fr-47f4c57215", "agent_name": "chalk-talk-agent", ...}`
    - Agent: `RoomIO linked to participant {"lk.pii.participant_identity": "player-2455767379", "lk.pii.room_name": "fr-47f4c57215", ...}`
    - `lk room participants get --room fr-47f4c57215 -i player-2455767379` → `attributes: { "role": "player" }`, permission `canSubscribe/canPublish/canPublishData` only (no admin, no `canUpdateMetadata`).
  - Coach live (`/coach?room=fr-47f4c57215`): page text `connected as Coach in fr-47f4c57215`. `lk room participants list` → `player-2455767379`, `coach-d9b5248820`, `agent-AJ_2yTRETg2nPgH`. Coach get → `attributes: { "role": "coach" }`.
  - Bad requests (no token values): GET 405 `Method Not Allowed` `Allow: POST`; POST `{"role":"admin"}` 400 `{"error":"Unknown role"}`; POST `{"role":"coach"}` 400 `{"error":"room is required for coach"}`; POST `{"role":"coach","room":"fr-doesnotexist"}` 404 `{"error":"Room not found"}`. Player POST 200 returns `roomName`/`participantName`/`serverUrl`/`participantToken` (token not printed).
  - Client cannot change role (player tab `window.__lk_room.localParticipant.setAttributes({role:'coach'})`): `SignalRequestError: does not have permission to update own metadata` (code 15). Attributes stayed `{role: "player"}`.
  - Screenshots: player connected `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf2tgyx-c15b4eda.png`; coach stub `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf2thb5-b0bbe8a5.png`.
- Not done / not verified:
  - Voice / mic not required and not verified (preview browser has no usable mic; player still joined and dispatched).
  - Coach UI, briefing, and agent mode changes are out of scope.
  - Not pushed.
