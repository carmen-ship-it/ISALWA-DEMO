# Design Integration Protocol

**Status:** Binding engineering rule  
**Applies to:** All work on `ISALWA-DEMO` / ISALWA OS  
**Effective:** 2026-07-24  
**Authority:** Lead Software Engineering (Cursor) + Product Experience (Replit)

---

## Purpose

This repository has two complementary roles. Confusing them destroys the product.

| Role | Owner | Responsibility |
|------|-------|----------------|
| **Product experience** | Replit design iteration | Make the product feel exceptional |
| **Production engineering** | Cursor | Keep architecture, quality, and GitHub truth intact |

**GitHub is the single source of truth.** Nothing is production until it lands on `main` through review.

---

## Non‑negotiable boundaries

### Replit must NEVER

1. **Replace architecture** — NestJS API, Next.js App Router, Prisma, Turborepo, pnpm workspace (`apps/*`, `packages/*`) stay.
2. **Introduce a parallel framework** — no Vite app replacing Next, no Express replacing Nest, no Drizzle replacing Prisma, no second design system (e.g. default shadcn theme) competing with `@isalwa/ui` tokens.
3. **Migrate the stack** — no relocating the monorepo into `.migration-backup/`, no rewriting root `package.json` / `pnpm-workspace.yaml` into a Replit scaffold.
4. **Bypass Cursor review** — design branches are proposals, not merges.
5. **Commit secrets or loosen `.gitignore`** for `.env` / credentials.

### Replit MAY

Improve the **existing** product surface:

- Existing components and pages under `apps/web`
- Motion and microinteractions (respect `packages/ui` motion tokens + `prefers-reduced-motion`)
- Typography, spacing, visual hierarchy
- Interactions (hover, focus, keyboard, empty/loading/error states)
- Polish that raises Demo Wow without new business modules (unless scoped)

Preferred delivery: a branch that **diffs against `main` only in** `apps/web/**` and optionally small, token-aligned tweaks in `packages/ui/**`.

### Cursor MUST

1. Fetch the design branch and compare to `main`
2. Categorize changes: Keep / Refactor / Discuss / Reject
3. Salvage valuable UX onto production paths when the design branch polluted architecture
4. Verify build, typecheck, routes, and demo path
5. Approve or request changes **before** merge to `main`
6. Keep provider ports, contracts, and folder structure intact

---

## Required PR shape (Replit → GitHub)

```
✅ apps/web/src/...
✅ packages/ui/src/...   (token-aligned only)
❌ artifacts/
❌ lib/db (Drizzle) / lib/api-client-react replacing contracts
❌ Root workspace rewrite
❌ .migration-backup/
❌ New app framework competing with Next/Nest
```

Branch naming: `design/<mission-or-theme>`  
Integration after review: `integration/<mission>-salvage` when salvage is required.

---

## Merge gate checklist

Before any design branch merges to `main`:

- [ ] `pnpm-workspace.yaml` still includes `apps/*` and `packages/*`
- [ ] Root scripts still support `build`, `dev:web`, `dev:api`, seed/migrate
- [ ] No parallel Express/Vite/Drizzle product stack
- [ ] Design tokens remain porcelain / kiln / glaze / copper law
- [ ] `pnpm build` + web typecheck pass
- [ ] Demo Journey routes respond
- [ ] Engineering review document filed under `docs/reviews/` when the PR is non-trivial

---

## Incident reference

`design/mission-10-polish` (2026-07-24) relocated the monorepo and introduced a Replit scaffold.  
**Rejected as-is.** UX polish salvaged via `integration/mission-10-polish-salvage` and merged to `main`.  
See `docs/reviews/2026-07-24-design-mission-10-polish.md`.

---

## One sentence

**Replit makes it beautiful. Cursor makes it real. GitHub decides what ships.**
