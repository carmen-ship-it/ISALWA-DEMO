# Mission 12 — Company Digital Twin

**Status:** Complete (architecture + read-only panel)  
**App:** `apps/architect`  
**Depends on:** Mission 2 Company Memory · Mission 3 Knowledge · Mission 5 Consulting · Mission 6 Blueprint · Mission 7 Processes · Mission 11 Preparation (optional signals)

## Goal

The Architect should gradually construct a **living model of the company** — not a document, not a report, a continuously evolving **operating model** (gemelo digital operativo).

> Departments, people, roles, systems, customers, suppliers, products, workflows, information, approvals, ownership, and dependencies — linked by ID, derived from evidence.

## Hard constraints honored

- **Evidence-only** derivation — no LLM, no invented structure
- **ID references only** — no duplicated Blueprint / Process / Knowledge payloads
- **Read-only** twin + workspace panel
- **No diagrams** (future visualization mission)
- Does **not** rewrite consulting / blueprint / process / solution / deliverables / reasoning engines
- User-facing panel labels in **Spanish**

## What was built

### Domain types (`types/company-model.ts`)

`CompanyModel` plus organization, departments, people, roles, systems, parties (customers / suppliers), products, workflow refs, information nodes, approvals, ownership, relationships, information flows, decision flows, dependencies, and health — each carrying `CompanyModelEvidenceRef[]`.

### Module (`lib/company-model/`)

| File | Role |
| --- | --- |
| `ids.ts` | `modelId(prefix, key)` — deterministic entity IDs |
| `evidence.ts` | `collectCompanyModelEvidence(workspace, blueprint)` |
| `organization.ts` | `deriveOrganization` |
| `departments.ts` | `deriveDepartments`, `departmentByName` |
| `actors.ts` | `deriveRoles`, `derivePeople` |
| `systems.ts` | `deriveSystems`, `attachWorkflowSystems` |
| `relationships.ts` | parties/products, workflow refs, ownership, relationships |
| `information-flow.ts` | information nodes + flows from process handoffs/docs |
| `decision-flow.ts` | approvals + decision flows |
| `dependencies.ts` | critical deps (process + consulting `businessImpact` + bottlenecks) |
| `health.ts` | `deriveCompanyModelHealth` |
| `derive.ts` | `deriveCompanyModel({ workspace, blueprint })`, timeline event |
| `index.ts` | Public API |

### Derivation sources (read-only)

```text
CompanyWorkspace + BusinessBlueprint
  ├── Blueprint departments / systems / capabilities / operating rules
  ├── Workspace people + meetings
  ├── Knowledge entities / relationships
  ├── Consulting intelligence (risks via businessImpact)
  ├── SolutionArchitecture (roles, integrations, approval rules)
  └── BusinessProcessModel (workflows, handoffs, docs, deps, bottlenecks)
        │
        ▼
deriveCompanyModel(...)  // pure, deterministic entity graph
```

### Workspace UI

`components/workspace/company-model-panel.tsx` — read-only panel:

- **Modelo de la empresa** / **Gemelo digital operativo**
- Sections: Departamentos · Relaciones · Propiedad · Flujo de información · Dependencias críticas
- Uses `Card`, `formatRelativeActivity`, `recommendationStrength`, `strengthBand`
- Spanish empty states when the twin is missing or sparse

### Public API

```typescript
import { deriveCompanyModel, companyModelTimelineEvent } from "@/lib/company-model";

const model = deriveCompanyModel({ workspace, blueprint });
// model.departments / relationships / ownership / informationFlows / dependencies / health
```

## Intentionally deferred

| Deferred | Why |
| --- | --- |
| Graph / diagram visualization | Explicit non-goal — lists/cards only |
| Editable org chart / ownership UI | Read-only twin |
| Persistence churn as source of truth | Prefer derive-on-read; optional workspace field later |
| LLM enrichment of the twin | Evidence-only mission |
| Live connectors / org-chart imports | Future intake missions |

## Non-goals / do not conflict

- Mission 10 consulting questions / Mission 11 preparation — stay out of those trees
- Mission 8 process studio diagrams — twin does not own layout
- No second workflow or blueprint model

## Definition of done

- [x] `types/company-model.ts`
- [x] `lib/company-model/` derive pipeline
- [x] Read-only Spanish workspace panel
- [x] `MISSION12.md`
- [ ] Wire into workspace tabs + `@/types` barrel (integration step)
- [ ] Typecheck `@isalwa/architect` after integration
