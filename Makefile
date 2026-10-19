.PHONY: agent-dev web-dev agent-test web-lint web-typecheck

agent-dev:
	cd agent && lk agent dev

web-dev:
	cd web && pnpm dev

agent-test:
	cd agent && uv run pytest

web-lint:
	cd web && pnpm lint

web-typecheck:
	cd web && pnpm exec tsc --noEmit
