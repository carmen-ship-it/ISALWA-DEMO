# Mission 6 — Solution Architect

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 4 Business Blueprint (+ Memory, Knowledge, Consulting)

## Goal

Transform the Business Blueprint into a complete **software architecture** — the operating system the company needs.

The Architect behaves like a Senior Solution Architect (McKinsey Digital / Palantir / Microsoft style).

It is **designing** software. It is **not** building software.

## Hard constraints honored

- No code generation
- No OpenAI / LLM
- No diagrams
- No PDFs
- Interview flow unchanged
- Consulting engine unchanged
- Deterministic only
- Everything traceable to Blueprint · Knowledge · Meetings · Reasoning · Consulting · Memory
- Confidence on every recommendation

## What shipped

### `lib/solution/`

| Module | Role |
| --- | --- |
| `modules.ts` | Detect CRM, Sales, Purchasing, Inventory, … |
| `entities.ts` | Canonical entities with evidence gates |
| `dependencies.ts` | Structured relationships |
| `roles.ts` / `permissions.ts` | Roles + capability permissions |
| `navigation.ts` | Evidence-backed top-level nav |
| `workflows.ts` | Blueprint workflows → module refs |
| `integrations.ts` | Current / planned / retire systems + AI agents |
| `database.ts` | Conceptual tables/fields (no SQL/Prisma) |
| `api.ts` | Conceptual API surfaces |
| `roadmap.ts` | Foundation → Core Sales → Operations → Automation → AI |
| `configuration.ts` | Soft OS configuration map |
| `future-outputs.ts` | Cursor prompts, PRDs, OpenAPI, … (contracts only) |
| `derive.ts` | Orchestrator |

### Workspace

Read-only **Solution Architecture** panel:

- Detected Modules · Roles · Entities · Relationships
- Navigation · Permissions · Conceptual APIs
- Implementation Roadmap · Future Integrations · Future Outputs

### Persistence

`CompanyWorkspace.solutionArchitecture` regenerates when blueprint versions advance (interview complete + local migration).

## Future outputs (not generated)

Cursor prompts · PRDs · Database schemas · OpenAPI · Architecture diagrams · Sprint plans · Developer handoff · Infrastructure plans

## Success criteria

The Architect maintains a structured software design derived from the Business Blueprint — without inventing features, generating code, or changing discovery UX.
