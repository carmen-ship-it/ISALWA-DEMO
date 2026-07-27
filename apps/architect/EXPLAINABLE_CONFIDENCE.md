# Explainable Confidence

**Status:** Complete
**App:** `apps/architect`
**Module:** `lib/readiness/explainable-confidence.ts` (extends the Consultant
Readiness Engine and the Missing Information Engine — no parallel scoring
brain, no second confidence model)
**Extends:** the Discovery Score's evidence-key math
(`computeDiscoveryScore`, `DimensionStatus.confidence`), the Readiness
Engine's topic evaluation (`evaluate.ts`), the Missing Information Engine's
ranked opportunities (`missing-information.ts`), the Maturity Model and
Business Health gauges (`lib/consulting/maturity.ts`,
`lib/consulting/health.ts`), Knowledge coverage (`lib/knowledge/coverage.ts`)
**Aligns with:** Understandable Scores (`UNDERSTANDABLE_SCORES.md`) — human
language, never a bare unexplained percentage

## What it is

A client looking at "Business Understanding: 81%" eventually asks the
question a senior consultant is trained to answer before it is even raised:

> **¿Por qué 81%, y no 95%?**

Explainable Confidence answers it category by category, the same way a
consultant would talk through a diagnostic: which parts of the business we
already understand well, which ones are still thin, why, and exactly what
would raise the weak ones — reusing the Missing Information Engine's ranked
opportunities for "how to raise it" instead of inventing new advice.

```
Overall Confidence 81%
  Ventas 92% · Operaciones 75% · Finanzas 34% · Equipo 21% · …
  + a concrete way to raise every weak one, reused from the Missing
    Information Engine ("+9% de confianza en finanzas si subes la política
    de aprobación de compras").
```

## No parallel scoring brain

`overall` is **never recomputed**. It is passed straight through from
`EvidenceSnapshot.overallUnderstanding` — the exact number
`computeDiscoveryScore` already publishes everywhere else (Dashboard,
Context Bar, Welcome Banner, Discovery Score Card). Every **core** category
score is the exact `DimensionStatus.confidence` that number is already the
plain average of. This module explains that arithmetic back to the client;
it does not introduce a second one.

```
EvidenceSnapshot ────────┐
ReadinessAssessment ─────┼──▶ buildExplainableConfidenceReport(...)
MissingInformationReport ┤        │
ConsultingIntelligence   │        ├─ coreCategories          → one per applicable
  (maturity + health)    │        │                            discovery dimension,
Knowledge coverage ──────┘        │                            averages to `overall`
                                   └─ supplementaryCategories → Documentation,
                                                                 Automation Readiness,
                                                                 Data Quality,
                                                                 Operational Coverage,
                                                                 AI Readiness — shown,
                                                                 never averaged in
```

## Categories — mapped, not invented

The mission named nine business categories a CEO would ask about. Every one
of them is mapped onto evidence that already exists somewhere in the
platform; none is a new scoring model.

### Core — average exactly to `overall`

One entry per **applicable** discovery dimension (`DimensionStatus`, the
same eight topics the Readiness Engine and the Missing Information Engine
already use — `production` drops out for industries where it does not
apply, exactly as it does everywhere else). Each core category's score is
`dimension.confidence`, its "why" is the same `TopicReadiness.headline`
`evaluate.ts` already produces, and its "how to raise" is the same
`MissingInformationOpportunity.headline` `missing-information.ts` already
ranked for that topic — reused verbatim, not recomputed.

| Mission category | Existing source |
| --- | --- |
| Business Processes | `operations` discovery dimension ("Operaciones") |
| Systems | `systems` discovery dimension ("Sistemas") |
| Departments / People | `team` discovery dimension ("Equipo") — one dimension backs both; showing it twice with the same number would read as a fabricated split, so it is shown once |
| *(not requested, kept for honesty)* | `sales`, `customers`, `geography`, `finance`, `production` — the remaining discovery dimensions. Omitting them would make `overall` un-explainable (`overall` is their average too), so every applicable core category is shown, not a curated subset. |

Each applicable core category carries an explicit `weightPercent` — an equal
share (`100 ÷ number of applicable categories`) — so the client can see for
themselves that `overall` really is their plain average, not a hidden
re-weighting.

### Supplementary — shown, never averaged in

These four map onto real signals that live outside the Discovery Score, so
mixing them into `overall` would be a second scoring model wearing the first
one's number. They are shown with a clear "not counted in the total"
caption instead.

| Mission category | Existing source | Honesty gate |
| --- | --- | --- |
| Documentation | `documentation` Maturity dimension (`lib/consulting/maturity.ts`) | `dimension.confidence` |
| Automation Readiness | `automation` Maturity dimension | `dimension.confidence` |
| Data Quality | `data` Maturity dimension | `dimension.confidence` |
| Operational Coverage | Knowledge coverage slice for `Operations` (`lib/knowledge/coverage.ts`) — document-backed, distinct from the interview-backed `operations` core category above | slice always present; percent shown as-is |
| AI Readiness | `ai_readiness` Business Health gauge (`lib/consulting/health.ts`) — itself `data × 0.5 + automation × 0.3 + documentation × 0.2`, so "how to raise it" honestly points back at those same three signals instead of a new heuristic | `gauge.confidence` |

`AI Readiness` is the one mission explicitly allowed to be omitted "if it
cannot be derived honestly." It can — the Business Health engine already
derives it from real evidence signals with its own `confidence` field — so
it is shown, gated by that same field.

### The honesty gate — never a fabricated number

A supplementary category's engine-of-origin (Maturity Model, Business
Health) already computes a `confidence` per dimension from real
signals — text-pattern matches over known facts, pain points, current
software and business signals (`lib/consulting/maturity.ts`), not a model
guess. When that confidence falls below `THIN_CONFIDENCE` (40 — the exact
bar `evaluate.ts` already uses for "the honest answer is *necesitamos más
información*"), the category shows **"Sin suficiente información"** instead
of a number:

```ts
if (!dimension || dimension.confidence < THIN_CONFIDENCE) {
  return insufficientCategory(...); // score: null, never a guess
}
```

Core categories never hit this gate: `dimension.confidence` of `0` is
itself the honest answer ("no evidence yet"), the same way
`DiscoveryScoreCard` already shows `0%` rather than hiding a dimension.

## API

```ts
import {
  assessExplainableConfidence,       // (workspace) → ExplainableConfidenceReport — entry point
  assessMemoryExplainableConfidence, // (memory) → report — live interview / memory-only report path
  buildExplainableConfidenceReport,  // (snapshot, assessment, missing, consulting, coverage) → report — composition
  type ConfidenceCategory,
  type ExplainableConfidenceReport,
} from "@/lib/readiness";
```

`ExplainableConfidenceReport`:

| Field | What it is |
| --- | --- |
| `overall` | The exact Business Understanding number — never recomputed |
| `overallLevel` / `overallSentence` | Mission 11 (`Understandable Scores`) human-language wrapper — reused, not reimplemented |
| `headline` | Detective-register comparison of the strongest/weakest core category — reused verbatim from the Missing Information Engine |
| `coreCategories` | Average exactly to `overall` |
| `supplementaryCategories` | Shown for context; never averaged into `overall` |

`ConfidenceCategory`: `label` (Spanish, engine-owned), `score` (`0–100` or
`null`), `weightPercent` (core only), `why`, `howToRaise` (`string[]`,
reused from the Missing Information Engine where the topic already has a
ranked opportunity), `uploadSuggestions`, `uploadable`,
`insufficientEvidence`.

## UX surfaces

| # | Surface | What it shows |
| --- | --- | --- |
| 1 | **Dashboard, section 2 "Comprensión del negocio"** | `ExplainableConfidenceBreakdown` in a new subsection right after the existing per-area readiness list, below the `ConfidenceMeter` — the same `businessUnderstanding` number, now with the category breakdown next to it |
| 2 | **Report, Beat 3 "La evidencia"** | The same breakdown, rendered right below the existing readiness advice, so the report's confidence section is never a bare percentage either |

Both surfaces render `lib/readiness/explainable-confidence.ts` output
verbatim — no component computes or re-derives a number.

`components/workspace/executive/readiness-panel.tsx` (the Readiness
Engine's existing client-surfaces file) gained
`ExplainableConfidenceBreakdown` rather than a new file, following the same
"same engine's UI, one lens over" convention the Missing Information Engine
established.

## Language rules

Same convention as the rest of the Readiness Engine: the engine's own
generated content (category labels, "why", "how to raise") is Spanish text
produced inside `lib/readiness/`, not routed through i18n, because it is
*always* Spanish regardless of locale — the engine owns the words. Only the
**UI chrome** around it — the section kicker/description, the "not counted
in the total" caption, the weight hint — goes through `useTranslations()` /
`explainableConfidence.*` in `lib/i18n/messages/{es,en}.ts`, matching every
other panel in this codebase.

- ✅ "+9% de confianza en finanzas si subes la política de aprobación de compras."
- ✅ "Sin suficiente información" (never a guessed percentage)
- ❌ "Confidence: 62%" · "AI-estimated score" · a category with no underlying evidence source

## Deliberately out of scope (this mission)

- No new scoring model — `overall` and every core category score are values
  other engines already publish; supplementary categories reuse the Maturity
  Model / Business Health `confidence` fields as-is.
- No change to the Discovery Score's threshold, weighting or conclusion
  logic.
- No new "Departments" category distinct from "People" — both mission names
  point at the same `team` dimension; showing it twice with an identical
  number would read as an invented split.
- No document-category taxonomy changes — upload suggestions reuse the
  Missing Information Engine's existing vocabulary verbatim.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (the two pre-existing warnings in
  `lib/consulting/questions/index.ts` and `lib/knowledge/seed.ts` are
  unrelated to this mission and unchanged).
- `npm run build` — production build succeeds.
- Traced an empty workspace (every core category shows `0%` honestly,
  supplementary categories show "Sin suficiente información", no
  divide-by-zero), a partially-seeded workspace (core categories sum/average
  to the same `overall` shown on the Dashboard meter; supplementary
  categories with `confidence` ≥ 40 show a real score; `Operational
  Coverage` shows the Knowledge coverage note verbatim), and the live
  interview / memory-only report path (no `knowledge` object — `Operational
  Coverage` honestly reports "not enough information" instead of a
  document-based number it has no way to produce there).

## Files changed

- `lib/readiness/explainable-confidence.ts` — new; the engine
- `lib/readiness/index.ts` — exported the new module's public API, updated
  the module doc comment
- `components/workspace/executive/readiness-panel.tsx` — added
  `ExplainableConfidenceBreakdown` (and its internal `ConfidenceCategoryRow`)
- `components/workspace/executive/executive-dashboard.tsx` — new
  `explainableConfidence` prop, renders the breakdown in section 2
- `components/workspace/workspace-view.tsx` — computes
  `assessExplainableConfidence(workspace)`, wires it into `ExecutiveDashboard`
- `components/report/report-view.tsx` — computes the report for both the
  workspace and memory-only report paths, renders it in Beat 3 ("La
  evidencia")
- `lib/i18n/messages/es.ts`, `lib/i18n/messages/en.ts` — added
  `explainableConfidence.*` UI chrome strings
