# Mission 31 — Trust, Coherence & Pilot Polish

**Status:** Shipped (UX only)  
**Does not rewrite:** Discovery, Brain, Blueprint, Recommendations, Living generators, AI

## Promise reinforced

> You teach Architect how your company works.  
> Architect builds your company's operating system.

## What changed

### P0 — Single source of truth
- `buildPilotTruthMetrics` — one compose for conversations / facts / documents / meetings / understanding %
- Orientation + executive chips consume only that source

### P0 — Respectful language
- Replaced Frágil / Crítico / Bajo presión / Cobertura débil with operational consulting wording in presentation + cockpit + alerts

### P0 — Clarity & CTAs
- Orientation answers Know / Still learning / Why / Next with a clear primary button
- OS hero encourages when understanding ≥ 35% but OS not yet built; hides bleak 0% training/automation bars

### P1
- Recommendation cards: Problem → Impact → Recommendation visible; evidence as “observaciones reales”
- Evolution timeline framed as consulting story (real events only)
- Company Brain: Lo que sabemos / Por qué lo creemos / Qué falta
- OS cards: “Respaldado por…” human wording

## Verification

`pnpm typecheck` · `pnpm lint` · `pnpm build` (apps/architect)
