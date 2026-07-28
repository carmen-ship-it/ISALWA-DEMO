# ISALWA Architect

Working title. Future rename possible.

**Design your company before you build software.**

> Product north star: [docs/VISION.md](../../docs/VISION.md)  
> **Long-term principles (override missions):** [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)  
> **Agents start here:** [`docs/ai/README.md`](./docs/ai/README.md) — the permanent AI context
> system (context, constitution, architecture, living receipt, mission template).

ISALWA Architect is a separate application from the ISALWA OS product. It interviews companies before software is built — not as customer support, but as a senior architect sitting across the table.

Think:

- Apple onboarding
- Linear simplicity
- Senior consultant who reads before the meeting
- Structured operating-system blueprint (not disposable chat)
- McKinsey discovery rigor

## Purpose

Become the first experience every future client uses before ISALWA builds software.

Every company owns a **living consulting workspace**, a **Knowledge Center**, and a versioned **Business OS Blueprint** — the canonical source for process maps, proposals, PRDs, Cursor prompts, and future ISALWA configuration.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 |
| Language | TypeScript (strict, no `any`) |
| Styling | Tailwind CSS + shadcn/ui |
| Motion | Motion |
| Persistence | Supabase JSONB when configured; localStorage fallback for local/dev |
| Knowledge | Contracts + mock vault (ingestion later) |
| Blueprint | Versioned Business OS model (generation later) |
| AI | OpenAI-compatible provider abstraction (no vendor lock) |

## Getting started

From the monorepo root:

```bash
pnpm install
pnpm --filter @isalwa/architect dev
```

Or build for production from `apps/architect`:

```bash
pnpm build
# or: npm run build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for local ports, Vercel setup, and environment variables.

## Experience

1. **Login** — Spanish premium sign-in (Consultant / Client)
2. **Home** — Consultant company dashboard · Client opens assigned workspace
3. **Workspace** — Memory · Blueprint · Solution · Process Studio · Deliverables · Brand & Experience · Knowledge
4. **Interview** — Guided adaptive discovery (knowledge-aware)
5. **Living Report** — Narrative blueprint companion (evolves across meetings)

## Missions included

| Mission | Focus |
| --- | --- |
| 0 | Foundation |
| 2 | Company Memory & Living Workspace |
| 3 | Knowledge Ingestion Engine |
| 4 | Business OS Blueprint Engine |
| 5 | Consulting Intelligence (deterministic) |
| 6 | Solution Architect (deterministic) |
| 7 | Business Process Engine (deterministic) |
| 8 | Business Process Visualization |
| 9 | Deliverables Engine |
| 9.5 | Executive Experience Polish |
| 10 | Brand & Experience Studio |
| 10 (auth) | Authentication Foundation (pilot) |

See [MISSION10.md](./MISSION10.md).

## Docs

- [Product Vision](../../docs/VISION.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
- [MISSION0.md](./MISSION0.md)
- [MISSION2.md](./MISSION2.md)
- [MISSION3.md](./MISSION3.md)
- [MISSION4.md](./MISSION4.md)
- [MISSION5.md](./MISSION5.md)
- [MISSION6.md](./MISSION6.md)
- [MISSION7.md](./MISSION7.md)
- [MISSION8.md](./MISSION8.md)
- [MISSION9.md](./MISSION9.md)
- [MISSION9_5.md](./MISSION9_5.md)
- [MISSION10.md](./MISSION10.md)
- [WHITE_LABEL_EXPERIENCE.md](./WHITE_LABEL_EXPERIENCE.md)
- [EXECUTIVE_STORYTELLING.md](./EXECUTIVE_STORYTELLING.md)

## Governance

**Start here:** [`docs/ai/README.md`](./docs/ai/README.md) — the permanent Architect AI context
system. Read `01_ARCHITECT_CONTEXT.md`, `02_ARCHITECT_CONSTITUTION.md`, and
`04_ARCHITECT_RECEIPT.md` before starting any new mission.

Permanent, cross-linked governance docs for this app also live under [`docs/`](../../docs/) at the
monorepo root (scoped to `apps/architect` in each doc's own header):

- [Product Constitution](../../docs/PRODUCT_CONSTITUTION.md) — vision, principles, decision filter
- [Security Posture](../../docs/SECURITY_POSTURE.md) — write paths, credentials, threat model
- [Engineering Guidelines](../../docs/ENGINEERING_GUIDELINES.md) — conventions, mission process
- [Architecture Decisions](../../docs/ARCHITECTURE_DECISIONS.md) — the *why* behind shipped engines
- [Operations Runbook](../../docs/OPERATIONS_RUNBOOK.md) — dev, deploy, troubleshooting, recovery
- [Release Checklist](../../docs/RELEASE_CHECKLIST.md) — required checks before every release

Established in [MISSION25.md](./MISSION25.md).

## Independence

This app does **not** depend on `@isalwa/ui`, `@isalwa/web`, or the ISALWA OS product shell.
