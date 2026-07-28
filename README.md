# ISALWA OS

**The commercial operating system for ISALWA S.R.L.** — Santa Cruz, Bolivia.

Not a CRM clone. A daily headquarters for field sales, WhatsApp, quoting with price memory, collections, and executive calm.

| | |
|---|---|
| **Product UI** | Spanish (`es-BO`) |
| **Engineering** | English |
| **Stack** | Next.js · NestJS · Prisma · PostgreSQL · pnpm / Turborepo |
| **Status** | `v0.1.0` — foundation through commercial loop + product elevation |
| **Repository** | [carmen-ship-it/ISALWA-DEMO](https://github.com/carmen-ship-it/ISALWA-DEMO) |

---

## Why this exists

ISALWA manufactures ceramic sanitary ware and plastic tanks, and sells through advisors on the street and on WhatsApp. Spreadsheets and chat threads are not an operating system.

**ISALWA OS** puts one living model behind Pulso, Radar, Personas, Territorio, Señal, Cierre, and Comando — so the owner can decide in seconds, and the team can act without inventing prices in chat.

---

## Screenshots / demo

Walk the official **8-minute Demo Journey**: [`docs/product/DEMO_JOURNEY.md`](docs/product/DEMO_JOURNEY.md)

Experiences: **Pulso → Radar → Dossier → Cierre → Territorio → Señal → Comando**

---

## Quick start

**Requirements:** Node.js 22+, [pnpm](https://pnpm.io) 9.15.4, PostgreSQL 16 (local or tunneled).

```bash
pnpm install
cp .env.example .env
# Set DATABASE_URL — see docs/adr/0002-cloud-postgres-carmen-xl.md

pnpm build
pnpm db:migrate
pnpm seed:demo
pnpm seed:validate

pnpm dev:api   # http://localhost:4000/v1/health
pnpm dev:web   # http://localhost:3000
```

Optional Docker dependencies: `pnpm dev:deps`

> Production builds refuse mock providers unless `ALLOW_MOCK_PROVIDERS=1` (audited). Demo previews use that break-glass flag intentionally.

---

## Repository map

```
apps/
  web/          Next.js product UI (Spanish)
  api/          NestJS HTTP API (/v1)
packages/
  ui/           Design tokens + primitives (law)
  contracts/    Shared Zod / types
  providers/    Integration ports + mocks
  database/     Prisma schema, migrations, seed
  domain/       Pure domain logic (no I/O)
  flags/        Feature flags
  ts-utils/     Shared helpers (IDs, etc.)
docs/           Product, architecture, ADRs, milestones
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [`docs/product/PRODUCT_BLUEPRINT.md`](docs/product/PRODUCT_BLUEPRINT.md) | Product vision |
| [`docs/product/PRODUCT_PRINCIPLES.md`](docs/product/PRODUCT_PRINCIPLES.md) | Shipping quality gates |
| [`docs/product/DEMO_JOURNEY.md`](docs/product/DEMO_JOURNEY.md) | 8-minute owner demo |
| [`docs/product/PRODUCT_ELEVATION.md`](docs/product/PRODUCT_ELEVATION.md) | Polish sprint scores |
| [`docs/architecture/ENGINEERING_MASTER_PLAN.md`](docs/architecture/ENGINEERING_MASTER_PLAN.md) | Binding engineering contract |
| [`docs/architecture/DESIGN_INTEGRATION_PROTOCOL.md`](docs/architecture/DESIGN_INTEGRATION_PROTOCOL.md) | Replit ↔ Cursor merge law |
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | Architecture overview |
| [`docs/milestones/`](docs/milestones/) | M1–M4 delivery records |
| [`docs/github/`](docs/github/) | Branching, labels, readiness |

---

## Design system

Colors, spacing, type, motion, and shadows come **only** from
`packages/ui/src/tokens/tokens.css`. Do not invent values in apps.

---

## Integrations

External systems are behind ports in `packages/providers`. Milestone builds ship first-class mocks; live adapters (Meta WhatsApp, maps, PDF, AI) plug in without UI rewrites.

---

## Governance (ISALWA Architect)

`apps/architect` is a separate product from ISALWA OS with its own permanent governance docs
under [`docs/`](docs/):

- [Product Constitution](docs/PRODUCT_CONSTITUTION.md)
- [Security Posture](docs/SECURITY_POSTURE.md)
- [Engineering Guidelines](docs/ENGINEERING_GUIDELINES.md)
- [Architecture Decisions](docs/ARCHITECTURE_DECISIONS.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

See [`apps/architect/README.md`](apps/architect/README.md) and
[`apps/architect/MISSION25.md`](apps/architect/MISSION25.md) for more. ISALWA OS itself is
governed by [`docs/product/PRODUCT_PRINCIPLES.md`](docs/product/PRODUCT_PRINCIPLES.md) and
[`docs/architecture/ENGINEERING_MASTER_PLAN.md`](docs/architecture/ENGINEERING_MASTER_PLAN.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

Security reports: [`SECURITY.md`](SECURITY.md).

---

## License

[MIT](LICENSE) — with a trademark note for the ISALWA name and brand.

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).
