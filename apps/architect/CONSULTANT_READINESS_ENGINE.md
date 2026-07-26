# Mission 14 — Consultant Readiness Engine

**Status:** Complete
**App:** `apps/architect`
**Module:** `lib/readiness/` (extended — Mission 2 created the thin
evidence→memory bridge; this mission grows it into the platform brain)
**Extends:** Reasoning (`computeDiscoveryScore`), Knowledge Engine (coverage,
contradictions), Intake (evidence log, business rules), Company Memory,
Company Evolution history, Explanations, Blueprint, the Mission 10 question
planner, the Mission 11 score vocabulary and the Mission 13 dashboard order.

## What it is

The Readiness Engine is not a chatbot, not "Ask AI", and not another score.
It is the single intelligence layer that answers one question, everywhere the
product needs it asked:

> **¿Sabemos lo suficiente para aconsejar a esta empresa con confianza?**

And when the answer is *no*, it says exactly what is missing, in the words a
senior consultant would use in the room:

> "Necesitamos entender cómo se aprueban las compras y quién autoriza."

**AI owns the uncertainty; the client only ever sees guidance.** No confidence
figure, no band name, no model vocabulary, no internal score crosses the
boundary of this module. That rule is enforced by construction: readiness
never produces a number, it only reads numbers other engines already
published and turns them into consulting language.

## The three states

Topics are the **discovery dimensions the platform already reasons about**
(`sales`, `customers`, `geography`, `team`, `operations`, `finance`,
`production`, `systems`). No parallel taxonomy was introduced.

| State | Client label | Meaning | Interview action |
| --- | --- | --- | --- |
| 🟢 `ready` | **Listo** | Enough evidence to recommend | `skip` |
| 🟡 `almost_ready` | **Casi listo** | A few clarifications away, with an estimate in minutes | `confirm` |
| 🔴 `needs_information` | **Necesitamos más información** | Concrete missing information, named | `ask` |

A 🔴 topic never says "low confidence". It says
`Necesitamos entender ${gap}` where the gap comes from
`MISSING_INFORMATION_LABELS` — a table keyed by the *same* evidence fact keys
`computeDiscoveryScore` counts (`DIMENSION_EVIDENCE_KEYS`), so what we ask for
can never drift away from what the score actually measured.

A topic marked not applicable (e.g. `production` in a services company) is
treated as ready and explained as such: *"Producción no aplica en este negocio
— no hace falta preguntarlo."*

## Architecture

```
                    ┌──────────────────────────────────────────┐
  Memory ─────────▶ │                                          │
  Knowledge ──────▶ │   EvidenceSnapshot   (snapshot.ts)       │  ← the boundary
  Intake log ─────▶ │   normalize · never compute              │
  Business rules ─▶ │                                          │
  History ────────▶ └──────────────────┬───────────────────────┘
  (future: uploads,                    │
   e-mail, CRM/ERP)                    ▼
                    ┌──────────────────────────────────────────┐
                    │   evaluateReadiness  (evaluate.ts)       │
                    │   states · consistency · narrative       │
                    │   still-learning · ask vs. stop          │
                    └───┬──────────────┬───────────────┬───────┘
                        │              │               │
              planner.ts│      gate.ts │      memory.ts│
              interview │   blueprint  │   evidence →  │
               filters  │   + evidence │  working mem. │
                        │  transparency│               │
```

### `snapshot.ts` — the EvidenceSnapshot boundary

Every source crosses one line before the engine reasons about it. Collectors
**copy, they never compute**: `strength` is always the figure the originating
engine already produced (fact confidence, asset confidence, coverage percent).

Today's collectors:

| Collector | Source | Signal kind |
| --- | --- | --- |
| `collectInterviewSignals` | `memory.knownFacts` | `interview` |
| `collectDocumentSignals` | `knowledge.assets` (processed only) | `document` |
| `collectImportedSignals` | `knowledge.evidenceLog` (Intake ledger) | `imported_record` |
| `collectBusinessRuleSignals` | `knowledge.businessRules` | `business_rule` |
| `collectConflicts` | `memory.contradictions`, `memory.consulting.contradictions`, `knowledge.contradictions` | — |
| `collectMissingEvidenceKeys` | `DIMENSION_EVIDENCE_KEYS` minus what memory knows | — |

Plus the counts a client understands (`EvidenceInventory`: interviews,
documents, imported records, meetings, business rules, revisions) and the
Discovery Score dimensions and Knowledge coverage slices, passed through
**verbatim**.

Two entry points: `snapshotFromWorkspace` (every client screen) and
`snapshotFromMemory` (a live interview, where only working memory exists).

### `evaluate.ts` — the judgement

Reads one snapshot and answers, per topic:

- **¿Hay evidencia suficiente?** — dimension coverage/confidence, already scored.
- **¿Las fuentes coinciden?** — document coverage vs. interview confidence.
- **¿Hay algo que aclarar?** — contradictions already detected elsewhere.
- **¿Preguntamos o ya podemos opinar?** — `advice.action`: `ask` | `stop`.

There is **no scoring model in this file**. It thresholds numbers other
engines produced (`READY_CONFIDENCE`, `THIN_CONFIDENCE`, `MIN_COVERAGE`,
`CORROBORATING_COVERAGE`) and turns the result into language. A firm topic
with an open disagreement is deliberately *not* ready — it is one conversation
away from ready.

Consistency is reported as `confirmada` (documents back up the interview),
`por_confirmar`, or `con_diferencias` — a soft flag, never an accusation.

It also produces:

- **`narrative`** — the Business Understanding paragraph, opening with the
  shared Mission 11 `understandingSentence` so the words on the dashboard and
  the words in the score can never disagree.
- **`stillLearning`** — the open questions ordered the way a consultant would
  raise them: clarifications before unknowns, and **interleaved across
  topics** so one weak area never floods the list ahead of an area we know
  nothing about.
- **`advice`** — ask or stop, with a `nextStep`. If any clarification is still
  open, the advice says so even when everything else is ready, rather than
  claiming false certainty.
- **`totalEstimatedMinutes`** — clarifications × `MINUTES_PER_CLARIFICATION`.

### `planner.ts` — the adaptive interview filter

The Mission 10 planner already ranks candidates by information gain. Readiness
adds the judgement a senior consultant brings to the same list: **don't ask
what the file already answers.** A handbook covers HR, SOPs cover the process,
an explained approval chain closes finance — those topics drop out of the pool
instead of being asked again.

Wired into `prioritizeQuestions` / `pickHighestValueQuestion` via an optional
`readiness` parameter (defaulted, so every existing call site is unchanged),
and applied **before** scoring.

Three deliberate restraints:

1. **No score term.** Readiness is derived from the same evidence the ranking
   already weighs; adding weight here would double-count it.
2. **It never ends the interview.** When to stop asking stays where it already
   lives — the conclusion threshold in `computeDiscoveryScore`. Readiness
   reports *"ya podemos recomendar"* to the client through `advice`; it does
   not move that bar.
3. **It can never starve the pool.** Clarification intents (`contradiction`,
   `follow_up`, `consequence`) survive the filter, and an empty result falls
   back to the unfiltered pool. Readiness may skip a question, never the
   conversation.

### `gate.ts` — gates and evidence transparency

- **`blueprintReadinessGate`** — the operating plan may only be presented as a
  firm recommendation once the four topics `CRITICAL_DIMENSIONS` already treats
  as critical are covered (same list, one source of truth). It **qualifies the
  plan, it never hides it**: *"El plan está casi listo — puede revisarlo desde
  ahora. Nos quedan un par de confirmaciones (unos 6 minutos) para dejarlo
  firme"*, with a CTA into the interview.
- **`recommendationEvidenceBasis`** — what a recommendation stands on:
  a strength word (the shared coverage band label) plus the sources in client
  language (*"6 hallazgos de las entrevistas · 2 documentos del expediente ·
  patrones observados"*). When the footing is thin, it asks for exactly what
  would firm it up, preferring a concrete gap over an open clarification.

### `memory.ts` — the Mission 2 bridge, preserved

Imported evidence has to reach the interview without a second scoring path, so
it arrives as ordinary known facts under the `evidence_<topic>` keys
`computeDiscoveryScore` already recognises. Idempotent, and unchanged in
behavior from Mission 2.

## UX surfaces

| # | Surface | What it shows |
| --- | --- | --- |
| 1 | **Dashboard section 3 — "Qué seguimos aprendiendo"** | `StillLearningList` (each item: the question, why it matters, minutes), the advice headline/next step, and `ReadinessConflictList` for open clarifications |
| 2 | **Business Understanding (section 2)** | `readiness.narrative` as the opening paragraph, plus `ReadinessTopicList` — every topic with its 🟢/🟡/🔴 dot, headline and backing sources |
| 3 | **Blueprint readiness gate** | `ReadinessGateCard` above the plan on the Blueprint tab: state, message, minutes, missing information, CTA (into the interview when not unlocked, into the roadmap when it is) |
| 4 | **Recommendation evidence transparency** | `ExplainedRecommendationCard` now shows an "Evidencia" chip with the strength word and the basis list, replacing the old numeric confidence display |
| 5 | **Guided interview (Mission 4 UX, untouched)** | `StageBrief` gains one readiness line for the current stage's topic — where it stands and what would close it |

The dashboard order from Mission 13 is preserved; "Qué seguimos aprendiendo"
was inserted as section 3 and the sections after it renumbered (4 Prioridades …
8 Sistemas recomendados, 9 Próximas acciones in `workspace-view.tsx`).

One assessment is computed per workspace load (`useMemo` in
`workspace-view.tsx`) and shared by the dashboard and the gate, so both always
tell the client the same story.

## Language rules

Spanish, consulting register, throughout. Enforced by keeping every
client-facing string inside the engine (`topics.ts`, `evaluate.ts`,
`gate.ts`) rather than in components:

- ✅ "Necesitamos entender cómo se aprueban las compras y quién autoriza."
- ✅ "Casi listo en finanzas — nos queda una aclaración por confirmar (unos 4 minutos)."
- ✅ "Ya sabemos lo suficiente sobre ventas para recomendar con seguridad."
- ❌ "Baja confianza" · "score 62" · "el modelo no está seguro" · "coverage 45%"

## Extension points

The snapshot boundary is the whole point: **new evidence sources feed the same
engine without touching evaluation, the planner, the gates or the UI.**

1. **A new source** — write one collector in `snapshot.ts` returning
   `EvidenceSignal[]`, add its kind to `EvidenceSourceKind` and its Spanish
   name to `SOURCE_LABELS`. Uploads, e-mail archives and CRM/ERP exports
   already land in the Intake evidence ledger, so they are picked up today
   with no code at all.
2. **A new topic** — add the dimension to `DIMENSION_EVIDENCE_KEYS` (Reasoning)
   and its gaps to `MISSING_INFORMATION_LABELS` and `TOPIC_STAKES`. States,
   narrative, filters and gates follow automatically.
3. **A new gate** — call `evaluateReadiness` and build a `ReadinessGate` the
   way `blueprintReadinessGate` does; `ReadinessGateCard` renders any of them.
4. **A new consumer** — import from `@/lib/readiness`. During an interview use
   `assessMemoryReadiness(memory)`; on a workspace screen use
   `assessReadiness(workspace)`.

## Deliberately out of scope

- No new scoring. Discovery Score, Knowledge coverage and explanation
  confidence remain the only places a number is produced.
- No rewrite of the Mission 4 guided interview UX — readiness was wired into
  the existing flow, one line in the stage brief.
- No change to when the interview concludes.
- No new dependencies, no new routes, no data-model migration.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` — production build succeeds; lint shows the same pre-existing
  warnings as Missions 11–13, in files this mission did not change.
- Traced four workspace states end-to-end (empty, partially seeded, well
  known, and well known with a contradiction) confirming: an empty file reports
  🔴 with concrete missing information and a locked blueprint gate; a well-known
  file reports 🟢 with an unlocked gate; and introducing one contradiction moves
  the affected topic to 🟡 `con_diferencias`, surfaces it at the top of "Qué
  seguimos aprendiendo", and switches the advice from *stop* to *ask* without
  claiming false certainty.
