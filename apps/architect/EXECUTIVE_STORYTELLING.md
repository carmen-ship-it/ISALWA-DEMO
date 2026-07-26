# Executive Storytelling — Presentation Pass

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
  `domain/report.ts`, or any other generation/reasoning engine.
- Every story beat below maps to a field that already exists on an engine
  output. Nothing was invented.
- Where an engine output can legitimately be an empty list (evidence,
  dependencies, evidence refs), the UI says so honestly instead of hiding the
  section or fabricating content.
- Kept the existing local design system for this app (`components/ui/*`,
  `SectionShell`, `ExecutiveDetail`, `architect-serif`, neutral/porcelain
  palette, soft cards). `@isalwa/ui` is **not** a dependency of
  `apps/architect` (see `package.json`) — this app's frozen visual language is
  implemented locally, so no cross-package import was introduced.
- Spanish executive copy was added only where the surrounding surface is
  already Spanish (recommendation cards, cockpit). English-language surfaces
  (`ReportView`, `DeliverablesPanel`) kept their existing voice — see
  **Language note** below.

## The 7-beat story spine

| # | Beat (McKinsey) | Spanish label (recommendation cards) | English label (deliverables) |
| - | --- | --- | --- |
| 1 | What happened | Qué encontramos | What happened |
| 2 | Why | Por qué importa | Why it matters |
| 3 | Evidence | La evidencia | The evidence |
| 4 | Business impact | Impacto en el negocio | Business impact |
| 5 | Recommended solution | Solución recomendada | Recommended solution |
| 6 | Expected result | Resultado esperado | Expected result |
| 7 | Next step | Próximo paso | Next step |

## Where the spine lives now

### 1. `ExplainedRecommendationCard` (primary surface)

`components/workspace/executive/explained-recommendation-card.tsx` — shared by:

- `ModuleInsightCards` (Recommendations tab · capabilities)
- `ReasoningCards` (Recommendations tab · rationale)
- `ExecutiveDashboard` (cockpit · "Prioridades justificadas", compact mode)

Rewritten from an ad-hoc list of expandable sections into a numbered 7-beat
story inside the existing `ExecutiveDetail` progressive-disclosure panel.
Field mapping (`ExplainedRecommendation` → beat):

| Beat | Field(s) | Empty handling |
| --- | --- | --- |
| 1. Qué encontramos | `problem` | Engine guarantees a non-empty fallback sentence — never empty. |
| 2. Por qué importa | `observedPattern` | Same — engine fallback text. |
| 3. La evidencia | `evidence[]` + `supportingFacts[]` | Explicit "Aún no hay piezas de evidencia vinculadas…" when `evidence.length === 0`; supporting facts sub-list only renders when non-empty. |
| 4. Impacto en el negocio | `businessConsequence` + `businessValue` | Engine fallback text — never empty. |
| 5. Solución recomendada | `recommendation` | Engine fallback text — never empty. |
| 6. Resultado esperado | `expectedRoi.{band,summary,drivers}` + `confidence.{band,summary,factors}` | Drivers/factors lists render only when non-empty; summary text always present. |
| 7. Próximo paso | `futureDependencies[]` | Explicit "Sin dependencias explícitas…puede avanzar directamente…" when empty. |

The collapsed header (title, priority pill, ROI/confidence/evidence-count
strip, one-line business value) is unchanged — it remains the "bottom line up
front" and the story spine is the supporting detail, consistent with the
existing progressive-disclosure pattern from Mission 14.

### 2. `DeliverablesPanel` — Executive Summary deliverable

`components/workspace/deliverables-panel.tsx`, `DeliverablePreview` → `"executive"`
case. Restructured `ExecutiveSummaryDeliverable` into the same 7-beat spine
(English, matching this panel's existing voice):

| Beat | Field(s) | Empty handling |
| --- | --- | --- |
| 1. What happened | `currentState` | Engine always fills this with a fallback description. |
| 2. Why it matters | `problems[]` | Engine seeds a placeholder item when discovery is incomplete. |
| 3. The evidence | `evidence[]` (`DeliverableEvidenceRef`) | "No evidence references attached yet." when empty. |
| 4. Business impact | `biggestRisks[]` | Engine seeds a placeholder when risk profile is incomplete. |
| 5. Recommended solution | `executiveRecommendation` + `vision` + `investmentAreas[]` | Investment areas sub-list only renders when non-empty. |
| 6. Expected result | `immediateOpportunities[]` + `strategicOpportunities[]` | Each sub-list only renders when non-empty. |
| 7. Next step | `recommendedRoadmap[]` | Always populated by the engine (falls back to a generic phase list). |

No other deliverable tab (Business Assessment, Blueprint, Architecture,
Process Book, PRD, Roadmap, Build Brief, Implementation Plan, Backlog,
Proposal, Exports) was restructured — those are structured documents, not
recommendation narratives, and are out of this mission's stated scope
("recommendation presentations… report pages… deliverables narrative
sections **if they surface recommendations**").

### 3. `ReportView` — Living Report

`components/report/report-view.tsx`. The report is a longer document, not a
single recommendation card, so it did not get the full numbered spine.
Instead it got page-level storytelling per the mission's "clear hierarchy, one
idea flow" goal:

- `Section` gained an optional `intro` prop — a one-sentence connective lead-in
  under the section kicker. Used on **Executive Summary**, **Pain Points**,
  **Recommendations**, and **Executive Conclusion** to make the report read as
  one throughline (situation → findings → recommendation → decision) instead
  of a flat stack of headings.
- **Recommendations** list items now show the existing `priority` field
  (`now`/`next`/`later`) as a pill next to the title, and an honest empty
  state when `report.opportunities` is empty (previously unhandled).
- **Pain Points** got the same honest-empty treatment.
- No new fields were added to `DiscoveryReport` or `domain/report.ts`. The
  `Recommendation` type surfaced in the report (`title` + `rationale` +
  `priority`) does not carry structured evidence/confidence/ROI the way
  `ExplainedRecommendation` does — those beats (3, 6) are intentionally **not**
  attempted here; see Gaps below.

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
   `Section`/`List` layout from before this mission. They are structured
   documents rather than recommendation narratives, so a 7-beat story spine
   would force-fit data that doesn't map cleanly (e.g. a PRD's "Acceptance
   Criteria" isn't a "Business impact"). Left untouched per "extend before
   replace."

## Language note (coordination)

This app currently mixes languages by surface: the workspace cockpit,
recommendation cards, and dashboard are Spanish (Mission 14 established this);
`ReportView` and `DeliverablesPanel` are English. This mission did **not**
convert either surface's base language — it only added Spanish connective
copy where the surface was already Spanish, and English connective copy
where the surface was already English. A global Spanish-localization pass
across `ReportView`/`DeliverablesPanel` is a separate, larger effort and
should be coordinated explicitly to avoid clobbering in-flight work (this
mission observed a concurrent agent actively editing
`components/report/report-view.tsx` and `components/workspace/workspace-view.tsx`
for an unrelated white-label branding feature while this pass was in
progress — no conflicting lines were touched, but it's worth flagging for
whoever merges next).

## What was intentionally NOT built

- No new recommendation/report/deliverables generation logic.
- No new narrative facts, scores, or evidence — every beat renders a field
  that already existed on the relevant engine output.
- No `@isalwa/ui` import (not a dependency of this app) and no new parallel
  card/panel system — extended the existing `ExplainedRecommendationCard`,
  `Section` (report), and `Article`/`Beat` (deliverables) in place.
- No changes to the "Problem/Recommendation/Impact/Confidence/Why" style card
  fields some other mission might add — no such fields existed in this app at
  the time of this pass (verified before starting).

## Definition of done

- [x] Story-structured recommendation card (`ExplainedRecommendationCard`) —
      used everywhere recommendations render.
- [x] Story-structured deliverables Executive Summary tab.
- [x] Page-level storytelling hierarchy in the Living Report (`ReportView`).
- [x] `EXECUTIVE_STORYTELLING.md`.
- [x] Lint passes clean on every file this mission touched.
- [x] Typecheck passes on every file this mission touched (see note below —
      the repo-wide typecheck currently fails on unrelated, concurrently
      in-progress white-label branding work in `lib/brand/`,
      `components/workspace/brand-settings-panel.tsx`, and
      `components/workspace/workspace-view.tsx`; confirmed via `git stash`
      that these failures pre-exist this mission's changes).
