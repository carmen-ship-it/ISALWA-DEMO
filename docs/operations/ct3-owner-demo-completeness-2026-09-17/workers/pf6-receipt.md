# PF-6 — Walkthrough cleanup + Story Mode canonicalization

**Date:** 2026-09-17  
**Lane:** PF-6 (WALKTHROUGH / DEMO CHROME)  
**Branch:** `ct3/pf6-walkthrough-story`  
**Base:** `6327f43c57f309227906931f6cc08ae54033410e`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf6-walkthrough-story`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy:** not performed (worker lane)  
**Hosted:** **UNPROVEN**

---

## Carmen plain language

The floating full-tour launcher is gone. The only full guided owner walkthrough is Story Mode (“Ver recorrido completo”), deep-linked to seeded DEMO records. Ayuda keeps intro replay, short section tours, and Modo aprendizaje — it no longer relaunches the old multi-journey Recorrido del piloto. Demo mode keeps the persistent DEMO · DATOS FICTICIOS banner, with Datos reales | Demo (default real) synced through cookie + localStorage.

---

## Delivered

| Capability | Proof state |
|---|---|
| GuidePanel returns null (no floating Mostrar recorrido) | **IMPLEMENTED** + **TESTED** |
| Canonical launcher = Ver recorrido completo → Story Mode | **IMPLEMENTED** (header, Inicio card, Ayuda) |
| Ayuda multi-journey Recorrido del piloto launcher removed | **IMPLEMENTED** + **TESTED** |
| Lightweight help preserved (intro, micro-tours, learning mode, role quick-start) | **IMPLEMENTED** + **TESTED** |
| Story Mode 20 steps deep-link seeded DEMO ids | **IMPLEMENTED** + **TESTED** |
| Persistent DEMO · DATOS FICTICIOS banner | **IMPLEMENTED** |
| Datos reales \| Demo toggle; default real | **IMPLEMENTED** + **TESTED** (default + cookie sync) |
| Cookie `isalwa-demo-data-mode` + localStorage sync on mount / toggle / story | **IMPLEMENTED** + **TESTED** |
| Hosted / browser verify | **UNPROVEN** (no deploy) |

---

## Files

### Demo chrome
- `apps/os-web/components/demo/owner-demo-provider.tsx` — cookie/localStorage sync on mount; story forces demo
- `apps/os-web/components/demo/inicio-owner-demo-card.tsx` — deep link `?datos=demo&story=1`
- `apps/os-web/components/demo/owner-story-mode.tsx` (unchanged this tip; already canonical)
- `apps/os-web/components/demo/demo-fictitious-banner.tsx` (owned; no delta)
- `apps/os-web/components/demo/demo-data-filter-toggle.tsx` (owned; no delta)
- `apps/os-web/components/demo/ver-ejemplo-completo-button.tsx` (owned; no delta)
- `apps/os-web/lib/demo/owner-demo-identity.ts` (owned; cookie helper covered by tests)
- `apps/os-web/lib/demo/resolve-demo-data-mode.ts` (owned; SSR cookie reader)
- `apps/os-web/lib/demo/story-mode-steps.ts` (owned; seeded CTA coverage extended in tests)
- `apps/os-web/lib/demo/owner-demo.test.ts`

### Walkthrough
- `apps/os-web/components/walkthrough/walkthrough-help-panel.tsx` — Story Mode CTA; no journey replay UI
- `apps/os-web/components/walkthrough/guide-panel.tsx` (null stub; owned)
- `apps/os-web/components/walkthrough/walkthrough-shell.tsx` (owned; no GuidePanel mount)
- `apps/os-web/lib/walkthrough/copy.ts` — document canonical show label
- `apps/os-web/lib/walkthrough/guide.test.ts` — retirement + Ayuda assertions

### Shell mounts (shared; verified by test, not rewritten)
- `apps/os-web/components/shell/app-shell.tsx` — OwnerStoryMode / banner / toggle / Ver recorrido completo

### Receipt
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/pf6-receipt.md`

---

## Tests run

```bash
cd apps/os-web && node --import tsx --test \
  lib/demo/owner-demo.test.ts \
  lib/walkthrough/guide.test.ts \
  lib/walkthrough/training-quickstart.test.ts
```

**Result:** 42 pass / 0 fail

---

## Residuals

1. Hosted browser verify of Story Mode + banner + toggle after integrator merge/deploy — **UNPROVEN**
2. Story Mode gate remains role-preview (`canUseOwnerDemo`) — by design (CT3 deviation)
3. Seeded CTA deep-links depend on PF-1 seed / `seeded-ids.json` remaining populated — **not owned by PF-6**
4. ¿Qué significa esto? lives under guidance/learning mode (not re-homed this lane)

---

## Integration notes

- Sole owner of walkthrough/** + components/demo/** + owner-demo-identity / resolve-demo-data-mode / story-mode-steps as needed.
- Did **not** touch seed.ts, PDF engine, map metrics, or business domain desks.
- Integrator: merge after PF-1…PF-5 if conflicting shell mounts appear; PF-6 owns GuidePanel retirement + Story Mode launcher + DEMO banner/toggle.
