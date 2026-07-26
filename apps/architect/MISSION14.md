# Mission 14 — Explain Every Recommendation

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Consulting · Blueprint · Solution · Processes · Executive presentation

## Goal

Every recommendation must justify itself. For each recommendation, Architect answers:

| Question | Field |
| --- | --- |
| Why? | `problem` + `recommendation` |
| Evidence? | `evidence` + `supportingFacts` |
| Confidence? | `confidence` |
| Business Value? | `businessValue` + `businessConsequence` |
| ROI? | `expectedRoi` |
| Dependencies? | `futureDependencies` |

Plus: **Observed Pattern**.

## Hard constraints honored

- Deterministic explanations derived from existing workspace / recommendation / opportunity / consulting / blueprint / process evidence
- **No LLM**
- Spanish executive copy for UI
- **Did not rewrite** consulting / blueprint / process / solution / deliverables / reasoning engines — only **added** an explanation layer
- Stayed in `lib/explanations/` + recommendation UI (parallel-safe with missions 10–13)
- Reused `ExecutiveDetail` progressive disclosure

## Structure

```text
lib/explanations/
  ├── types.ts              ExplainedRecommendation + evidence / ROI / confidence types
  ├── evidence.ts           Collect evidence refs from workspace models
  ├── roi.ts                Expected ROI bands + Spanish summaries
  ├── confidence.ts         Score + band from consulting / risks / opps / density
  ├── business-value.ts     Problem, pattern, consequence, value, dependencies
  ├── recommendation.ts     explainRecommendation / modules / workspace lists
  └── index.ts              Public API
```

### `ExplainedRecommendation`

- Problem  
- Evidence  
- Observed Pattern  
- Business Consequence  
- Recommendation  
- Expected ROI  
- Confidence  
- Supporting Facts  
- Future Dependencies  

### Public API

```typescript
import {
  explainRecommendation,
  explainWorkspaceRecommendations,
  explainSolutionModules,
} from "@/lib/explanations";

const explained = explainRecommendation(rec, workspace);
const list = explainWorkspaceRecommendations(workspace);
const modules = explainSolutionModules(workspace);
```

## UI

Shared component: `ExplainedRecommendationCard`  
(`components/workspace/executive/explained-recommendation-card.tsx`)

Expandable via `ExecutiveDetail` — summary first, full justification on request.

| Surface | Wiring |
| --- | --- |
| Recommendations tab · capabilities | `ModuleInsightCards` → explained solution modules |
| Recommendations tab · rationale | `ReasoningCards` → explained consulting / workspace recs |
| Executive cockpit | `ExecutiveDashboard` · “Prioridades justificadas” (compact cards) |

## What was intentionally NOT built

- LLM-generated narratives
- Changes to consulting / blueprint / process / solution / deliverables / reasoning engines
- New parallel recommendation engines
- English-only UI copy for explanation labels

## Definition of done

- [x] `lib/explanations/` + types
- [x] Expandable recommendation cards wired
- [x] `MISSION14.md`
- [x] Typecheck passes
