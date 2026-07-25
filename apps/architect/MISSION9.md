# Mission 9 — Deliverables Engine

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Memory · Knowledge · Blueprint · Consulting · Solution · Processes · Process Studio

## Goal

Transform the completed consulting stack into a **professional deliverables package** — documentation only. Never generates production code.

After discovery, click **Generate Deliverables** and review a McKinsey / Deloitte / Accenture-style consulting package.

## Hard constraints honored

- No LLM
- No PDF / DOCX / PowerPoint generation
- No export implementation (contracts only)
- Deterministic derivation from existing models
- No duplicated business logic
- No production code generation

## Deliverable pipeline

```text
CompanyWorkspace
  ├── Blueprints + Solution + Processes + Consulting + Knowledge + Report
  │
  ▼
buildDeliverablesPackage(workspace)   // pure
  │
  ├── executive-summary
  ├── business-assessment
  ├── blueprint / solution / process-book
  ├── prd + technical-architecture
  ├── cursor-context
  ├── development-roadmap
  ├── implementation-plan (SOW-shaped)
  ├── sprint-backlog
  └── proposal
  │
  ▼
generateDeliverables(workspaceId)     // public API — persist + timeline
  │
  ▼
DeliverablesPanel (preview tabs)
```

## Generation architecture

| Module | Output |
| --- | --- |
| `executive-summary.ts` | Vision, risks, opportunities, recommendation |
| `business-assessment.ts` | Maturity, health, pains, automation |
| `requirements.ts` | Pretty Blueprint / Solution / Process Book |
| `prd.ts` | Goals, FR/NFR, acceptance, scope |
| `architecture.ts` | Conceptual modules, DB, APIs, audit |
| `cursor-context.ts` | Master Cursor context narrative |
| `roadmap.ts` | Phased roadmap (dependency-ordered) |
| `sow.ts` / `implementation-plan.ts` | Workstreams + exit criteria |
| `backlog.ts` | Epics → features → stories |
| `proposal.ts` | Client engagement proposal |
| `generator.ts` | Orchestrator |
| `exports.ts` | Future export contracts |

Public API: `generateDeliverables(workspaceId)`.

Process Book references Mission 8 workflow IDs for diagrams — does not invent flows.

## Workspace

**Deliverables** section with:

Generate / Regenerate · tabbed previews for Executive Summary, Assessment, Blueprint, Solution, Processes, PRD, Roadmap, Cursor Context, Implementation Plan, Sprint Backlog, Proposal, Future Exports.

## Future exporters (NOT implemented)

PDF · Word · Markdown · PowerPoint · Notion · Confluence · Cursor · GitHub · Linear · Jira

Status: `designed` | `planned` — interfaces only.

## Extension points

- New deliverable kind → type + builder module + tab in panel
- New export target → `DELIVERABLE_EXPORT_CONTRACTS` entry
- Exporter adapters in a future mission reading `DeliverablesPackage`

## Success criteria

Finish discovery → open workspace → Deliverables → review a complete consulting package generated deterministically from canonical models, with no AI content and no duplicated logic.
