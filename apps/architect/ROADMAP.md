# Roadmap — ISALWA Architect

> Product north star: [docs/VISION.md](../../docs/VISION.md)  
> Every mission must pass the Decision Filter: *Does this make the Architect better at understanding businesses?*

## Mission 0 — Foundation (complete)

- Separate Next.js 15 application
- Typed domain model
- Prompt system
- Architect Agent
- Guided discovery UX
- Observations + discovery report
- Persistence + LLM interfaces

## Mission 1 — Conversational depth (foundation in tree)

- Adaptive consultant brain under `lib/reasoning/`
- Working memory, discovery score, living whiteboard

## Mission 2 — Company Memory & Living Workspace (complete)

- Multi-company living workspaces
- Resume Engine · meetings · timeline · living reports
- See [MISSION2.md](./MISSION2.md)

## Mission 3 — Knowledge Ingestion Engine (complete)

- Knowledge Center · graph contracts · pipeline architecture
- Knowledge-aware briefings · coverage · search
- See [MISSION3.md](./MISSION3.md)

## Mission 4 — Business OS Blueprint Engine (complete)

- Versioned `BusinessBlueprint` as canonical operating model
- See [MISSION4.md](./MISSION4.md)

## Mission 5 — Consulting Intelligence (complete)

- Deterministic maturity, risk, contradiction, opportunity, health engines
- See [MISSION5.md](./MISSION5.md)

## Mission 6 — Solution Architect (complete)

- Deterministic software architecture from Business Blueprint
- Modules · entities · roles · permissions · navigation · APIs · roadmap
- Conceptual database model (no SQL)
- Read-only Solution Architecture workspace panel
- Future outputs as contracts only (no code/PDF/diagram generation)
- See [MISSION6.md](./MISSION6.md)

## Mission 7 — Business Process Engine (complete)

- Canonical operational model from Blueprint workflows
- Steps · actors · handoffs · approvals · bottlenecks · metrics · automation
- Read-only Business Processes workspace panel
- Cross-refs Blueprint / Knowledge / Solution / Consulting by ID
- **No diagrams / Mermaid / BPMN / SVG / PDF / LLM**
- See [MISSION7.md](./MISSION7.md)

## Mission 8 — Business Process Visualization (complete)

- Process Studio renders canonical Process Engine (read-only)
- Views: Executive · Swimlane · Department
- Overlays: Pain · Automation · Time · Dependencies
- Zoom / pan / hover / select / collapse · derived metrics sidebar
- Deterministic layouts — no LLM, no inventing workflows
- See [MISSION8.md](./MISSION8.md)

## Mission 9 — Deliverables Engine (complete)

- Consulting package from Memory · Blueprint · Solution · Processes · Consulting
- Executive summary · Assessment · Blueprint · Solution · Process Book · PRD
- Cursor Context · Roadmap · Implementation Plan · Sprint Backlog · Proposal
- `generateDeliverables(workspaceId)` public API · preview panel
- Export contracts only (PDF/Word/PPT/Notion/Jira — not implemented)
- See [MISSION9.md](./MISSION9.md)

## Mission 9.5 — Executive Experience Polish (complete)

- Confidence meter · discovery journey · executive dashboard
- Animated living blueprint · module insight cards · reasoning cards
- Presentation-only — derives from existing models
- See [MISSION9_5.md](./MISSION9_5.md)

## Mission 10 — Senior Consultant Thinking

Make interviews feel like a real senior consultant — not a form.

- Consequence questions grounded in prior evidence
- Example: “Only one person knows purchasing — if they resigned tomorrow, what happens?”
- Deeper adaptive probing without new discovery engines as the headline

## Mission 11 — Live evidence intake

Implement Knowledge pipeline + connectors (upload, CRM/ERP, transcripts).

## Mission 12 — Blueprint → ISALWA OS

Map current blueprint + solution architecture + processes into OS project genesis.

## Mission 13 — Voice & live workshop mode

Voice interviews, multi-participant sessions, facilitator view.

## Non-goals (near term)

- Becoming a general chatbot
- Using LLMs for consulting, solution, process, or deliverable scoring
- Generating production code, SQL, OpenAPI, or binary exports before dedicated missions
- Editable process designer (visualization is read-only)
- Live uploads / AI extraction before Mission 11
