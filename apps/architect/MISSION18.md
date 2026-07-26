# Mission 18 — Build My Software

**Status:** Complete (architecture)  
**App:** `apps/architect`  
**Depends on:** Discovery score · Blueprint · Solution · Processes · Deliverables · Consulting · Knowledge

## Goal

Architect becomes the **starting point for every custom software project**. Once business understanding reaches the discovery conclusion threshold, assemble a complete **implementation package**.

> **NOT code. NOT Cursor prompts yet. Only architecture.**

## Hard constraints honored

| Constraint | Status |
| --- | --- |
| Everything deterministic | ✅ |
| References existing engines (blueprint, solution, processes, deliverables, consulting, knowledge) | ✅ |
| Nothing duplicated — compose / re-export from derived packs | ✅ |
| No code generation | ✅ |
| No AI / LLM | ✅ |
| Do not rewrite those engines — orchestration layer only | ✅ |
| Document as `MISSION18.md` | ✅ |
| Parallel missions may land — stay in `lib/implementation-package/` | ✅ |

## Gate

```text
businessUnderstanding >= CONCLUSION_THRESHOLD (78)
```

Same bar as interview conclusion (`lib/reasoning/confidence/score.ts`).  
Alias: `IMPLEMENTATION_PACKAGE_THRESHOLD`.

When below threshold → no package (`null`) + UI shows **No listo**.  
When at/above threshold → assemble typed `ImplementationPackage` pointing at engine artifacts.

## What was built

### Types (`types/implementation-package.ts`)

- `ImplementationPackage` — stored on `CompanyWorkspace.implementationPackage`
- `ImplementationPackageGate` — ready / not_ready + threshold + prerequisites
- `ImplementationSectionRef` — section id, summary, source engine, artifact ID refs
- Sections: Business Blueprint · Solution Architecture · Modules · Database Model · Permissions · Process Maps · Navigation · API Contracts · Sprint Roadmap · Implementation Phases · Technical Risks · Cursor Context · Developer Handoff

### Engine (`lib/implementation-package/`)

| Module | Role |
| --- | --- |
| `threshold.ts` | Gate using `CONCLUSION_THRESHOLD` |
| `sections.ts` | Map sections → existing artifact IDs / summaries |
| `assemble.ts` | Pure orchestrator — `assembleImplementationPackage(workspace)` |
| `index.ts` | Public API + `generateImplementationPackage(workspaceId)` |

**Does not regenerate** Blueprint / Solution / Process / Deliverables content.  
May call `buildDeliverablesPackage` only when threshold is met and deliverables are missing (orchestration).

### Workspace wiring

- Field: `CompanyWorkspace.implementationPackage`
- Timeline category: `implementation`
- Regenerated in:
  - `applyInterviewToWorkspace()` (after deliverables)
  - `createSeedWorkspaces()` / seed bundle
  - `migrateBundle()` (after honest score refresh)

### UI

Thin **Paquete de implementación** panel inside Deliverables:

- Ready / Not ready
- Threshold vs current understanding
- Section list with availability + source engine when threshold met

## Public API

```typescript
import {
  assembleImplementationPackage,
  evaluateImplementationGate,
  generateImplementationPackage,
  IMPLEMENTATION_PACKAGE_THRESHOLD,
} from "@/lib/implementation-package";

const gate = evaluateImplementationGate(workspace);
const pack = assembleImplementationPackage(workspace); // null below threshold
```

## Intentionally deferred

- Production code generation
- Cursor prompt expansion / agent runs
- SQL / OpenAPI / schema file emission
- Sprint tool sync (Jira / Linear / GitHub)
- Visual architecture diagrams

## Definition of done

- [x] Orchestration layer + types
- [x] `MISSION18.md`
- [x] Typecheck
- [x] Commit: `feat(architect): implementation package architecture (mission 18)`
- [x] Push `origin/main`
