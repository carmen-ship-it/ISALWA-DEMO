# Evidence-Adaptive Reports

The living report (`/report`) used to read as a static template — every
section rendered every time, whether or not the discovery had anything real
to say about it. This mission makes the report **adapt to the evidence
actually collected for that company**, reusing the Consultant Readiness
Engine (`lib/readiness`) that already answers "does ISALWA know enough to
advise this company with confidence?" everywhere else in the app.

No new scoring, no new confidence model, no invented copy. Every adaptive
decision below reads an existing signal (readiness state, consulting risk
detections, evidence-backed content) and only changes **whether a section
renders**, never what the underlying data says.

## What changed, and why

| Rule | Where | How it's decided |
|---|---|---|
| Celebrate when confidence is high | New "Nivel de confianza" section, right after the executive summary | `assessReadiness(workspace)` / `assessMemoryReadiness(memory)` → `overallState === "ready"` renders in the green tone with the Readiness Engine's own "Ya podemos recomendar con seguridad" language |
| Explain why when confidence is low | Same section | `almost_ready` / `needs_information` render in amber/red with `assessment.advice.headline` + `.detail` — the concrete reason, not a vague disclaimer |
| Say exactly what evidence is missing | Same section | Reuses `StillLearningList` (already built for the workspace Readiness panel) to list the concrete open gaps, verbatim — no duplicate "missing evidence" logic |
| Hide finance recommendations with no finance evidence | Recommendations section | If the `finance` readiness topic is applicable and still `needs_information`, recommendations are filtered out when their title/rationale match the same finance keyword pattern the Readiness Engine itself uses (`TOPIC_PATTERNS.finance`, now exported from `lib/readiness`) |
| Hide the risk section when there are no risks | Bottom "Risks" section | Gated on `report.consultingRisks.length > 0` — the deterministic, evidence-driven risk-pattern engine (`lib/consulting/risk.ts`), not the two generic caution lines the report always used to include. Those two generic lines are filtered out of the risk list even when real risks exist, so every remaining line is company-specific |
| Hide the implementation plan when there isn't one yet | Implementation Plan section | Reuses `blueprintReadinessGate(assessment)` — the same gate the Business Blueprint already uses. Hidden only when the gate is **not unlocked** (`needs_information` on a critical topic); shown once the plan can be presented as a real recommendation, matching Blueprint behavior 1:1 |
| Never render empty section shells | Current Systems, Pain Points, Recommendations | These sections used to show a "nothing here yet" placeholder sentence. They now don't render at all when there is nothing to show — no empty card, no placeholder copy |
| Executive summary deliverable never dumps empty sections | `lib/deliverables/executive-summary.ts` → `DeliverablesPanel` executive tab | The builder used to backfill empty `problems` / `biggestRisks` / opportunity lists with placeholder Spanish sentences ("Perfil de riesgo incompleto", etc.). It now leaves them genuinely empty; the existing `BeatList` component already renders a single honest "Aún no disponible." line instead of fabricated copy |

## What stayed the same (already adaptive, unchanged)

- "Risk patterns" (`consultingRisks`), "Points to clarify"
  (`consultingContradictions`) and "Opportunity horizons"
  (`consultingOpportunities`) were already conditionally rendered before
  this mission — no changes needed.
- `DiscoveryReport` itself, `synthesizeReport`, and the consulting engines
  (`lib/consulting/*`) are untouched. This mission is presentation-only:
  it decides what to show, never what the evidence says.

## Data flow

```
CompanyWorkspace ──assessReadiness──┐
Interview.memory ──assessMemoryReadiness──┴──▶ ReadinessAssessment ──▶ ReportView ──▶ ReportBody
                                                        │
                                                        ├─▶ overallState        → confidence tone + copy
                                                        ├─▶ stillLearning        → "what's missing" list
                                                        ├─▶ topics["finance"]    → hide finance recommendations
                                                        └─▶ blueprintReadinessGate → hide/show implementation plan
```

`ReportView` computes a `ReadinessAssessment` alongside the `DiscoveryReport`
it already loads — from the full workspace when opened with a
`workspaceId`, or from the interview's working memory in the standalone
fallback path. `ReportBody` receives both and does the adaptive rendering;
no new state, storage, or API calls were introduced.

## Files changed

- `components/report/report-view.tsx` — adaptive rendering: confidence
  section, finance-recommendation filter, risk/implementation gating,
  removal of empty-shell placeholders.
- `lib/readiness/index.ts` — exports `TOPIC_PATTERNS` so the report can
  reuse the same finance-topic keyword matching the Readiness Engine
  already uses internally, instead of duplicating it.
- `lib/deliverables/executive-summary.ts` — stop backfilling empty
  problem/risk/opportunity lists with placeholder copy; let genuine
  emptiness flow through to the already-existing `BeatList` empty state.
- `lib/i18n/messages/en.ts`, `lib/i18n/messages/es.ts` — two new
  `reportView` keys (`confidenceTitle`, `whatIsMissing`) for the new
  section, in both locales.

## Constraints honored

- **Never invent facts** — every adaptive decision reads an existing
  engine's output; no new heuristics score anything.
- **Reuse before creating** — the confidence section reuses
  `ReadinessStateDot` and `StillLearningList` from the workspace Readiness
  panel and `blueprintReadinessGate` from the Blueprint gate, instead of
  building parallel components.
- **Spanish via i18n** — the two new UI strings are added through
  `useTranslations()` in both `en.ts` and `es.ts`; all other copy on the
  new section is Readiness Engine output, which is already Spanish
  client-facing language by design.
- **Typecheck passes** — `npm run typecheck` and `npm run lint` are clean
  (only pre-existing, unrelated warnings remain).
