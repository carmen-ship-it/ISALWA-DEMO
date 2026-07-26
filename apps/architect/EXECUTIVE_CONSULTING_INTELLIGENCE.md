# Mission 3 — Executive Consulting Intelligence ("The Wow Layer")

Status: shipped. Deterministic. No LLM. No chat. No invented evidence.

## What this is

A new **"Perspectivas ejecutivas"** area inside the workspace that reads across
every engine already in the app — Memory, Knowledge, History, Readiness,
Blueprint, Solution, Consulting Intelligence, and intake evidence — and turns
what's *already known* into a short, McKinsey-style executive briefing.

It does not add a new scoring model, a new risk detector, or a new interview
flow. Every sentence traces back to a concrete fact, risk, opportunity,
pattern, snapshot, or document already sitting on the workspace. When there
isn't enough evidence for a section, it renders an honest empty state instead
of filler copy.

## Where it lives

```
apps/architect/lib/insights/
  types.ts                 — all contracts for the 9 sections + aggregate
  shared.ts                — evidence assembly helpers (no scoring)
  business-dna.ts          — 1. Business DNA
  blind-spots.ts           — 2. Business Blind Spots
  who-next.ts              — 3. Who Should We Talk To Next
  surprises.ts             — 4. Three Things That Surprised Us
  institutional-memory.ts  — 5. Institutional Memory
  business-evolution.ts    — 6. Business Evolution
  future-readiness.ts      — 7. Future Readiness
  knowledge-concentration.ts — 8. Knowledge Concentration
  intelligence-timeline.ts — 9. "We Learned" timeline
  index.ts                 — deriveExecutiveInsights() aggregator

apps/architect/components/workspace/executive/executive-insights-panel.tsx
  — premium executive cards, progressive disclosure, Spanish copy

apps/architect/components/workspace/workspace-tabs.tsx
  — new "insights" tab ("Perspectivas ejecutivas"), client-visible

apps/architect/components/workspace/workspace-view.tsx
  — wires deriveExecutiveInsights(workspace) into the new tab panel
```

## The 9 sections and their derivation source

| # | Section | Reuses | Never |
|---|---------|--------|-------|
| 1 | Business DNA (velocidad de decisión, cultura de aprobación, cultura documental, disciplina operativa, cultura de automatización, etapa de crecimiento, adopción tecnológica) | `ConsultingIntelligence.maturity` + `.risks` (`lib/consulting`) | Scores nothing new — only narrates existing dimension scores/evidence and risk patterns |
| 2 | Business Blind Spots | `ConsultingIntelligence.contradictions` + `.patterns`, plus an evidence-asymmetry check across `.maturity.dimensions` | Never framed as a risk or a to-do — framed as an awareness gap |
| 3 | Who Should We Talk To Next | `starvedDimensions()` (`lib/consulting/questions`, Mission 10's info-gain ranking) + `CompanyModel` / `workspace.people` for the name lookup | Never invents a name — falls back to a role hint when nobody is on record |
| 4 | Three Things That Surprised Us | Top `ConsultingRisk`, top `ConsultingOpportunity` (Quick Win), a confirmed `Hypothesis` | No new "surprise" detector — just a sharper narrative lens on the same evidence |
| 5 | Institutional Memory | `lib/explanations` (Mission 14, `explainWorkspaceRecommendations`) for "why we believe", plus `workspace.timeline` / `workspace.meetings` / `lib/knowledge` evidence log for the Interview → Document → Meeting → Evidence → Recommendation chain | No new justification logic |
| 6 | Business Evolution | `lib/history` (Mission 15's append-only snapshots/milestones/timeline) | No recomputation of snapshots — pure re-presentation |
| 7 | Future Readiness | `ConsultingRisk` patterns projected forward via a static struggle-by-pattern map | Only patterns already detected by the real risk engine get a prediction |
| 8 | Knowledge Concentration | `CompanyModel` departments/people (Mission 12's Digital Twin), falling back to `workspace.people` | No new person↔knowledge mapping — a concentration lens over the existing graph |
| 9 | Business Intelligence Timeline ("We Learned") | `workspace.timeline` + `lib/history` evolutionary timeline | Reframed copy only, same events |

`ExecutiveInsights.isEarlyStage` gates the whole area behind a minimum
evidence bar (`hasMinimumEvidence` in `shared.ts`) so a brand-new workspace
gets one honest message instead of nine empty cards.

## A correctness detail worth knowing

`evaluateMaturity` (`lib/consulting/maturity.ts`) always fills a dimension's
`evidence` array with a canned fallback string ("Limited direct evidence for
…") when it found nothing real. Early in testing, Business DNA and Blind
Spots treated that fallback as "real evidence" and produced a confidently
wrong positive claim (e.g. claiming strong documentation culture from a
placeholder string, immediately after a client said the opposite in plain
language). Fixed with `realDimensionEvidence()` in `shared.ts`, which strips
the placeholder before any section is allowed to treat a dimension as
"covered." Verified with a scripted end-to-end run through the real
`think()` / `evaluateConsultingIntelligence()` engines before and after the
fix — see git history for the before/after output.

## Client Mode

`insights` is in `CLIENT_VISIBLE_TAB_IDS` — Álvaro sees the same polished
"Perspectivas ejecutivas" area consultants see. No consultant-only reasoning
internals are exposed there; the panel only ever renders the same executive
vocabulary (Observación, Hallazgo de negocio, Evidencia, Recomendación,
Comprensión del negocio) used elsewhere in the client experience.

## Executive language

Client-facing copy avoids "IA / modelo / motor de razonamiento / vector /
embedding / puntaje de confianza." Where a strength or confidence needs to be
shown, it uses the same words already used elsewhere in the app: "confianza"
bands (alta/media/baja/emergente), consistent with
`lib/presentation/executive-language.ts` and `lib/explanations/confidence.ts`.

## Known gaps (not fixed — out of scope for this mission)

- Several underlying `ConsultingRisk` / `ConsultingRecommendation` strings
  (`businessImpact`, `recommendedMitigation`, opportunity `estimatedImpact`)
  are authored in English inside `lib/consulting`. This mission does not
  rewrite the Consulting Engine, so those strings surface as-is inside
  Institutional Memory and Future Readiness, exactly as they already do in
  the pre-existing Explained Recommendation cards. A future mission should
  localize those strings at the source.
- Knowledge Concentration and Who Should We Talk To Next are strongest once
  a `CompanyModel` (Mission 12) exists; before that they fall back to the
  thinner `workspace.people` list, which is honest but less specific.
- `formatTimelineDate` (reused from `lib/timeline`) renders relative dates in
  English ("Today", "3 days ago") — a pre-existing gap in the shared helper,
  not introduced by this mission.

## Verification performed

- `npm run typecheck` — clean.
- `npm run build` — clean (only pre-existing unrelated warnings).
- `npx eslint` on all new/changed files — clean.
- Scripted end-to-end smoke test: seeded workspace + a fully empty workspace
  (no crashes, correct honest-empty behavior) and a synthetic rich workspace
  driven through the real `think()` interview engine with realistic Spanish
  answers (Excel dependency, WhatsApp approvals, no documentation, month-end
  reporting) — confirmed every section renders truthful, evidence-linked
  Spanish output and caught the fallback-evidence bug described above.
