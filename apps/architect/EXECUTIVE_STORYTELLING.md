# Executive Storytelling — Presentation Pass (Mission 8)

**Status:** Complete (presentation layer only)
**App:** `apps/architect`
**Depends on:** Mission 14 (`lib/explanations/`), Deliverables Engine (Mission 9), Living Report (`domain/report.ts`)

## Goal

Every recommendation and every findings surface should read as a McKinsey-style
executive story, not a form. For each recommendation the reader should be able
to answer, in order:

> What happened? Why? What's the evidence? What does it cost the business?
> What do we recommend? What result should we expect? What happens next?

This pass changes **only how existing data is rendered**. No explanation,
recommendation, report, or deliverables *generation* logic was touched.

## Hard constraints honored

- No changes to `lib/explanations/`, `lib/consulting/`, `lib/deliverables/`,
  `domain/report.ts`, or any other generation/reasoning engine — verified by
  `git diff --stat` before commit (only `components/workspace/**` files
  changed, plus this doc).
- Every story beat below maps to a field that already exists on an engine
  output. Nothing was invented.
- Where an engine output can legitimately be an empty list (evidence,
  dependencies, evidence refs), the UI says so honestly instead of hiding the
  section or fabricating content.
- Kept the existing local design system for this app (`components/ui/*`,
  `SectionShell`, `ExecutiveDetail`, `architect-serif`, neutral/porcelain
  palette, soft cards). `@isalwa/ui` is declared as a workspace dependency in
  `package.json` but is not imported anywhere in `apps/architect` — this app's
  frozen visual language is implemented locally, so this mission did not
  introduce the app's first cross-package `@isalwa/ui` import (that's a
  separate, larger migration decision, not a presentation-only one).
- Spanish executive copy throughout — every surface this mission touched
  (recommendation cards, cockpit, deliverables Executive Summary, Living
  Report) was already Spanish; no language conversion was needed or attempted
  here.
- Extended the existing pattern instead of duplicating it: the numbered
  story-beat UI already existed in one place (`DeliverablesPanel`'s Executive
  Summary tab) before this mission — it has been extracted into a shared
  component and is now reused by the recommendation card, rather than a
  second parallel implementation being built next to it.

## The 7-beat story spine

| # | Beat (McKinsey) | Spanish label (used everywhere in this app) |
| - | --- | --- |
| 1 | What happened | Qué encontramos |
| 2 | Why | Por qué importa |
| 3 | Evidence | La evidencia |
| 4 | Business impact | Impacto en el negocio |
| 5 | Recommended solution | Solución recomendada |
| 6 | Expected result | Resultado esperado |
| 7 | Next step | Próximo paso |

## What this mission actually found and did

Before starting, this app already had **two of the three** target surfaces
storytelling-shaped (from earlier work) and **one surface not yet done**:

| Surface | Before this mission | After this mission |
| --- | --- | --- |
| `DeliverablesPanel` → Executive Summary tab | Already had the numbered 7-beat spine (`Beat`/`BeatList`/`BeatEmpty`, private to the file) | Unchanged behavior; now imports the beat primitives from a new shared module instead of defining its own copy |
| `ReportView` (Living Report) | Already had page-level storytelling (`Section` with an optional `intro` lead-in on Executive Summary / Pain Points / Recommendations / Executive Conclusion, priority pills, honest empty states) | Unchanged — already met the mission's page-level bar |
| `ExplainedRecommendationCard` — the **primary** recommendation surface, shared by `ModuleInsightCards`, `ReasoningCards`, and `ExecutiveDashboard`'s "Prioridades justificadas" | Still an ad-hoc list of 10 unordered sections (Problema, Patrón observado, Consecuencia de negocio, Recomendación, ROI esperado, Confianza, Valor de negocio, Evidencia, Hechos de soporte, Dependencias futuras) with no explicit story order | **Rewritten** into the numbered 7-beat spine below |

The gap was real: the most-used recommendation surface in the product (it
renders on the Recommendations tab twice and in the cockpit) was not yet
telling the story in McKinsey order. This mission closed that gap and, while
doing so, deduplicated the beat-rendering UI into one shared place so a third
copy doesn't get built next time.

### 1. New shared component: `components/workspace/story-beat.tsx`

Extracted `Beat`, `BeatList`, `BeatEmpty` (previously private to
`deliverables-panel.tsx`) plus a new `BeatSubLabel` and `StoryBeats` wrapper
into a shared file. `DeliverablesPanel` was updated to import from here
instead of defining its own copy — behavior and markup are unchanged, this is
a pure extraction. `ExplainedRecommendationCard` now uses the same primitives.

### 2. `ExplainedRecommendationCard` (primary surface)

`components/workspace/executive/explained-recommendation-card.tsx` — shared by:

- `ModuleInsightCards` (Recommendations tab · capabilities)
- `ReasoningCards` (Recommendations tab · rationale)
- `ExecutiveDashboard` (cockpit · "Prioridades justificadas", compact mode)

Rewritten from the 10-section ad-hoc list into the numbered 7-beat story
inside the existing `ExecutiveDetail` progressive-disclosure panel. Field
mapping (`ExplainedRecommendation` → beat):

| Beat | Field(s) | Empty handling |
| --- | --- | --- |
| 1. Qué encontramos | `problem` | Engine guarantees a non-empty fallback sentence — never empty. |
| 2. Por qué importa | `observedPattern` | Same — engine fallback text. |
| 3. La evidencia | `evidence[]` + `supportingFacts[]` | Explicit "Aún no hay piezas de evidencia vinculadas…" when `evidence.length === 0`; supporting-facts sub-list only renders when non-empty. |
| 4. Impacto en el negocio | `businessConsequence` + `businessValue` | Engine fallback text — never empty. |
| 5. Solución recomendada | `recommendation` | Engine fallback text — never empty. |
| 6. Resultado esperado | `expectedRoi.{band,summary,drivers}` + `confidence.{band,summary,factors}` | Drivers/factors lists render only when non-empty; summary text always present. |
| 7. Próximo paso | `futureDependencies[]` | Explicit "Sin dependencias explícitas…puede avanzar directamente…" when empty. |

The collapsed header (title, priority pill, ROI/confidence/evidence-count
strip, one-line business value) is unchanged — it remains the "bottom line up
front" and the story spine is the supporting detail behind
`ExecutiveDetail`'s existing progressive-disclosure pattern from Mission 14.
`compact` mode (used in the cockpit) renders the identical 7-beat spine at
tighter card padding — no content was cut for the compact variant, since
hiding a story beat would be dishonest, not concise.

### 3. `DeliverablesPanel` — Executive Summary deliverable

`components/workspace/deliverables-panel.tsx`, `DeliverablePreview` →
`"executive"` case. No behavior change — this mission confirmed the existing
7-beat spine (`d.currentState` → `d.problems` → `d.evidence` →
`d.biggestRisks` → `d.executiveRecommendation`/`d.vision`/`d.investmentAreas`
→ `d.immediateOpportunities`/`d.strategicOpportunities` →
`d.recommendedRoadmap`) already matches the target spine exactly, and moved
its `Beat`/`BeatList`/`BeatEmpty` primitives to the new shared module (see
above) so the pattern isn't duplicated a third time going forward.

No other deliverable tab (Business Assessment, Blueprint, Architecture,
Process Book, PRD, Roadmap, Build Brief, Implementation Plan, Backlog,
Proposal, Exports) was restructured — those are structured documents, not
recommendation narratives, and are out of this mission's stated scope
("recommendation presentations… report pages… deliverables narrative
sections **if they surface recommendations**").

### 4. `ReportView` — Living Report

`components/report/report-view.tsx`. No behavior change — this mission
confirmed the existing page-level storytelling already meets the mission's
"clear hierarchy, one idea flow" bar: `Section` already has an optional
`intro` prop (a one-sentence connective lead-in under the section kicker),
used on **Executive Summary**, **Pain Points**, **Recommendations**, and
**Executive Conclusion**; **Recommendations** already show the `priority`
field as a pill; **Pain Points** and **Recommendations** already have honest
empty states. The report is a long document, not a single recommendation
card, so it intentionally does not carry the full numbered spine — the
existing situation → findings → recommendation → decision throughline was
judged sufficient and was left untouched per "extend before replace."

## Gaps — where a story beat is honestly incomplete

1. **Report-level recommendations have no structured Evidence, Confidence, or
   ROI beat.** `DiscoveryReport.opportunities` is `Recommendation[]`
   (`id`, `title`, `rationale`, `priority`, `relatedPainPoints`) — the
   evidence quote is already folded as free text into `rationale` by
   `domain/report.ts` (e.g. `"… Evidence: "…"."`). Surfacing a real Evidence
   beat here would require either (a) generating `ExplainedRecommendation`
   objects for report opportunities too, or (b) an engine change to carry
   structured evidence on `Recommendation`. Both are out of scope for a
   presentation-only mission. **Recommendation:** a follow-up mission could
   route report recommendations through `explainWorkspaceRecommendation` when
   a `workspaceId` is present, so the report gets the same 7-beat spine as the
   workspace cards — with no engine changes.
2. **Deliverables Executive Summary has no per-item Confidence.** The
   deliverable type does not carry a confidence score per problem/risk/
   opportunity — only `overallConfidence` at the package level (already shown
   above the tab strip in `DeliverablesPanel`). The "Expected result" beat
   therefore shows the opportunity lists without a confidence qualifier. This
   is honest given current data — not fabricated.
3. **`ExplainedRecommendation.evidence` items sometimes lack a `quote`** (some
   sources, e.g. `blueprint`, `process`, `knowledge`, only carry a `label`).
   The card already falls back to `item.label` in that case (pre-existing
   behavior, unchanged) — flagged here only because it means beat 3 is
   sometimes label-only rather than a verbatim quote.
4. **Other deliverable tabs** (assessment, blueprint, solution, processes,
   prd, roadmap, cursor, implementation, backlog, proposal) still use the flat
   `Section`/`List` layout. They are structured documents rather than
   recommendation narratives, so a 7-beat story spine would force-fit data
   that doesn't map cleanly (e.g. a PRD's "Acceptance Criteria" isn't a
   "Business impact"). Left untouched per "extend before replace."
5. **This doc previously described `ExplainedRecommendationCard` as already
   rewritten into the 7-beat spine, and claimed `ReportView`/
   `DeliverablesPanel` were English-voiced.** Neither was accurate against
   the actual code at the start of this mission (the card was still the old
   10-section layout; both other surfaces were already Spanish). This
   revision of the doc reflects what is actually in the codebase after this
   mission's changes, verified by reading every file referenced above and by
   a clean `typecheck`/`lint`/`build`.

## What was intentionally NOT built

- No new recommendation/report/deliverables generation logic.
- No new narrative facts, scores, or evidence — every beat renders a field
  that already existed on the relevant engine output.
- No `@isalwa/ui` import and no new parallel card/panel system — extended the
  existing `ExplainedRecommendationCard`, `Section` (report), and
  `Article`/`Beat` (deliverables) in place, and consolidated the one
  duplicated pattern (`Beat`/`BeatList`/`BeatEmpty`) into a single shared
  module instead of leaving or growing a second copy.
- No change to `ExecutiveDetail`'s progressive-disclosure mechanics — the
  story spine lives inside its existing expand/collapse behavior.

## Definition of done

- [x] Story-structured recommendation card (`ExplainedRecommendationCard`) —
      used everywhere recommendations render — rewritten into the numbered
      7-beat spine.
- [x] Story-structured deliverables Executive Summary tab — verified already
      correct; deduplicated its beat primitives into a shared module.
- [x] Page-level storytelling hierarchy in the Living Report (`ReportView`) —
      verified already correct.
- [x] `EXECUTIVE_STORYTELLING.md` — rewritten to match actual code.
- [x] Lint passes clean (`npm run lint` — 0 errors, only pre-existing
      unrelated warnings in `discovery-journey.tsx` and
      `lib/consulting/questions/index.ts`).
- [x] Typecheck passes (`npm run typecheck` — clean).
- [x] Production build passes (`npm run build` — clean).
