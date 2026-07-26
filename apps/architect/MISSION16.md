# Mission 16 — Interactive Business Builder

> **Scope:** Typed contracts and deterministic estimate functions only.  
> **Not in scope:** Drag-and-drop UI, visual canvas, persistence UI, software/codegen.

## Goal

Allow executives to **design their future operating system visually** — as **planning**, not software generation.

The builder is a first-class planning artifact: which modules belong in the future OS, how they connect, what they cost (bands), how long they take (phases), and what ROI band is plausible. It may **reference** Solution / Blueprint / Process / Deliverables module IDs. It must **not** rewrite those engines.

## Hard constraints honored

| Constraint | Status |
| --- | --- |
| Read-only architecture / contracts only | ✅ |
| No drag-and-drop implementation | ✅ |
| No UI builder canvas (deferred) | ✅ |
| Do not rewrite solution / blueprint / process / deliverables engines | ✅ |
| Deterministic pure estimates given a `BuilderPlan` | ✅ |
| Stay in `lib/business-builder/` (parallel missions may land) | ✅ |
| Document as `MISSION16.md` | ✅ |

## What was built

### `lib/business-builder/`

| Module | Role |
| --- | --- |
| `modules.ts` | `ModulePlanItem`, `BuilderPlan`, `createEmptyPlan`, `addModule`, `removeModule`, `reorderModule` |
| `connections.ts` | `connectModules` — explicit edges between plan modules |
| `dependencies.ts` | `previewDependencies` — plan edges + known Solution module deps (catalog mirror) |
| `cost.ts` | `estimateInvestment` — heuristic USD bands from priority weight + count |
| `roadmap.ts` | `estimateTimeline` — phases from plan order (chunks of 3) |
| `roi.ts` | `estimateROI` — payback / annual benefit bands + optional workspace signals |
| `index.ts` | Public API surface |

### Public API

```typescript
import {
  createEmptyPlan,
  addModule,
  removeModule,
  reorderModule,
  connectModules,
  previewDependencies,
  estimateTimeline,
  estimateInvestment,
  estimateROI,
} from "@/lib/business-builder";

const plan = createEmptyPlan({ title: "Acme Future OS" });
const withCrm = addModule(plan, { moduleKey: "CRM", priority: "must" });
const withSales = addModule(withCrm, { moduleKey: "Sales", priority: "must" });
const linked = connectModules(withSales, {
  fromModuleId: withSales.modules.find((m) => m.moduleKey === "Sales")!.id,
  toModuleId: withSales.modules.find((m) => m.moduleKey === "CRM")!.id,
  kind: "depends_on",
});

const deps = previewDependencies(linked);
const timeline = estimateTimeline(linked);
const investment = estimateInvestment(linked);
const roi = estimateROI(linked, {
  painPointCount: 5,
  manualWorkIntensity: "high",
});
```

### Allowed operations (typed / pure — not UI)

1. **Add Module** — `addModule`
2. **Remove Module** — `removeModule` (also drops connections)
3. **Reorder Module** — `reorderModule`
4. **Connect Modules** — `connectModules`
5. **Preview Dependencies** — `previewDependencies`
6. **Estimate Timeline** — `estimateTimeline`
7. **Estimate Investment** — `estimateInvestment`
8. **Estimate ROI** — `estimateROI`

### Determinism

- Estimate functions are pure: same `BuilderPlan` (+ optional ROI signals) → same output.
- Plan mutation helpers are pure and immutable; ids are caller-supplied or derived from keys (no `randomUUID` in this package).
- `KNOWN_SOLUTION_MODULE_DEPS` mirrors Solution catalog deps; it does not import or call `lib/solution/`.

## What was intentionally NOT built

- Drag-and-drop module palette / canvas
- Visual graph editor or read-only UI stub
- Persistence / workspace field for `BuilderPlan`
- Code generation, Cursor prompts, schema export, or PDF packs from the builder
- Changes to `lib/solution/`, `lib/blueprint/`, `lib/processes/`, `lib/deliverables/`

## Future visual builder (deferred)

A later mission may add a porcelain / kiln / glaze canvas that:

1. Renders `BuilderPlan` modules as a composition (not a generic dashboard)
2. Uses these contracts for add / remove / reorder / connect
3. Surfaces dependency preview, timeline, investment, and ROI as read-only executive panels
4. Optionally seeds from `SolutionArchitecture.modules` via `solutionModuleId`

Until then, consumers should treat this package as the **contract layer only**.

## Definition of done

- [x] Full contract layer + types under `lib/business-builder/`
- [x] `MISSION16.md` explaining future visual builder, no codegen
- [x] Typecheck passes for Mission 16 sources (no new errors in `lib/business-builder/`)
- [x] Commit: `feat(architect): interactive business builder contracts (mission 16)`
