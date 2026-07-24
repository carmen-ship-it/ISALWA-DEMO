# Pull Request Summary — Mission 10 Design Integration

**Merged into:** `main`  
**Accepted from:** `integration/mission-10-polish-salvage`  
**Rejected:** `design/mission-10-polish` (architecture-breaking Replit scaffold)  
**Date:** 2026-07-24  
**Repo:** https://github.com/carmen-ship-it/ISALWA-DEMO

---

## What was accepted (and why)

| Design improvement | Why it ships |
|--------------------|--------------|
| **Intro experience** (`/`) | Ceremonial first impression; loads live Pulso KPI; dismissible; session-once |
| **Guided tour** | Helps the owner discover experiences without changing the data model |
| **Motion system** (`lib/motion.ts` + CSS) | Aligns JS animation with design tokens + reduced-motion |
| **Pulso / Radar / Personas / Dossier polish** | Stronger hierarchy, presence, and demo clarity |
| **Territorio map interactions** | Exploration, filters, hover — still seed/API-backed |
| **Señal conversation UX** | Calmer thread UI via `signal-conversation` |
| **Cierre / Quote canvas polish** | Last-price moment reinforced; still production commerce APIs |
| **Comando / shell micro-polish** | Keyboard gravity and tour hooks |
| **UI micro-tweaks** (`cursor-pointer`, display italic) | Token-aligned, tiny |

All of the above landed on the **existing** Next.js App Router + `@isalwa/ui` + Nest `/v1` stack.

---

## What was rejected (and why)

| Change in `design/mission-10-polish` | Why rejected |
|--------------------------------------|--------------|
| Relocating monorepo to `.migration-backup/` | Demotes production source of truth |
| Replit `artifacts/` + Vite/Express apps | Parallel framework / stack migration |
| Drizzle `lib/db` + Orval stubs | Duplicates Prisma + contracts |
| shadcn default theme sandbox | Second design system vs porcelain law |
| Root workspace / package.json rewrite | Breaks Turbo, seed, CI, GitHub readiness |
| Open CORS Express health stub | Not our API; security regression |

---

## Engineering outcome

- Production architecture remains NestJS + Next.js + Prisma + pnpm/Turborepo  
- Design polish survives on `main`  
- Permanent rule: [`docs/architecture/DESIGN_INTEGRATION_PROTOCOL.md`](../architecture/DESIGN_INTEGRATION_PROTOCOL.md)  
- Full review: [`docs/reviews/2026-07-24-design-mission-10-polish.md`](../reviews/2026-07-24-design-mission-10-polish.md)

---

## Test plan executed

- [x] Merge salvage only (not design branch)
- [x] Build / typecheck web + UI
- [x] API health check
- [x] Ignore Replit migration artifact paths in `.gitignore`
- [x] Protocol + this summary committed to `main`
