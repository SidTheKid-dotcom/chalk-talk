.PHONY: agent-dev web-dev agent-test web-lint web-typecheck

# Once a cloud agent exists (`lk agent create`), a local worker on production
# takes real traffic. Set LIVEKIT_AGENT_DEPLOYMENT then.
agent-dev:
	cd agent && lk agent dev --deployment $${LIVEKIT_AGENT_DEPLOYMENT:-production}

web-dev:
	cd web && pnpm dev

agent-test:
	cd agent && uv run pytest

web-lint:
	cd web && pnpm lint

web-typecheck:
	cd web && pnpm exec tsc --noEmit
