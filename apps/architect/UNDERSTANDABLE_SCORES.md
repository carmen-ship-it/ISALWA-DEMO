# Mission 11 — Make Every Score Understandable

Goal: every score, percentage or health indicator Álvaro (or Carmen) sees
answers "what exactly am I looking at?" — no bare, unexplained numbers in the
client walkthrough. This document records what was audited, what was already
compliant from Mission 10, what was fixed, and one real display-scale bug
found and corrected along the way.

## Audit method

Walked every client-visible surface end to end: the persistent context bar,
the live guided interview (`/discovery` — accessible to both roles, not
behind `CONSULTANT_ONLY_PATHS`), and every `CLIENT_VISIBLE_TAB_IDS` tab
(Resumen, Cómo funciona su empresa, Su empresa, Conocimiento, Perspectivas,
Recomendaciones, ¿Qué pasa si…?, Plan de implementación, Documentos), plus the
printable `/report` page. Consultant-only surfaces (Diagnóstico tab internals,
`/preparation`, Marca blanca) were checked opportunistically but are lower
priority per Mission 10's own scoping.

## Already compliant (Mission 9/10 groundwork — no changes needed)

A lot of the surface area already followed the "title + qualitative label"
pattern before this mission:

- `ConfidenceMeter`, `DiscoveryScoreCard` overall score, `WelcomeBanner`,
  `CompanyModelPanel`, `BusinessKnowledge` coverage bars, `DeliverablesPanel`
  assessment tab, `ExplainedRecommendationCard`, `ExecutiveSimulatorPanel` —
  all already pair every percentage with a title, a plain-language band label
  (`understandingLevel`, `strengthBandLabelEs`, `coverageBandLabelEs`,
  `confidenceBandLabelEs`), or a full explanatory sentence.

## Fixed: bare percentages / bare numbers with no interpretation

| Surface | Before | After |
| --- | --- | --- |
| Guided interview — `StageBrief` (sidebar during every question) | `Comprensión del negocio · 42%` | `Comprensión del negocio · 42% · en progreso` |
| Guided interview — `FinishPanel` (session-complete screen) | `Comprensión del negocio` tile showed only `42%` | Adds the level word under the number plus a full `understandingSentence()` line explaining what it means |
| `DiscoveryScoreCard` per-topic confidence list | Unlabeled list of `Tema 72%` rows | Added a "Confianza por tema" caption above the list |
| Executive Dashboard — "Indicadores de salud" gauges | Raw `0–100` number under just the dimension name (no word at all) | New `healthStatusLabel()` → **Saludable / Requiere atención / Crítico** per gauge, plus a one-line hint under the section title |
| Executive Dashboard — "Salud por departamento" | Numbers + band label, no explanation of what's being measured | Added a one-line hint under the section title |
| `CompanyEvolutionPanel` (consultant) | `Madurez` stat was a bare raw number with no `%`, no word, nothing | Now `maturityLabel()` (Madura / En desarrollo / Fundacional / Emergente); `Comprensión` stat gained its level word |
| `PreparationBriefPanel` (consultant) | `Comprensión previa: 55%` / `Cobertura de información: 60%` chips, no interpretation | Both chips now include the level/coverage-band word |
| `/report` — "Evaluación consultiva" (`domain/report.ts`) | `Madurez — Ventas 72% · Operaciones 45%` and `Salud del negocio — Comercial 68%` (dimension name + bare %) | `Madurez — Ventas: en desarrollo · Operaciones: fundacional` / `Salud del negocio — Comercial: saludable · …` |
| Context bar (`ContextBar`, always visible) | Already had `24% · inicial` (Mission 10) | Added a hover tooltip explaining what "Comprensión" means, for extra clarity |

## Fixed: real display-scale bug (health/maturity labels always wrong)

While auditing, found that `healthLabel()` and `maturityLabel()` in
`lib/presentation/executive-language.ts` always called `strengthBand(score,
"unit")` — i.e. they assumed a `0–1` input and multiplied by 100 internally.
But `consulting.health.overall`, `consulting.maturity.overall`, and every
per-dimension gauge/maturity score in the engines are **already `0–100`**
(clamped in `lib/consulting/health.ts` / `lib/consulting/maturity.ts`).

Effect: any real score (e.g. `45`) was read as `45 → ×100 → 4500%`, clamped to
`100`, which always landed in the top "High" band. In practice this meant
**"Madurez operativa" and "Salud del negocio" showed as fully mature /
healthy for every workspace, regardless of the real score** — the same class
of percent-scale doubling bug fixed in Mission 10
(`executive-summary.ts`, `explanations/confidence.ts`,
`simulation/signals.ts`), just in two label helpers that were missed.

Fix (display-scale only, no scoring formula touched): both helpers now take
an explicit `scale: "unit" | "percent"` parameter (mirroring the existing
`strengthBand` / `strengthBandLabelEs` pattern), defaulting to `"unit"` so the
one caller that legitimately passes a `0–1` fraction
(`business-processes-panel.tsx` → `metrics.processHealth`) is unaffected.
Every caller passing a `0–100` score now explicitly passes `"percent"`:

- `components/workspace/deliverables-panel.tsx` (`maturityLabel`, `healthLabel`)
- `components/workspace/executive/executive-dashboard.tsx` (`maturityLabel`)
- `lib/executive/cockpit.ts` → `deriveBusinessHealth` (`healthLabel`)
- `lib/executive/daily-summary.ts` (`healthLabel`)
- `components/workspace/company-evolution-panel.tsx` (`maturityLabel`)
- `domain/report.ts` (new `maturityLabel` / `healthStatusLabel` usage, see below)

## New presentation helper: `healthStatusLabel()`

Mission 11 asks for a canonical 3-tier health vocabulary — **Saludable /
Requiere atención / Crítico** — for standalone health gauges that had no
qualitative word at all (the cockpit's "Indicadores de salud" and the
`/report` health line). Added `healthStatusLabel(score, scale)` in
`lib/presentation/executive-language.ts`, built on the **same** `strengthBand`
thresholds already used everywhere else (75 / 45 / 20) — no new health engine,
no new scoring, purely a coarser label for the two spots that had zero
explanation before. The existing 4-band `healthLabel()` / `maturityLabel()`
wording used elsewhere (Estable con brechas / Bajo presión / En desarrollo /
Fundacional…) was left as-is — it already satisfies "not a bare number" and
rewriting already-shipped, already-tested copy across every surface was out
of scope for a small, reviewable PR.

## Deliberately left alone

- Percentages embedded in full explanatory sentences (e.g. "Umbral de
  comprensión: 60% · actual 45%", "Nivel de comprensión del negocio en el
  diagnóstico: 45%.", "Confianza Alta · 72%") — these already state what is
  being measured immediately next to the number, so they're not "bare".
- CSS width-only percentages driving progress bars (`style={{ width:
  "${x}%" }}`) — not displayed text.
- UI zoom-level percentage in the process diagram canvas
  (`business-processes-panel.tsx`) — a viewport control, not a business score.
- `strengthBand()` raw English band literals inside `brand-experience-panel.tsx`
  (consultant-only "Marca y experiencia" section) — a translation-completeness
  gap, not a percentage/score-understandability gap; out of scope for this
  mission.

## Verification

- `npx tsc --noEmit` — clean.
- `npx eslint .` — same 6 pre-existing warnings as Mission 10, in files this
  mission did not touch (`discovery-journey.tsx`,
  `lib/consulting/questions/index.ts`).
- Manual trace of the guided interview (`/discovery`) end to end, every
  client-visible workspace tab, and `/report` — no remaining bare/unexplained
  percentage or raw health-style number found.
