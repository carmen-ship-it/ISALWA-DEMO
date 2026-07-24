# ISALWA OS

Enterprise commercial operating system for **ISALWA S.R.L.** (Bolivia).

UI language: **Spanish (es-BO)**  
Engineering language: English

## Current milestone

**Product Elevation Sprint** — see `docs/product/PRODUCT_ELEVATION.md`  
Last feature milestone approved: **M4 Commercial Loop**

Product law: `docs/product/PRODUCT_PRINCIPLES.md`  
Demo journey: `docs/product/DEMO_JOURNEY.md`

### Preview (Carmen Cursor XL)

```bash
ssh -L 3010:127.0.0.1:3010 -L 4000:127.0.0.1:4000 carmen-aws-dev
# open http://localhost:3010/pulso
```

## Quick start

```bash
# Requires Node 22+ and pnpm 9.15.4
export PATH="$HOME/.local/bin:$PATH"   # if pnpm installed to ~/.local

pnpm install
cp .env.example .env

# Optional dependencies (Docker)
pnpm dev:deps

# Build shared packages then run
pnpm build
pnpm dev:api    # http://localhost:4000/v1/health
pnpm dev:web    # http://localhost:3000
```

Or both with Turborepo:

```bash
pnpm build && pnpm dev
```

## Repository map

| Path | Role |
|------|------|
| `apps/web` | Next.js product UI |
| `apps/api` | NestJS API |
| `packages/ui` | Design system + tokens (law) |
| `packages/contracts` | Zod contracts / shared types |
| `packages/providers` | Integration ports + mocks |
| `packages/database` | Prisma schema + client |
| `packages/domain` | Pure domain logic (no I/O) |
| `docs/` | Architecture, product, ADRs, milestones |

## Approved product docs

- `docs/product/PRODUCT_BLUEPRINT.md`
- `docs/product/UX_PRODUCT_REVIEW.md`
- `docs/architecture/ENGINEERING_MASTER_PLAN.md`

## Design system

All colors, spacing, typography, and motion come from `packages/ui/src/tokens/tokens.css`. Do not invent values in apps.

## Providers

External systems are behind ports in `packages/providers`. Milestone 1 ships mocks. Live adapters replace mocks without UI rewrites.
