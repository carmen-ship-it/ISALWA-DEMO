# Mission 11 — Arrive Prepared

**Status:** Complete (architecture)  
**App:** `apps/architect`  
**Depends on:** Mission 2 Company Memory · Mission 3 Knowledge · Mission 5 Consulting · Resume Engine

## Goal

The Architect should **never start with a blank mind**. Before every interview it prepares from every available in-app source and produces a structured Preparation Brief plus a Spanish interview opening.

> “Revisé la información disponible de la empresa. Ya comprendo aproximadamente X%. Ahora solo necesito aclarar…”

## Hard constraints honored

- **Architecture only** — preparation engine + contracts
- **No uploads** · **No AI extraction** · **No OCR** · **No connectors**
- Deterministic derivation only (no LLM, no file parsing)
- Does **not** rewrite consulting / reasoning / blueprint / solution / process / deliverables engines
- Extends / reuses existing Knowledge Center + workspace memory types
- User-facing interview opening strings in **Spanish**

## What was built

### Module (`lib/preparation/`)

| File | Role |
| --- | --- |
| `prepare-company.ts` | Main entry: `prepareCompany(workspace)` → `PreparationBrief` |
| `company-brief.ts` | Types + brief assembly + `buildInterviewOpening` |
| `knowledge-merge.ts` | Merge workspace / knowledge / memory into `PreparationInput` |
| `confidence.ts` | Prep confidence (“already understand approximately X%”) |
| `coverage.ts` | Department / topic coverage |
| `sources.ts` | FUTURE source kind contracts (enums + catalog, no fetch) |
| `index.ts` | Public API |

### Preparation Brief sections

- Already Known
- Likely Risks
- Unknown Areas
- Questions To Validate
- Departments Requiring Attention
- Potential Quick Wins
- Potential Missing Systems

Plus: `confidence`, `coverage`, `interviewOpening`, `impliedSourceKinds`, `futureSources`.

### How the brief is derived today

Pure functions over existing `CompanyWorkspace` fields:

1. **Knowledge merge** — `knownFacts`, meeting discoveries, knowledge themes, pain points, open questions, unknown areas, departments, current software, consulting risks / quick wins, whiteboard modules
2. **Confidence** — weighted blend of `businessUnderstanding`, discovery score overall, Knowledge Center coverage averages, with a small evidence-volume boost
3. **Coverage** — Knowledge coverage areas (Customers / Sales / Operations / Finance / HR) merged with discovery dimensions; topics below 40% require attention
4. **Risks / quick wins / missing systems** — from consulting intelligence + pain-point heuristics + whiteboard modules vs current software (deterministic rules)
5. **Interview opening** — Spanish template using `confidence.approximatePercent` and the top clarify focus

**No file I/O. No LLM. No parsing.**

### FUTURE sources (contracts only — not wired)

Meeting transcripts · Customer databases · Excel · CRM exports · ERP exports · Invoices · Website · Social media · Organizational charts · Documents · PDF · Word · Images · Email

Catalog: `PREPARATION_SOURCE_CONTRACTS`. Adapter interface exists but `fetch` is intentionally unimplemented.

### Resume wiring (thin)

`buildResumeBriefing` calls `prepareCompany(workspace)` when memory or processed knowledge exists and leads the greeting with `prep.interviewOpening`. Cold start (no memory, no knowledge) is unchanged.

`createWorkspaceInterview` continues to use `buildResumeBriefing` — no separate rewrite.

Public API for Mission 12+:

```typescript
import { prepareCompany, buildInterviewOpening } from "@/lib/preparation";

const brief = prepareCompany(workspace);
// brief.interviewOpening
// brief.alreadyKnown / likelyRisks / unknownAreas / …
```

## Intentionally deferred

| Deferred | Why |
| --- | --- |
| File uploads | Mission 12+ intake |
| OCR / AI extraction | Out of scope |
| Live connectors (Drive, CRM, ERP, email) | Contracts only |
| Website / social fetch | Source kinds only |
| UI panel for Preparation Brief | Architecture mission |
| Replacing Knowledge briefing English lines | Preserve Mission 3 behavior; Spanish prep opening is additive |

## Non-goals / do not conflict

- Mission 10 consulting questions (`lib/consulting/questions/` if present) — stay out of that tree; preparation lives only under `lib/preparation/`
- No changes to consulting evaluation engines beyond **reading** existing `conversationMemory.consulting`

## Definition of done

- [x] `lib/preparation/` module + types
- [x] `MISSION11.md`
- [x] Typecheck `@isalwa/architect`
- [x] Thin optional resume greeting integration
- [x] Commit + push `origin/main`
