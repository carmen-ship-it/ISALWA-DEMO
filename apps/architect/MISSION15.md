# Mission 15 — Continuous Company Memory

**Status:** Complete  
**App:** `apps/architect`  
**Goal:** Remember the consulting relationship forever. Every visit updates memory. Nothing is overwritten. Everything evolves.

## What shipped

### Domain (`types/history.ts`)

- `CompanySnapshot` — immutable, deterministic capture of workspace state
- `CompanyEvolutionHistory` — append-only ledger on `CompanyWorkspace.evolutionHistory`
- Milestones, evolutionary timeline entries, and snapshot comparisons

### Engine (`lib/history/`)

| Module | Role |
| --- | --- |
| `snapshots.ts` | Capture immutable snapshot + content hash (material fields only) |
| `company-evolution.ts` | Evolve on visit/load/save — append snapshot if hash changed |
| `milestones.ts` | Derive milestones from snapshot transitions |
| `comparison.ts` | Diff since last visit / between snapshots |
| `timeline.ts` | Evolutionary timeline entries (complements `workspace.timeline`) |
| `index.ts` | Public exports |

**Tracked:** business maturity, modules, processes, recommendations, roadmap, completed work, resolved risks, new risks.

**Hard rules:** never overwrite prior snapshots; never rewrite consulting/blueprint/process/solution/deliverables/reasoning engines.

### Persistence / migrate

- Field: `CompanyWorkspace.evolutionHistory: CompanyEvolutionHistory`
- `migrateBundle()` calls `ensureCompanyEvolution()` — baseline snapshot if missing
- Seed / empty workspace initialize empty history, then baseline on ensure
- Repository `save()` evolves history (append-if-changed) before persist

### UI

- **Diagnóstico** tab → section **Evolución de la empresa**
- `CompanyEvolutionPanel` (Spanish, read-only premium cards):
  - Qué cambió
  - Desde la última visita
  - Progreso
  - Regresión
  - Enfoque futuro
  - Línea de tiempo evolutiva

### Behavior

On workspace load (and focus) + every workspace save:

1. Capture deterministic snapshot from current state
2. If `contentHash` differs from latest → **append** snapshot + milestones
3. Update visit markers (`lastVisitAt`, `previousVisitSnapshotId`, `lastVisitSnapshotId`)
4. Never mutate or delete prior snapshots

## Intentionally not changed

- `lib/consulting/`, `lib/blueprint/`, `lib/processes/`, `lib/solution/`, `lib/deliverables/`, `lib/reasoning/` engines
- Existing discovery `workspace.timeline` remains the activity feed; evolution timeline is a parallel ledger reused via `formatTimelineDate`

## Parallel missions

Scoped to `lib/history/` + evolution UI. Rebase if missions 10–14 land on shared workspace/migrate files.
