# Mission 7 — Business Process Engine

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 4 Blueprint · Mission 5 Consulting (read-only refs) · Mission 6 Solution (read-only refs)

## Goal

Architect understands **how** the company operates — structurally, not visually.

Every workflow becomes a first-class domain object. The Process Engine is the **canonical source of truth** for operational flows. Future visualizations consume it; they do not create it.

## Hard constraints honored

- No AI / LLM
- No images · SVG · Mermaid · BPMN · PDFs
- Interview UX unchanged
- Consulting intelligence unchanged (`lib/consulting/` untouched)
- Solution Architect unchanged (`lib/solution/` untouched)
- Everything consumes existing evidence
- Never invent workflows
- Unknown steps remain explicitly unknown
- Confidence on every process artifact

## What shipped

### `lib/processes/`

| Module | Role |
| --- | --- |
| `workflows.ts` | Blueprint workflows → process workflows |
| `steps.ts` | Ordered steps with actors, I/O, risk, AI opportunity |
| `actors.ts` | Unique actors across workflows |
| `handoffs.ts` | Cross-actor transitions + missing info |
| `approvals.ts` | Approval points (+ solution rule ID refs) |
| `documents.ts` | Document refs from step I/O |
| `exceptions.ts` | Blueprint exceptions (by ID origin) |
| `bottlenecks.ts` | Manual approvals, Excel, WhatsApp, paper, … |
| `metrics.ts` | Complexity · automation · documentation · risk · AI · systems |
| `automation.ts` | Quick / future / AI candidates |
| `dependencies.ts` | Cross-workflow relationships |
| `derive.ts` | Orchestrator |

### Workspace

Read-only **Business Processes** panel:

- Detected workflows · Ordered steps · Actors · Handoffs
- Approvals · Risks/bottlenecks · Automation opportunities

### Relationships (IDs only)

- `blueprintWorkflowId` / `blueprintStepId`
- `solutionWorkflowId` / `solutionApprovalRuleId` / `solutionArchitectureId`
- `consultingRiskId` / `consultingRiskIds`
- `knowledgeAssetIds`

Nothing duplicates payloads from Blueprint, Knowledge, Solution, or Consulting.

## Persistence

`CompanyWorkspace.businessProcesses` regenerates when blueprint versions advance (interview complete + local migration).

## Visualization

Mission 8 **Process Studio** consumes this model for executive / swimlane / department views. It does not invent workflows.
