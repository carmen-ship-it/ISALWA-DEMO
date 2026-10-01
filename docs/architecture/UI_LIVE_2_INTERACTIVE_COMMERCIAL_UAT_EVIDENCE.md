# UI-LIVE-2 — Interactive Commercial UAT Browser Smoke Evidence

**Date:** 2026-08-24  
**Scope:** `apps/os-web` interactive Playwright browser verification (local/test stack)  
**Gate:** **PASS**  
**Script:** `scripts/ui-live-2-playwright.mjs`  
**Artifacts:** `.ui-live-2-evidence/` (screenshots + `latest-results.json`)  
**Prior evidence:** `UI_LIVE_1_COMMERCIAL_UAT_SMOKE_EVIDENCE.md` (API + SSR, preserved)

---

## Environment

| Item | Value |
|------|--------|
| Postgres | `postgresql://isalwa:isalwa@localhost:5432/isalwa` (local/test) |
| os-api | `http://localhost:4001` — `OS_AUTH_MODE=dev`, outbox worker enabled |
| os-web | `http://localhost:3200` — `NEXT_PUBLIC_OS_AUTH_MODE=dev` |
| Seed | Step17 marker → `.step17-evidence/seed-marker-ui-live-1.json` (not reseeded) |
| Synthetic tenant | `Cliente Step17 S.A.` + admin `master_data.admin` |
| Browser | Playwright + system Chrome (`channel: 'chrome'`) |

**Not production.** No client production data used.

---

## Auth mode

**DEV** — Playwright injects `os_dev_session` cookie (Step17 admin session from marker + psql lookup).  
Login page verified: *“Entrar (desarrollo)”* visible before cookie injection.

**Not verified:** Supabase browser auth, production auth.

---

## Verification method

Real browser interactions via Playwright against the running stack:

1. Login page (dev entry visible)
2. Shell nav → Clientes → synthetic party
3. Cliente 360 section nav (all 8 sections)
4. Nueva oportunidad → create → edit → stage → owner assign
5. Nueva cotización → line add/edit → header save → Enviar cotización
6. Return to Cliente 360 → Oportunidades + Cotizaciones reflect writes
7. Historial (safe labels, no raw payload)
8. Administración → Equipo (directory + María Quispe visible)
9. Negative checks: CreateOrder, commercial approval, Finance BLOQUEADO

Projection convergence uses bounded reload polling (not arbitrary long sleeps).

---

## Final run results

**Run:** `2026-08-24T14:19:31.315Z` — exit 0

| Check | Result |
|-------|--------|
| Login | PASS |
| Clientes | PASS |
| Cliente 360 | PASS |
| Opportunity create | PASS |
| Opportunity edit / stage / owner | PASS |
| Quote create | PASS |
| Quote line editing | PASS |
| Quote submit | PASS |
| Historial | PASS |
| Workforce Admin | PASS |
| CreateOrder exposed | **NO** |
| Commercial approval exposed | **NO** |
| Projection convergence (max observed) | **~3.9 s** |
| Backend bugs | **NONE** |

Screenshots: `cliente-360`, `opportunity-created`, `quote-submitted`, `historial`, `workforce-admin`.

---

## UI fix applied

**Owner dropdown included inactive invited members** (`loadMemberOptionsForAdmin` listed all members). Assigning to invited member María Quispe failed backend validation (`accessStatus !== 'active'`) with no successful UX feedback in Playwright path.

**Fix:** `apps/os-web/lib/commercial/member-options.ts` — `listMembers({ accessStatus: 'active' })`.  
**Regression:** `apps/os-web/lib/commercial/member-options.test.ts` (2 tests).

---

## Projection convergence (browser)

| Event | Observed |
|-------|----------|
| CreateOpportunity → detail page | Brief “No se encontró esta oportunidad” until read model; converged with reload polling (~3.4 s on final run) |
| CreateQuote → detail page | Same pattern; quote heading `Q-00000N` |
| SubmitQuote → submitted state | Success toast + “Conversión a pedido pendiente” visible without extended wait |
| Cliente 360 list refresh | Edited opportunity title + “Enviada” quote visible after section nav + bounded reload |

Faster than UI-LIVE-1’s fixed 10 s wait; browser path still shows transient not-found until projection catches up (not hidden).

---

## Negative UX verified (browser)

- **CreateOrder:** not in page text
- **Commercial approval actions:** not in page text
- **Finance:** shell nav `BLOQUEADO`
- **Messaging:** `NO CONFIGURADO` in shell (from UI-LIVE-1 / shell capability state)
- Historial: no `contextSnapshot`, raw JSON payloads, or internal ULIDs in visible text

---

## Playwright script notes

- `scripts/ui-live-2-playwright.mjs` created for UI-LIVE-2
- URL guards exclude `/nueva` false positives on create redirects
- Admin Equipo nav scoped via `aria-label="Secciones de administración"`
- Quote detail title matches `Q-` prefix (not `COT-`)

---

## Backend bugs

**NONE**

---

## Cross-lane change requests

**NONE**

---

## Build verification (after UI fix)

| Command | Result |
|---------|--------|
| `npm test` (os-web) | 97 pass (existing suite) |
| `tsx --test lib/commercial/member-options.test.ts` | 2 pass |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

---

## Carmen handoff gate

**LIVE INTERACTIVE BROWSER:** **PASS**

**AUTH MODE:** **DEV**

**UAT BROWSER STATUS:** **READY** (DEV auth tier)

**Exact next UI product slice:** **UI-LIVE-3 — Supabase browser auth smoke** (login → same Cliente commercial path with production auth mode; separate tier from DEV).
