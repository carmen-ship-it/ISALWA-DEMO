# Missing Information Engine

**Status:** Complete
**App:** `apps/architect`
**Module:** `lib/readiness/missing-information.ts` (extends the Consultant
Readiness Engine — no parallel gap engine, no second scoring model)
**Extends:** Evidence Snapshot (`snapshot.ts`), Readiness evaluation
(`evaluate.ts`), the Discovery Score's evidence-key math
(`computeDiscoveryScore`, `EVIDENCE_FACT_INCREMENT`), the topic vocabulary
(`topics.ts`)

## What it is

The Readiness Engine already answers *where do we stand, per business
topic*. The Missing Information Engine asks the sharper question a senior
consultant asks next:

> **De todo lo que no sabemos, ¿qué nos ayudaría más ahora mismo?**

It is detective work, not a checklist. The same gaps `evaluate.ts` already
produces get re-ranked by **estimated business impact** and paired with a
**concrete next upload** whenever a document can plausibly close the gap:

> "+9% de confianza en finanzas si subes la política de aprobación de
> compras."

Two areas of a business rarely look the same. One might be well understood
from the interview (Sales); another might have almost no evidence at all
(HR). The engine says so directly and names the document that would close
the biggest gap first — never a generic "upload more documents" nudge.

## Architecture

```
EvidenceSnapshot ──┐
                    ├──▶ buildMissingInformationReport(snapshot, assessment)
ReadinessAssessment┘         │
                              ├─ rankMissingInformation   → opportunities, ranked
                              └─ buildHeadline             → detective summary
```

Nothing here recomputes coverage, confidence or topic state — it reads the
`EvidenceSnapshot` and `ReadinessAssessment` the rest of `lib/readiness/`
already produced and re-ranks the same gaps `evaluate.ts` already
identified (`missingEvidenceKeys`, `MISSING_INFORMATION_LABELS`). Same
boundary, same evidence, different lens.

### The confidence-lift estimate — an honest heuristic, not a model output

`computeDiscoveryScore` already gives one known evidence key a fixed
`EVIDENCE_FACT_INCREMENT` (34 points) toward its dimension's confidence,
capped at 100, and averages every applicable dimension's confidence into the
published Business Understanding number. The Missing Information Engine
reuses that *exact* arithmetic instead of inventing a second one:

```
headroom       = 100 − current dimension confidence
perEvidenceGain = min(EVIDENCE_FACT_INCREMENT, headroom)   // capped by real headroom
estimatedLift   = round(perEvidenceGain / applicableDimensionCount)
```

This is "what one more piece of solid evidence for this topic would be
worth to the published understanding number, today" — traceable to the same
math a client can already see move on the Dashboard. Both constants
(`EVIDENCE_FACT_INCREMENT` in `lib/reasoning/confidence/score.ts`,
`READY_CONFIDENCE`/`THIN_CONFIDENCE` in `evaluate.ts`) were exported rather
than duplicated, so this file can never drift from the score it is
describing.

Three deliberate honesty constraints:

1. **Capped by real headroom.** A dimension near 100 has little left to
   gain, and the estimate says so — it never promises a flat number
   regardless of how much is already known.
2. **No lift, no listing.** A topic that is already `ready`, or whose only
   remaining gaps are bookkeeping keys (`fact_*`, `evidence_*` — not
   something a client can answer), produces no opportunity at all. It is
   never padded to fill a list.
3. **Every figure is labeled "estimated impact, not guaranteed"** wherever
   it is shown to the client (`missingInformationPanel.estimatedImpact`).
   No confidence figure, band name or model vocabulary crosses the boundary
   beyond that single honest caveat — same rule the Readiness Engine already
   enforces.

### What to upload — wired to the real coverage areas

A gap only gets a **concrete upload suggestion** when a document can
plausibly close it today: the topic must map onto a real Knowledge coverage
area (`Customers`, `Sales`, `Operations`, `Finance`, `HR` via
`DIMENSION_TO_AREA` — the same mapping `evaluate.ts` already uses for
document-vs-interview consistency). `geography`, `production` and `systems`
have no coverage-area collector yet, so their gaps are asked in the next
conversation instead of pointed at a non-existent upload channel — no fake
wiring.

`MISSING_INFORMATION_UPLOAD_HINTS` (`topics.ts`) is the vocabulary: each
answerable evidence key (the same keys `MISSING_INFORMATION_LABELS` already
names) maps to a concrete document a consultant would ask for — "el
organigrama del equipo", "la política de aprobación de compras", "el modelo
de precios", "los SOPs del área operativa" — never "sube un documento".

### Ranking

Every applicable, non-`ready` topic with at least one answerable gap and a
positive estimated lift becomes one `MissingInformationOpportunity`, sorted
by `estimatedLiftPercent` descending, capped at the top 5. One opportunity
per topic (not per gap key) — a client sees "close HR" once, with up to two
concrete gaps and upload suggestions, not five near-duplicate rows for the
same area.

### The detective headline

`buildHeadline` compares the highest- and lowest-confidence *applicable*
topics (never a topic marked not-applicable for this industry) and says so
in plain language: *"Entendemos bien ventas — casi no sabemos nada de
equipo."* Reuses the same `READY_CONFIDENCE` / `THIN_CONFIDENCE` bands
`evaluate.ts` already thresholds on, so the words here can never disagree
with the 🟢/🟡/🔴 state shown elsewhere.

## API

```ts
import {
  assessMissingInformation,      // (workspace) → MissingInformationReport — entry point
  buildMissingInformationReport, // (snapshot, assessment) → report — composition
  rankMissingInformation,        // (snapshot, assessment) → opportunities only
} from "@/lib/readiness";
```

`MissingInformationReport`:

| Field | What it is |
| --- | --- |
| `opportunities` | Ranked list, highest estimated impact first (≤5) |
| `strongestTopic` / `weakestTopic` | The best- and least-understood applicable topics |
| `headline` | Detective-register summary sentence |
| `totalEstimatedLiftPercent` | Sum of listed opportunities — a ceiling, not a promise |

`MissingInformationOpportunity`: `topic`, `topicLabel`, `gaps` (concrete,
client-language), `uploadSuggestions` (concrete document asks, empty when
not uploadable), `uploadable`, `estimatedLiftPercent`, `rationale` (reuses
`TOPIC_STAKES`), `headline` (the "+X% si subes…" sentence).

## UX surfaces

| # | Surface | What it shows |
| --- | --- | --- |
| 1 | **Dashboard, section 3 "Qué seguimos aprendiendo"** | `MissingInformationList` under `StillLearningList` — same gaps, ranked by impact, each with a "+X%" badge and an "Subir documento" action that jumps to the Knowledge tab |
| 2 | **Knowledge upload empty state (`BusinessKnowledge`)** | `NextUploadCta` — the single highest-impact opportunity as a compact banner above the upload widget, scrolling to it on click |

Both surfaces render `lib/readiness/missing-information.ts` output verbatim
— no component computes or re-derives a number.

`components/workspace/executive/readiness-panel.tsx` (the Readiness
Engine's existing client-surfaces file) gained the two components above
rather than a new file, since they are the same engine's UI, one lens over.

## Language rules

Spanish, consulting register — same convention the Readiness Engine already
follows: the engine's own generated content (headlines, gaps, upload
suggestions, the detective summary) is Spanish text produced inside
`lib/readiness/`, not routed through i18n, because it is *always* Spanish
regardless of locale (the engine owns the words, the same way
`evaluate.ts`'s narrative and headlines already do). Only the **UI chrome**
around it — section kickers, button labels, the "estimated impact, not
guaranteed" caveat — goes through `useTranslations()` /
`missingInformationPanel.*` in `lib/i18n/messages/{es,en}.ts`, matching every
other panel in this codebase.

- ✅ "+9% de confianza en finanzas si subes la política de aprobación de compras."
- ✅ "Entendemos bien ventas — casi no sabemos nada de equipo."
- ❌ "Confidence: 62%" · "score improved by 9 points" · "model estimate"

## Deliberately out of scope (this mission)

- No new scoring model — every number is `EVIDENCE_FACT_INCREMENT` and the
  applicable-dimension average `computeDiscoveryScore` already publishes.
- No document-category taxonomy, no upload form changes — suggestions are
  descriptive text pointing at the existing generic upload widget
  (`KnowledgeUpload`), not a new required-category picker.
- No explainable-confidence UI, no report storytelling — reserved for a
  later mission.
- No change to readiness states, gates, the planner or the conclusion
  threshold.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` — production build succeeds; the two pre-existing lint
  warnings (`lib/consulting/questions/index.ts`,
  `lib/knowledge/seed.ts`) are unrelated to this mission and unchanged.
- Traced an empty workspace (headline compares two zero-confidence topics
  without dividing by zero or crashing), a partially-seeded workspace
  (opportunities ranked, upload suggestions present for area-mapped topics,
  absent for `geography`/`production`/`systems`), and a fully `ready`
  workspace (`opportunities` empty, `emptyReady` copy shown, no forced
  padding).

## Files changed

- `lib/readiness/missing-information.ts` — new; the engine
- `lib/readiness/topics.ts` — added `MISSING_INFORMATION_UPLOAD_HINTS` +
  `missingInformationUploadHint()`
- `lib/readiness/evaluate.ts` — exported `READY_CONFIDENCE` /
  `THIN_CONFIDENCE` (values unchanged)
- `lib/readiness/index.ts` — exported the new module's public API
- `lib/reasoning/confidence/score.ts` — named and exported the existing `34`
  magic number as `EVIDENCE_FACT_INCREMENT` (value unchanged)
- `components/workspace/executive/readiness-panel.tsx` — added
  `MissingInformationList`, `NextUploadCta`
- `components/workspace/executive/executive-dashboard.tsx` — renders
  `MissingInformationList` in section 3
- `components/workspace/workspace-view.tsx` — computes
  `assessMissingInformation(workspace)`, wires it and an upload-tab callback
  into `ExecutiveDashboard`
- `components/workspace/business-knowledge.tsx` — renders `NextUploadCta`
  above the upload widget, scrolls to it on click
- `lib/i18n/messages/es.ts`, `lib/i18n/messages/en.ts` — added
  `missingInformationPanel.*` UI chrome strings
