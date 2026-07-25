# Mission 4 — Business OS Blueprint Engine

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 2 Company Memory · Mission 3 Knowledge Center

## Goal

The Architect should no longer produce only reports.

It produces a structured **Business OS Blueprint** describing how a company operates today and how it should operate tomorrow.

The blueprint is the core product. Everything else is generated from it:

- Process Maps
- Software Modules
- PRDs
- Cursor implementation prompts
- Future ISALWA OS configuration
- Executive proposals

## Philosophy

Do **not** think in screens. Think in systems.

A workflow diagram is one visualization of something bigger. The real asset is the blueprint.

## What shipped

### Domain (`types/blueprint.ts`)

`BusinessBlueprint` with:

- currentState / futureState
- capabilities (purpose, owner, inputs, outputs, dependencies, pains, opportunities)
- departments (own capabilities)
- roles, systems inventory, workflows + steps
- entity catalog, operating rules
- pain point matrix + opportunity matrix
- modules, integrations, risks, assumptions, openQuestions
- futureArchitecture: Current → Transition → Future
- evidence lineage to Knowledge · Memory · Meetings · Reasoning · Timeline · Recommendations

### Library (`lib/blueprint/`)

- `derive.ts` — build a version from workspace + optional interview
- `seed.ts` — initial versions for demo companies
- `future-outputs.ts` — designed generation targets (not implemented)

### Versioning

- Append-only: v1, v2, v3…
- Prior versions marked `superseded: true`
- **Never overwrite**
- Timeline event: `Business Blueprint vN`
- Every completed interview appends a new version

### Workspace UI

New section **Business Blueprint** — executive architecture document tone:

- Version switcher
- Current / Future state
- Capabilities, departments, workflows (structured, not diagrams)
- Entities, rules, systems, matrices
- Future outputs (architecture only)

### Explicitly not built

- Process map diagrams
- Proposal PDFs
- PRDs / Cursor prompts / estimates / RFP text
- ISALWA OS configuration generation

## Relationships

Each blueprint version references evidence from:

| Source | Role |
| --- | --- |
| Knowledge | Documents, entities, themes |
| Memory | ConversationMemory, pains, modules |
| Meetings | Discovery sessions |
| Reasoning | Interview think-cycle outputs |
| Timeline | Meaningful events |
| Recommendations | Suggested moves |

## Future generation pipeline

```text
Business Blueprint (canonical)
  → Process Maps
  → Proposal PDFs
  → Technical PRDs
  → Epic Backlogs
  → Cursor Prompts
  → Architecture Documents
  → Implementation Roadmaps
  → ISALWA Configuration
  → Software Estimates
  → RFP Responses
```

Nothing generated yet — only contracts.

## Success criteria

The Architect maintains a versioned Business Blueprint as the canonical source for every future artifact. It no longer merely remembers conversations — it maintains a structured understanding of how the company operates.
