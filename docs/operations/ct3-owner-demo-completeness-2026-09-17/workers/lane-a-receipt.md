# LANE CT3-A — Visual / density / tabs / lists receipt

**Date:** 2026-09-17  
**Lane:** CT3-A writer  
**Branch:** `ct3/lane-a-visual`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-a-visual`  
**Base:** `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b`  
**LANE_IMPLEMENTATION_SHA:** `7f7677f0cde6b78ece90524611c9fac7cfe223a9`  
**HEAD_SHA:** `948d9bb58b6017d5fe96ce00329941074865f5d1`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / migrate:** not performed (lane receipt only)

---

## Carmen plain language

Cliente 360 now shows **one tab panel at a time** via `?tab=resumen|comercial|operacion|trabajo|documentos|historial` (refresh and deep links keep the tab). Compromisos nav goes to a real **`/compromisos`** page instead of `/inicio`. Lists use shared density rules (empty / compact 1–5 / Ver todos for 6+). A reusable **próximo paso** strip and action/visual helpers sit on the shell without inventing business actions.

---

## Delivered

| Capability | Proof state |
|---|---|
| Cliente360 single visible tab + `?tab=` URL | **IMPLEMENTED** + **TESTED** |
| Legacy `#section` → `?tab=` client redirect | **IMPLEMENTED** |
| Mobile tab select + desktop horizontal tabs | **IMPLEMENTED** |
| Shared list-scaling helpers + ScaledListReveal | **IMPLEMENTED** + **TESTED** |
| `/compromisos` route + nav href fix | **IMPLEMENTED** + **TESTED** |
| ProximoPasoStrip (deterministic props) | **IMPLEMENTED** |
| Action hierarchy + visual status helpers | **IMPLEMENTED** |
| Hosted / browser verify | **UNPROVEN** this SHA |

---

## Files changed

- `apps/os-web/app/(app)/clientes/[partyId]/page.tsx` — single-tab panels + scaled lists
- `apps/os-web/app/(app)/compromisos/page.tsx` — Compromisos desk
- `apps/os-web/components/cliente/cliente-360-nav.tsx` — `?tab=` + mobile select
- `apps/os-web/components/cliente/cliente-360-header.tsx` — ProximoPasoStrip + action hierarchy
- `apps/os-web/components/shell/proximo-paso-strip.tsx`
- `apps/os-web/components/ui/scaled-list-reveal.tsx`
- `apps/os-web/components/commitments/commitment-list.tsx` — optional scale / hideHeader
- `apps/os-web/components/operating/customer-quick-view.tsx` — tab deep link
- `apps/os-web/lib/cliente/nav-sections.ts` — `parseCliente360Tab`
- `apps/os-web/lib/commercial/navigation.ts` — `clienteSectionHref` → `?tab=`
- `apps/os-web/lib/navigation/nav-config.ts` — Compromisos → `/compromisos`
- `apps/os-web/lib/navigation/breadcrumbs.ts` — compromisos / incidencias labels
- `apps/os-web/lib/ui/list-scaling.ts` (+ test)
- `apps/os-web/lib/ui/action-hierarchy.ts`
- `apps/os-web/lib/ui/visual-status.ts`
- `apps/os-web/lib/shell/command-palette.ts` (+ test href updates)
- `apps/os-web/lib/party/next-action.test.ts`
- `apps/os-web/lib/cliente/cliente360-ux.test.ts`
- `apps/os-web/lib/commitments/persistence.ts` — revalidate `/compromisos`

---

## Tests run (local)

```text
pnpm --filter @isalwa/os-contracts build
pnpm exec tsx --test \
  lib/cliente/cliente360-ux.test.ts \
  lib/ui/list-scaling.test.ts \
  lib/party/next-action.test.ts \
  lib/shell/command-palette.test.ts \
  lib/navigation/shell-polish.test.ts
→ 61 pass / 0 fail
```

---

## Blocked items

None for this lane’s write scope. Hosted browser proof remains for CT / verifier.

---

## Residuals

- Hosted BROWSER-VERIFIED for tab switch / refresh / mobile select: **UNPROVEN**
- `#finanzas` deep link works only with `?tab=operacion#finanzas` (operación panel mounted)
- Documents tab table densification owned by CT3-B (not touched)
- Pedido ops cards / Map / Conversations / Quote PDF / AI / demo fixtures: untouched
