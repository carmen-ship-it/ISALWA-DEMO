# Contributing to ISALWA OS

Thank you for helping build the commercial operating system for ISALWA.

## Before you start

1. Read [`docs/architecture/ENGINEERING_MASTER_PLAN.md`](docs/architecture/ENGINEERING_MASTER_PLAN.md)
2. Read [`docs/product/PRODUCT_PRINCIPLES.md`](docs/product/PRODUCT_PRINCIPLES.md)
3. Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

## Non‑negotiables

| Rule | Why |
|------|-----|
| Design tokens in `packages/ui` are law | Visual consistency |
| No hardcoded demo screens | Demo = production data path |
| Ports & adapters for vendors | Swap Meta/Maps/AI without rewrites |
| Money as integer centavos | No float drift |
| UI copy in Spanish (`es-BO`) | Product language |
| Code, ADRs, commits in English | Engineering clarity |
| Keep `main` deployable | Always shippable |

## Development setup

```bash
# Node 22+ and pnpm 9.15.4
pnpm install
cp .env.example .env
# Configure DATABASE_URL (see docs/adr/0002-cloud-postgres-carmen-xl.md)

pnpm build
pnpm dev:api   # http://localhost:4000/v1/health
pnpm dev:web   # http://localhost:3000
```

Optional local deps: `pnpm dev:deps` (Docker Compose).

## Workflow

1. Create a branch from `main` using the naming scheme in `docs/github/BRANCHING.md`
2. Stay inside the current milestone / issue scope
3. Run locally:
   ```bash
   pnpm build
   pnpm typecheck
   ```
4. Update docs when architecture, API, or schema changes
5. Open a pull request — CI must be green

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new capability
- `fix:` bug fix
- `docs:` documentation only
- `chore:` tooling / repo hygiene
- `refactor:` no behavior change
- `perf:` performance
- `test:` tests

Keep commits focused. Prefer small PRs (< ~400 LOC when practical).

## Pull requests

Use the PR template. Include:

- Summary (why)
- Test plan
- Screenshots / clips for UI changes
- Notes on migrations or env vars

## Security

Do not open public issues for vulnerabilities. See [`SECURITY.md`](SECURITY.md).

## Questions

Product/architecture decisions belong in ADRs under `docs/adr/`. Prefer a short ADR over a long chat thread.
