# Chalk Talk web

Next.js app for the player and the coach. `/` redirects to `/player`. `/coach` joins an existing room. `/lab` renders deck fixtures without a LiveKit room.

`POST /api/token` mints the token. `GET` returns 405. The player body is `{"role":"player"}`. The coach body is `{"role":"coach","room":"fr-<16 hex>"}`. TTL is 15 minutes. Human grants publish microphone and camera, not screen share, and they cannot edit their own attributes. Only the player token dispatches `AGENT_NAME`.

`/player` throws at import if `LIVEKIT_URL` is unset. It does not call a homepage agent. The token route also needs `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `AGENT_NAME` in `web/.env.local`. Next.js does not read the repo-root `.env`.

The player and coach screens render the deck from `lib/deck/`. They show a Listening, Thinking, Speaking, or Waiting pill. They do not show a transcript, a latency panel, or a typed question bar. Human cameras sit on a rail beside the slide. In portrait, `/player` says "Rotate your phone or open on a laptop." `/coach` does not.

```bash
pnpm install
pnpm dev --hostname 0.0.0.0
pnpm lint
pnpm exec tsc --noEmit
```

From the repo root, `make web-dev`, `make web-lint` and `make web-typecheck` run those. There is no Vercel project config in this repo.
