# Mission 8 — Business Process Visualization

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 7 Business Process Engine (+ Blueprint, Solution, Knowledge, Consulting by ID)

## Goal

The Architect already knows how the company works. Mission 8 **does not discover** anything new.

It renders the canonical Process Engine into executive-quality, interactive visualizations — read-only.

## Hard constraints honored

- No LLM
- No diagram libraries that invent layouts
- Deterministic rendering only
- Consumes Process Engine — never invents workflows
- No duplicated business logic / no second workflow model
- No editing · no workflow designer
- Visualization only

## Rendering architecture

```text
BusinessProcessModel (Mission 7)
        │
        ▼
lib/process-visualization/
  graph.ts     → nodes + edges (step / handoff IDs)
  layout.ts    → executive | swimlane | department positions
  styles.ts    → pain / automation surface tokens
  derive.ts    → ProcessVisualizationModel + metrics + deps
        │
        ▼
Process Studio (read-only UI)
```

Context (ID refs only):

- `BusinessProcessModel`
- `BusinessBlueprint`
- `SolutionArchitecture`
- `WorkspaceKnowledge`
- `ConsultingIntelligence` (pain severity)

## Visualization pipeline

1. Select workflow from Process Engine  
2. Build graph from ordered steps + handoff pairs  
3. Layout deterministically (order + department lanes)  
4. Apply overlay styling (layout unchanged for pain/automation/time)  
5. Derive metrics sidebar from the same workflow  
6. Dependency panel resolves documents / systems / roles / approvals / policies by ID

## Supported views

| View | Description |
| --- | --- |
| Executive Flow | Clean vertical process |
| Swimlane | Departments as lanes; handoffs obvious |
| Department | One (or all) department columns |

## Overlays

| Overlay | Source |
| --- | --- |
| Pain / Risk | Process bottlenecks + consulting severity |
| Automation | Manual · AI · Auto · Human approval |
| Time | `estimatedDuration` on steps |
| Dependencies | Inputs, documents, systems, roles, approvals, policies |

## Process Studio

Workspace section **Process Studio**:

- Workflow selector · Visualization selector · Overlay · Highlight
- Legend · Interactive viewer (hover, select, zoom, pan, collapse lanes)
- Metrics sidebar (derived only)

## Extension points

- New `ProcessViewKind` + layout function in `layout.ts`
- New overlay tokens in `styles.ts`
- Additional highlight modes in the Studio UI
- Future editable mode (see below)

## Future editable mode (NOT implemented)

A later mission may allow process designers to propose edits. That mode must:

- Write proposed changes as a **new Blueprint / Process version**
- Never mutate visualization state as source of truth
- Keep Process Engine canonical

Mission 8 ships **read-only** only.

## Success criteria

After an interview, open the workspace → Process Studio → polished interactive visualizations with risk, automation, time, dependency overlays and derived metrics — all from the Process Engine, no AI diagrams.
