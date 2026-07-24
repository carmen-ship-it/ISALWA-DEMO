# Contributing to ISALWA OS

## Rules

1. Read `docs/architecture/ENGINEERING_MASTER_PLAN.md` before structural changes.
2. Design tokens in `packages/ui` are law.
3. No hardcoded demo screens — use the production data model + providers.
4. Prefer expanding ports/adapters over coupling vendor SDKs into domain modules.
5. Keep `main` deployable. Do not leave the repo broken.
6. UI copy is Spanish (`es-BO`). Code and ADRs are English.
7. Money is integer centavos. Never floats.

## Workflow

1. Branch from `main`
2. Implement within the current milestone scope
3. `pnpm build && pnpm typecheck`
4. Update docs if architecture/API/DB changed
5. Open PR — CI must pass

## Commits

Conventional Commits preferred: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
