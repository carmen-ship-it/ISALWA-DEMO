# Report as Business Story

**Status:** Complete (presentation layer only)
**App:** `apps/architect`
**Depends on:** Mission 8 (`components/workspace/story-beat.tsx`, `EXECUTIVE_STORYTELLING.md`), Mission 14 (`lib/explanations/`), Evidence-Adaptive Reports (`ADAPTIVE_EVIDENCE_REPORTS.md`)

## Goal

Executives don't buy lists. Every report surface should read as one
McKinsey/Bain-style business story, in this order:

> What we discovered → why it matters → the evidence → business impact →
> risk → opportunity → recommended investment → expected ROI → next steps

This mission **rewrites how existing data is presented**, nothing else. No
`DiscoveryReport` synthesis, no consulting engine, no `lib/deliverables/`
builder, no `lib/explanations/` field was changed. Every beat below renders a
field that already existed before this mission.

## The shared 9-beat spine

Mission 8 built the numbered story-beat primitives (`StoryBeats`, `Beat`,
`BeatList`, `BeatEmpty`, `BeatSubLabel` in `components/workspace/story-beat.tsx`)
and a 7-beat spine used by the deliverables Executive Summary. This mission
**extends that same file and vocabulary** — it does not create a second,
parallel narrative system. The spine grows from 7 to 9 beats (splitting the
old "business impact" beat into distinct **Risk** and **Opportunity** beats,
and the old "recommended solution / expected result" beats into distinct
**Recommended investment** and **Expected ROI** beats), and the nine titles
now live in one shared i18n namespace, `storyBeats` (`lib/i18n/messages/{en,es}.ts`),
instead of being duplicated with slightly different wording per surface:

| # | Beat | Spanish label (`storyBeats.*`) |
| - | --- | --- |
| 1 | What we discovered | Qué descubrimos |
| 2 | Why it matters | Por qué importa |
| 3 | The evidence | La evidencia |
| 4 | Business impact | Impacto en el negocio |
| 5 | Risk | Riesgo |
| 6 | Opportunity | Oportunidad |
| 7 | Recommended investment | Inversión recomendada |
| 8 | Expected ROI | Retorno esperado |
| 9 | Next steps | Próximos pasos |

## Surfaces changed

### 1. Living Report — `components/report/report-view.tsx`

Before this mission, `ReportBody` rendered up to seventeen loosely related
sections (Executive Summary, Confidence, Business Snapshot, Consulting
Assessment, Risk Patterns, Points to Clarify, Opportunity Horizons, Current
Workflow, Current Systems, Pain Points, Recommendations, Suggested
Capabilities, Implementation Plan, Estimated Complexity, Estimated Time,
Open Questions, AI Opportunities, Risks, Executive Conclusion) — a stack of
form-shaped fields, not a story.

`ReportBody` now tells the report as one narrative in the nine beats above.
Every field the report used to show is still shown — nothing was dropped —
just narratively regrouped, and duplication was removed rather than added
(the old report showed risk twice, once as "Patrones de riesgo" near the top
and once as "Riesgos" near the bottom; both now live together under one
**Risk** beat).

`Section` (the report's existing numbered `01`, `02`… kicker + tone-highlight
component from the Premium Visual Quality pass) is still the outer container
for each beat — it already *is* this report's beat marker, so a second
numbering system was not introduced. `BeatSubLabel`, the shared caption
primitive from `story-beat.tsx`, is reused inside each beat to caption the
sub-evidence it is built from (e.g. "Flujo de trabajo actual", "Patrones de
riesgo", "Oportunidades de IA") — this is the concrete reuse of Mission 8's
storytelling primitives this mission was scoped to.

| Beat | Field(s) rendered | Adaptive rule (unchanged from Evidence-Adaptive Reports, or newly extended in the same spirit) |
| --- | --- | --- |
| 1. Qué descubrimos | `executiveSummary`, `businessSnapshot`, `currentWorkflow`, `currentSystems` | Always shown; `currentSystems` sub-list hidden when empty (pre-existing rule) |
| 2. Por qué importa | `painPoints` | Beat omitted when `painPoints.length === 0` (pre-existing rule) |
| 3. La evidencia | Readiness `overallState`/`advice`/`stillLearning` (celebrate-or-explain, pre-existing), `consultingContradictions` | Beat omitted when there is no `readiness` **and** no contradictions — extends the pre-existing "confidence section only with readiness" rule to cover both halves of this beat |
| 4. Impacto en el negocio | `consultingMaturity`, `consultingHealth` | Beat omitted when neither is present (pre-existing rule, previously "Consulting Assessment") |
| 5. Riesgo | `consultingRisks`, `risks` (filtered by `GENERIC_RISK_LINES`) | Beat omitted unless `consultingRisks.length > 0` — the exact pre-existing `hasEvidencedRisk` gate, now covering both lists instead of gating two separate sections |
| 6. Oportunidad | `consultingOpportunities`, `opportunities` (filtered when the finance topic has no evidence, pre-existing), `aiOpportunities` | Beat omitted when all three are empty — new rule, extending the same "never show an empty shell" principle to the merged beat |
| 7. Inversión recomendada | `suggestedRoadmap` (gated by `blueprintReadinessGate`, pre-existing), `potentialModules` | Beat omitted when the roadmap is gated closed **and** there are no modules — new rule, same principle |
| 8. Retorno esperado | `estimatedComplexity`, `estimatedTimeline` | Always shown (pre-existing — these are non-optional fields) |
| 9. Próximos pasos | `unansweredQuestions`, `executiveConclusion` | Open-questions sub-list hidden when empty; conclusion always shown (pre-existing rule) |

No new adaptive heuristic was invented — every gate above reads a signal the
Consultant Readiness Engine, the consulting risk/opportunity engines, or the
existing `GENERIC_RISK_LINES`/`TOPIC_PATTERNS.finance` filters already
produced before this mission.

### 2. Deliverables Executive Summary — `components/workspace/deliverables-panel.tsx`

The `"executive"` case in `DeliverablePreview` already told a 7-beat story
(Mission 8 confirmed and deduplicated it). It now tells the same 9-beat
story as the Living Report, still built from the exact same
`ExecutiveSummaryDeliverable` fields (`lib/deliverables/executive-summary.ts`
was **not** touched):

| Beat | Source |
| --- | --- |
| 1. Qué descubrimos | `d.currentState` |
| 2. Por qué importa | `d.problems` |
| 3. La evidencia | `d.evidence` |
| 4. Impacto en el negocio | `d.biggestRisks` |
| 5. Riesgo | `pack.businessAssessment.risks` (title + severity) |
| 6. Oportunidad | `d.immediateOpportunities` |
| 7. Inversión recomendada | `d.executiveRecommendation`, `d.vision`, `d.investmentAreas` |
| 8. Retorno esperado | `d.strategicOpportunities` |
| 9. Próximos pasos | `d.recommendedRoadmap` |

The one addition worth calling out: beat 5 (**Risk**) reuses
`pack.businessAssessment.risks` — evidence the Business Assessment tab of
the *same already-generated* `DeliverablesPackage` already renders — instead
of repeating `d.biggestRisks` under a second title. Nothing was computed
that didn't already exist; this is presentation-layer reuse across two tabs
of one existing package, not a new engine.

This file had no `useTranslations()` usage before this mission (its other
eleven tabs remain hardcoded Spanish, unmigrated, out of scope). A new
`deliverablesExecutive` i18n namespace was added, scoped to only the new
lead copy this mission introduces on the Executive Summary tab — a small,
additive step, not a full migration of the file.

### 3. Recommendation cards — `components/workspace/executive/explained-recommendation-card.tsx`

Shared by `ModuleInsightCards`, `ReasoningCards`, and `ExecutiveDashboard`'s
"Prioridades justificadas" — the most-reused recommendation surface in the
app. Previously a 7-beat spine (Mission 8); now speaks the same shared
`storyBeats` vocabulary as the other two surfaces, using **eight** of the
nine beats:

| Beat | Field(s) |
| --- | --- |
| 1. Qué descubrimos | `problem` |
| 2. Por qué importa | `observedPattern` |
| 3. La evidencia | `evidence[]`, `supportingFacts[]`, `evidenceBasis` (moved here from the old ROI beat — evidence transparency belongs with the evidence) |
| 4. Impacto en el negocio | `businessValue` |
| 5. Riesgo | `businessConsequence` |
| 6. Inversión recomendada | `recommendation`, `expectedRoi.drivers` (execution effort/horizon/priority — investment-shaped, not return-shaped) |
| 7. Retorno esperado | `expectedRoi.{band,summary}` |
| 8. Próximos pasos | `futureDependencies[]` |

**No standalone "Oportunidad" beat on this surface.** `ExplainedRecommendation`
has no field distinct from `recommendation` / `expectedRoi` that a ninth beat
could render without repeating one of the other eight under a second title.
Per "never invent facts," this surface honestly uses eight beats instead of
manufacturing a ninth. (This mirrors Mission 8's own precedent of documenting
honest gaps rather than papering over them.)

The old beat 4 ("Impacto en el negocio") used to render `businessConsequence`
and `businessValue` together; they are now correctly split — `businessValue`
(literally "Valor de negocio: …") is business impact, `businessConsequence`
(literally "Si no se actúa: …") is risk-of-inaction — a real, non-invented
distinction the field-generation layer (`lib/explanations/business-value.ts`)
already draws, that the old single beat was hiding.

## What was intentionally NOT built

- No changes to `lib/explanations/`, `lib/consulting/`, `lib/deliverables/`,
  `domain/report.ts`, `lib/readiness/`, or any other generation/reasoning
  engine.
- No new narrative facts, scores, or evidence — every beat renders a field
  that already existed on the relevant engine output; the one cross-reference
  (`pack.businessAssessment.risks` inside the executive summary's Risk beat)
  reuses data the same package already computes and already renders
  elsewhere.
- No new component system — `Section` (report), `Article`/`Beat` (deliverables),
  and `ExecutiveDetail`/`Beat` (recommendation cards) were extended in place;
  `story-beat.tsx` itself was not modified, only imported one more place
  (`report-view.tsx`, for `BeatSubLabel`).
- No hiding of data that used to be shown — the Living Report shows every
  field it showed before; only truly duplicate presentations (the two risk
  sections) were consolidated.

## Files changed

- `components/report/report-view.tsx` — `ReportBody` rewritten from
  seventeen sections into the nine-beat story; `BeatSubLabel` imported from
  `story-beat.tsx`.
- `components/workspace/deliverables-panel.tsx` — Executive Summary tab
  extended from 7 to 9 beats; `useTranslations()` added for this tab's new
  copy only.
- `components/workspace/executive/explained-recommendation-card.tsx` —
  beat titles switched to the shared `storyBeats` vocabulary; beat 4 split
  into distinct Business Impact / Risk beats; `evidenceBasis` moved into the
  Evidence beat; ROI beat narrowed to the return itself.
- `lib/i18n/messages/en.ts`, `lib/i18n/messages/es.ts` — new shared
  `storyBeats` namespace (9 keys); two new `reportView` intro keys
  (`storyBusinessImpactIntro`, `storyRoiIntro`); `reportView.painPointsIntro`
  and `reportView.recommendationsIntro` copy updated to their new beat's
  framing (same keys, reused, not duplicated); new `deliverablesExecutive`
  namespace (Executive Summary tab lead copy); `explainedRecommendationCard`
  beat-title keys removed in favor of `storyBeats`, beat-lead keys updated
  for the new field mapping.
- `REPORT_BUSINESS_STORY.md` — this document.

## Constraints honored

- **Never rewrite working systems / never create a parallel implementation**
  — the 9-beat spine extends Mission 8's `story-beat.tsx` primitives and
  vocabulary; no second beat/story component was built.
- **Respect Evidence-Adaptive Reports** — every section-hiding rule from
  `ADAPTIVE_EVIDENCE_REPORTS.md` still holds, now applied at the beat level;
  two new "omit the whole beat" rules (Opportunity, Recommended investment)
  extend the exact same "never show an empty shell" principle.
- **Never invent facts** — every beat renders an existing field; where a
  beat's data genuinely doesn't exist for a surface (recommendation cards'
  Opportunity beat), the beat is honestly omitted instead of fabricated.
- **Spanish via i18n** — every new or changed string on the Living Report and
  the recommendation cards went through `useTranslations()`/`t()`; the
  Executive Summary tab's new copy is the first i18n usage in
  `deliverables-panel.tsx`, scoped to only what this mission touched.
- **Presentation only** — verified: no diff touches `lib/explanations/`,
  `lib/consulting/`, `lib/deliverables/executive-summary.ts`,
  `lib/readiness/`, or `domain/report.ts`.
- **Typecheck, lint, build all pass** (`npx tsc --noEmit`, `npm run lint`,
  `npm run build` — clean; only pre-existing, unrelated warnings remain in
  `lib/consulting/questions/index.ts` and `lib/knowledge/seed.ts`).
