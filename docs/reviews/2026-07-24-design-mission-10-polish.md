# Engineering Review Report — `design/mission-10-polish`

**Reviewer:** Lead Software Engineer (Cursor)  
**Date:** 2026-07-24  
**Base:** `main` (`d893471`)  
**Head:** `origin/design/mission-10-polish`  
**Remote:** https://github.com/carmen-ship-it/ISALWA-DEMO  

---

## Recommendation

# REQUEST CHANGES

**Do not merge `design/mission-10-polish` into `main`.**

The branch is not a design polish PR. It is a **Replit workspace migration** that relocates the production monorepo into `.migration-backup/` and replaces the active root with Express + Drizzle + Vite + shadcn. Merging it would destroy the Nest/Next/Prisma architecture.

---

## Summary of changes

| Area | What happened |
|------|----------------|
| Root workspace | `apps/*` + `packages/*` **removed** from `pnpm-workspace.yaml`; replaced with `artifacts/*`, `lib/*`, `scripts` |
| Root `package.json` | Renamed to `"workspace"`; Turbo/seed/dev scripts removed; `@replit/connectors-sdk` added |
| Production tree | Moved under `.migration-backup/` (Nest, Next, Prisma, docs, CI, docker) |
| New scaffold | `artifacts/` (api-server Express, empty isalwa-web Vite, shadcn mockup-sandbox), `lib/` (Drizzle empty schema, Orval stub) |
| Actual design polish | Lives **only** under `.migration-backup/apps/web` (intro, guided tour, motion system, Cierre/Señal/map polish) |
| Scale | ~306 files, +23k / −3.4k lines |

---

## Categorization of major changes

| Change | Verdict | Why |
|--------|---------|-----|
| Porcelain / kiln / glaze tokens in backup UI | ✅ Keep | Design system law preserved in backup |
| Intro experience + guided tour + motion.ts (backup web) | 🟡 Keep but refactor | Valuable UX; needs port onto `main` without scaffold; reduce inline-style sprawl over time |
| Cierre / Señal / Territorio visual polish (backup web) | 🟡 Keep but refactor | Demo-worthy; restore `@isalwa/ui` headers/panels where stripped |
| `cursor-pointer` / italic display header tweaks | ✅ Keep | Tiny, consistent |
| Relocating monorepo to `.migration-backup/` | 🔴 Reject | Breaks production architecture and GitHub readiness |
| Replacing workspace with Replit artifacts/lib | 🔴 Reject | Parallel stack; conflicts with Nest/Prisma/Next |
| Express `api-server` + open `cors()` | 🔴 Reject | Not our API; security regression |
| Drizzle `lib/db` empty schema | 🔴 Reject | Duplicates Prisma; unused |
| Orval / `api-client-react` health-only stub | 🔴 Reject | Duplicates `@isalwa/contracts` |
| shadcn mockup-sandbox (neutral theme) | 🔴 Reject | Second design system; violates token law |
| Empty `artifacts/isalwa-web` Vite shell | 🔴 Reject | Not a product surface; no `src/` |
| Root `.gitignore` dropping `.env` ignore (scaffold) | 🔴 Reject | Secret-leak risk |
| Removing README/SECURITY/CI/docker from root | 🔴 Reject | Undoes GitHub readiness |
| Dual scripts that `cd` into `.migration-backup` | 🟠 Needs discussion | Operational smell even for Replit demos |
| Hardcoded tour / WhatsApp reply chips | 🟡 Keep but refactor | OK for demo; later i18n / config |
| Agent prompt dumps in `attached_assets/` | 🔴 Reject | Noise, not product |

---

## Files reviewed (representative)

- Root: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.replit`, `replit.md`
- Scaffold: `artifacts/**`, `lib/db/**`, `lib/api-spec/**`, `scripts/run-*.sh`
- Backup product: `.migration-backup/apps/web/src/**` (pulso, cierre, senal, territorio, intro, tour, motion)
- Backup UI: `.migration-backup/packages/ui/src/**`

---

## Salvage performed (without merging the PR branch)

Because Step 4 asks to improve implementation **without changing UX** and **protect architecture**, a clean salvage branch was created:

**Branch:** `integration/mission-10-polish-salvage` (from `main`)

**Accepted onto production paths:**

- `apps/web/src/**` polish from `.migration-backup/apps/web/src`
- New: `intro-experience.tsx`, `guided-tour.tsx`, `signal-conversation.tsx`, `lib/motion.ts`
- `packages/ui` micro-tweaks (`cursor-pointer`, display italic)

**Explicitly excluded from salvage:**

- Entire Replit scaffold (`artifacts/`, `lib/`, root workspace rewrite)
- `.migration-backup/` directory itself
- Express/Drizzle/Orval/shadcn

**Refactors / debt notes on salvage:**

- Technical debt **removed:** parallel stack not imported
- Technical debt **retained (acceptable for now):** heavy inline styles on some screens; partial abandonment of `ExperienceHeader`/`EmptyState` on polished pages — follow-up chore, not a merge blocker for salvage
- No new npm dependencies required (no framer-motion / radix)

---

## Verification (salvage)

See build step results in this review session. Expectation:

- `pnpm --filter @isalwa/ui build`
- `pnpm --filter @isalwa/web build`
- Typecheck web
- Demo routes still App Router + Nest `/v1`

*(Original `design/mission-10-polish` root does **not** build as ISALWA OS.)*

---

## Accessibility / performance observations

| Topic | Notes |
|-------|-------|
| A11y | Intro dismissible (click/ESC); reduced-motion respected in `motion.ts`; tour needs keyboard audit in follow-up |
| Perf | Intro fetches pulse during ceremony (good perceived perf); large page components may hurt RSC boundaries — monitor |
| Security | Salvage keeps production `.gitignore` + Nest API; original branch’s open CORS / `.env` ignore regression avoided |

---

## What must be corrected before approving the original branch

1. **Restore** `apps/*` and `packages/*` as the live workspace (no `.migration-backup` demotion).  
2. **Delete** Replit parallel stack from the PR (`artifacts/`, `lib/db` Drizzle, Orval stub, shadcn sandbox) or move to a clearly isolated `/experiments` that is not default.  
3. **Restore** root `package.json` scripts (turbo, seed, migrate) and GitHub docs/CI.  
4. **Submit polish only** as a PR against `main` touching `apps/web` + `packages/ui` (the salvage branch is that shape).  
5. Follow-up: re-wire polished screens to `@isalwa/ui` primitives to stop inline-style drift.

---

## Next actions (waiting on you)

| Option | Action |
|--------|--------|
| A | Push `integration/mission-10-polish-salvage`, open PR, merge to `main` after your OK |
| B | Leave salvage local; designers re-submit a clean PR |
| C | Something else |

**Original branch `design/mission-10-polish`: not merged.**
