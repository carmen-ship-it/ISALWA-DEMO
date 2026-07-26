# Mission 17 — Executive Simulator

**Status:** Complete (rules engine)  
**App:** `apps/architect`  
**Depends on:** Mission 2 Company Memory · Mission 5 Consulting (signals only) · Mission 7 Processes (optional automation score)

## Goal

Allow executives to ask **“¿Qué pasa si…?”** through a **deterministic rules engine**. Simulation is a new layer: it reads optional workspace signals and never rewrites consulting, reasoning, blueprint, process, or deliverables engines.

> No AI · No forecasting · No ML — heuristics only.

## Hard constraints honored

- **Rules engine only** — scenario + optional workspace signals
- **No AI** · **No forecasting / ML**
- Does **not** rewrite other engines — lives only under `lib/simulation/`
- User-facing scenario names in **Spanish**
- Heavy UI **deferred** — solid API + docs; optional thin panel later

## What was built

### Module (`lib/simulation/`)

| File | Role |
| --- | --- |
| `types.ts` | `Scenario`, `SimulationResult`, bands, signals, contributions |
| `signals.ts` | `extractSimulationSignals(workspace?)` — thin optional inputs |
| `capacity.ts` | Capacidad / throughput / nodos |
| `staffing.ts` | Contratación, reducción, cobertura |
| `sales.ts` | Pipeline, CRM, territorio |
| `operations.ts` | Procesos, aprobaciones, fulfillment |
| `inventory.ts` | Stock, almacenes, ATP |
| `automation.ts` | Workflows, audit trail, adopción |
| `financial.ts` | Bandas de inversión / timeline (no valuaciones) |
| `index.ts` | Scenario registry + `simulate` / `runScenario` |

### Built-in scenarios (Spanish labels)

| Id | Name |
| --- | --- |
| `hire_salespeople` | Contratar vendedores |
| `automate_approvals` | Automatizar aprobaciones |
| `open_warehouse` | Abrir almacén |
| `add_crm` | Agregar CRM |
| `increase_production` | Aumentar producción |
| `reduce_staff` | Reducir personal |
| `new_region` | Nueva región |

### `SimulationResult` fields

- **Likely Impact** (`likelyImpact`)
- **Risks** (`risks`)
- **Dependencies** (`dependencies`)
- **Investment** (`investment` — band, summary, scale)
- **Timeline** (`timeline` — band, summary, weeks)
- **Confidence** (`confidence` — band, score, rationale)

Plus: `signalsUsed`, `domainsApplied`, `generatedAt`.

## Public API

```typescript
import {
  simulate,
  runScenario,
  listScenarios,
  getScenario,
  SCENARIOS,
} from "@/lib/simulation";

const scenarios = listScenarios();
const result = simulate("hire_salespeople", workspace);
// alias:
const same = runScenario("add_crm", workspace);
```

Without a workspace, rules still run with empty signals (lower confidence). With a workspace, signals such as CRM/ERP presence, consulting risk patterns, maturity scores, automation score, size/geography hints adjust impact, risks, dependencies, investment/timeline bands, and confidence — still deterministic.

## Intentionally deferred

| Deferred | Why |
| --- | --- |
| Polished workspace UI / scenario picker | Architecture-first; thin panel optional later |
| Numeric forecasts / cash models | Out of scope (no forecasting) |
| Custom user-authored scenarios | Built-in registry only for Mission 17 |
| Persisting simulation runs | No storage change required |

## Non-goals / do not conflict

- Docs product “Mission 17 Timeline Engine” (`docs/product/MISSION17_TIMELINE_ENGINE.md`) is a **different** mission track — Architect Mission 17 is Executive Simulator only
- Do not modify consulting / process engines beyond **reading** existing fields

## Definition of done

- [x] `lib/simulation/` rules modules + scenario runner
- [x] `MISSION17.md`
- [x] Typecheck `@isalwa/architect`
- [x] Commit + push `origin/main`
