# Architecture — ISALWA Architect

## Why this shape

Mission 0 prioritizes an elegant, extensible foundation. Mission 2 adds durable **Company Memory**. Mission 3 adds a **Knowledge Ingestion Engine**. Mission 4 adds the **Business OS Blueprint**. Mission 5 adds **Consulting Intelligence**. Mission 6 adds the **Solution Architect**. Mission 7 adds the **Business Process Engine**. Mission 8 adds **Process Visualization**. Mission 9 adds the **Deliverables Engine**. Mission 9.5 polishes the **Executive Experience** so the workspace feels like a senior consulting engagement.

Reports remember conversations. Blueprints describe operating systems. Solution Architecture designs the software. Process Engine models how work moves. Process Studio visualizes it. Deliverables package it for the client. The executive workspace makes understanding feel inevitable.

## Folder structure

```text
apps/architect/
  app/           # Next.js App Router
  components/    # home, workspace (Blueprint + Knowledge), discovery, report, nav
  lib/
    reasoning/   # Consultant brain (unchanged by Missions 2–4)
    memory/      # Interview → workspace (+ blueprint version append)
    workspace/   # Seed + helpers
    knowledge/   # Mission 3 — vault, pipeline, graph, bridge
    blueprint/   # Mission 4 — derive, version, future outputs
    consulting/  # Mission 5 — maturity, risk, opportunities, contradictions
    solution/    # Mission 6 — modules, entities, roles, APIs, roadmap
    processes/   # Mission 7 — workflows, steps, handoffs, bottlenecks
    process-visualization/ # Mission 8 — deterministic layouts + studio model
    deliverables/ # Mission 9 — consulting package builders
    executive/   # Mission 9.5 — executive presentation projection
    repositories/# Local/mock CompanyMemoryStore
    resume/      # Resume Engine
    timeline/    # Timeline builders
    reports/     # Living narrative report evolution
    documents/   # Legacy stubs
    search/      # Memory + knowledge + blueprint + solution + process + deliverable search
    llm/ · persistence/ · prompts/
  domain/ · prompts/ · agents/ · types/ · data/ · styles/
```

## Core domain contracts

- Interview / ConversationMemory / DiscoveryReport (Mission 0–1)
- CompanyWorkspace / Meeting / Person / TimelineEvent (Mission 2)
- WorkspaceKnowledge / KnowledgeAsset / Entity / Relationship (Mission 3)
- **BusinessBlueprint** + capabilities, departments, workflows, entities, rules, matrices (Mission 4)
- **ConsultingIntelligence** — maturity, health, risks, contradictions, opportunities (Mission 5)
- **SolutionArchitecture** — modules, entities, roles, permissions, APIs, roadmap (Mission 6)
- **BusinessProcessModel** — workflows, steps, handoffs, approvals, bottlenecks (Mission 7)
- **ProcessVisualizationModel** — presentation graph + metrics over processes (Mission 8)
- **DeliverablesPackage** — executive summary, PRD, Cursor Context, backlog, … (Mission 9)

## Consulting Intelligence (Mission 5)

Deterministic engines under `lib/consulting/` run after every memory absorb:

```text
answer → absorb → evaluateConsultingIntelligence() → insights / next question
```

Models:

- Business maturity (10 dimensions, score + confidence + evidence)
- Risk patterns (Excel, WhatsApp, tribal knowledge, …)
- Soft contradictions (“This may require clarification…”)
- Timed opportunities (Quick Wins → strategic)
- Business health gauges (incl. AI readiness)
- Expanded Living Whiteboard layers

**No OpenAI. No chat features. Interview UX unchanged.**

## Solution Architecture (Mission 6)

`deriveSolutionArchitecture(blueprint, workspace)` produces:

- Business modules (CRM, Sales, Purchasing, …) with confidence + evidence
- Canonical entities and relationships
- Roles + capability permissions
- Navigation (evidence-backed only)
- Conceptual database + API contracts
- Implementation roadmap (Foundation → … → AI)
- Future AI agents and integrations

Stored on `CompanyWorkspace.solutionArchitecture`. Consumes Blueprint / Knowledge / Meetings / Consulting / Memory. Never replaces them. Never generates code, SQL, diagrams, or PDFs.

## Business Process Engine (Mission 7)

`deriveBusinessProcesses(blueprint, workspace)` produces:

- Process workflows from Blueprint workflows only (never invented)
- Ordered steps with actors, I/O, systems, documents, risk, AI opportunity
- Handoffs · approvals · exceptions · documents
- Bottlenecks (manual approvals, Excel, WhatsApp, paper, …)
- Process metrics + automation candidates
- Cross-refs to Blueprint / Solution / Consulting / Knowledge by ID

Stored on `CompanyWorkspace.businessProcesses`. Structural only — no Mermaid, BPMN, SVG, PDF, or LLM. Future visualizations consume this model.

## Process Visualization (Mission 8)

`deriveProcessVisualization(context, workflowId, view, overlay)` produces a read-only presentation model:

- Executive · Swimlane · Department layouts (deterministic positions)
- Pain / Automation / Time / Dependency overlays (styling + panels)
- Derived Process Studio metrics
- Zoom / pan / select / collapse in **Process Studio** UI

Consumes Process Engine + Blueprint / Solution / Knowledge / Consulting by ID. Never invents workflows. Never edits. No LLM layout.

## Deliverables Engine (Mission 9)

`generateDeliverables(workspaceId)` / `buildDeliverablesPackage(workspace)` produce a structured consulting package:

- Executive Summary · Business Assessment · Blueprint · Solution · Process Book
- PRD · Technical Architecture · Cursor Context
- Development Roadmap · Implementation Plan · Sprint Backlog · Proposal

Stored on `CompanyWorkspace.deliverables`. Documentation only. Export targets (PDF, Word, PPT, Notion, Jira, …) are contracts — not implemented.

## Executive Experience (Mission 9.5)

`deriveExecutiveExperience(workspace)` projects existing models into:

- Discovery journey · confidence meter · executive dashboard
- Animated living blueprint · module insight cards · reasoning cards

Presentation only. No new business engines. No LLM.

## Company Memory (Mission 2)

```text
Interview completes
  → applyInterviewToWorkspace()
    → Meeting · People · Timeline · Living report · Memory
    → Knowledge preserved
    → Business Blueprint version appended (Mission 4)
```

## Knowledge Ingestion (Mission 3)

Knowledge Center is the evidence vault. Pipeline and connectors are architecture-only. Coverage is derived from assets. Resume briefings become knowledge-aware. See [MISSION3.md](./MISSION3.md).

## Business OS Blueprint (Mission 4)

### What it is

A versioned, structured description of the company’s operating system:

- Capabilities (not screens)
- Departments owning capabilities
- Workflows as structured objects (not diagrams yet)
- Steps with actor / input / output / manual / automation potential
- Entity catalog + operating rules
- System inventory with replacement strategies
- Pain point matrix + opportunity matrix
- Future architecture: Current → Transition → Future

### Versioning

```text
Blueprint v1  →  v2  →  v3
(append-only; prior versions superseded, never overwritten)
```

Every discovery interview derives a new version from Knowledge + Memory + Meeting + Reasoning evidence.

### Evidence lineage

Each blueprint carries `BlueprintEvidenceRef` links to:

Knowledge · Memory · Meetings · Reasoning · Timeline · Recommendations

### Future generation pipeline

```text
Business Blueprint (canonical source of truth)
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

Nothing generated in Mission 4 — contracts in `BLUEPRINT_FUTURE_OUTPUTS` only.

### Capability modeling

Capabilities are durable operating abilities (Lead Management, Purchasing, Production, …) with purpose, owner, inputs, outputs, dependencies, pains, and opportunities.

### Workflow modeling

Workflows are data — name, trigger, steps, systems, exceptions, metrics. Diagrams will render later from the same objects (Mission 5).

## Consultant brain

`lib/reasoning/` remains the adaptive interview engine. Blueprints and Knowledge **consume** its outputs; they do not rewrite `think.ts`.

## Persistence

Local `CompanyMemoryStore` holds workspaces including `blueprints[]` and `currentBlueprintId`. Migrations hydrate older local data with Knowledge + Blueprint seeds.

## UI principles

- Minimal, premium, executive document tone for Blueprint
- No dashboard chrome, no diagram canvas yet
- Knowledge Center and Company Memory remain intact

## Architectural decisions

| Decision | Why |
| --- | --- |
| Blueprint separate from living report | Report = narrative; Blueprint = structured OS model |
| Append-only versions | Auditable evolution across consulting relationship |
| Workflows before diagrams | Understand systems first; visualize later |
| Evidence refs everywhere | No hallucination — lineage to memory/knowledge |
| Future outputs as contracts | Generation missions plug in without reshaping the core |

## How it scales

1. **Process maps** → render blueprint workflows
2. **Proposals / PRDs / Cursor prompts** → generate from current blueprint version
3. **Live ingestion** → richer Knowledge → richer blueprint versions
4. **ISALWA OS** → configure product from blueprint modules/entities/rules
5. **Supabase** → durable multi-user blueprint history
