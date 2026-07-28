# Anonymized Industry Playbooks

**Status:** Complete (Mission F — Discovery Agent roadmap, final mission)
**App:** `apps/architect`
**Module:** `lib/industry-intelligence/` (thin — no new ranking engine)
**Extends:** the Mission 10 question ranker
(`lib/consulting/questions/question-priority.ts` → `scoreQuestion`), the
planner's existing industry seam (`lib/reasoning/planner/next-question.ts` →
`industryCandidates`), and the Missing Information Engine's ranking
(`lib/readiness/missing-information.ts` → `rankMissingInformation`)

## What it is

A small, curated set of **anonymized industry playbooks** — generic,
well-known operating patterns a senior consultant already carries into the
room ("manufacturers usually under-invest in production-planning
visibility", "distributors usually struggle with inventory accuracy"). Each
playbook re-weights a handful of `DiscoveryDimension`s the platform already
scores, so the next question or the next flagged gap leans toward the
pattern typical of this client's industry — without ever inventing a fact
about this specific client.

## Hard rules (privacy / honesty)

1. **No named competitors, no cross-tenant data.** A playbook is generic
   domain knowledge ("en construcción, las órdenes de cambio suelen ser la
   fuente de fricción más común"), never "Company X does Y" — there is
   nothing here that could leak another client's business.
2. **Never invents a client fact.** A playbook only changes *priority
   ordering* — which existing question or gap surfaces first. It never adds
   a known fact, a confidence point that isn't evidence-derived, or a new
   dimension.
3. **The numbers stay honest.** `MissingInformationOpportunity.estimatedLiftPercent`
   — the one industry-playbook-adjacent number shown to the client — is
   never touched by the playbook. The playbook only breaks *ties* between
   opportunities of otherwise-equal lift; the lift value itself keeps coming
   from the same `EVIDENCE_FACT_INCREMENT` heuristic it always did.
4. **Every industry resolves to a playbook.** `other` and `unknown` fall
   back to `GENERIC_PLAYBOOK` (a small, universal operations/systems nudge),
   so ISALWA itself — and any client whose industry hasn't been detected yet
   — still gets a sensible, non-empty bias instead of nothing.

## No second scoring formula

| What changed | Where it plugs in | New computation? |
| --- | --- | --- |
| Question priority nudge (±1–4) | `lib/consulting/questions/question-priority.ts` → `scoreQuestion` calls `applyIndustryPlaybookBias` right after the existing `applyConsequenceBias` | No — one more bias step in the same pipeline, same pattern as the consequence engine |
| Planner starter/catalog boost | `lib/reasoning/planner/next-question.ts` → `industryCandidates` re-scores the *same* `CATALOG` array by `industryDimensionWeight(industry, dimension)` instead of a hardcoded two-industry `if` block | No — replaces a narrower hand-written special case with the same idea, generalized |
| Missing-info gap tie-break | `lib/readiness/missing-information.ts` → `rankMissingInformation(snapshot, assessment, industry)` | No — `estimatedLiftPercent` is unchanged; only the sort order among ties shifts |

```
CompanyWorkspace.industry / memory.summary.industry
                │
                ▼
   lib/industry-intelligence (playbooks.ts, bias.ts)
                │
     ┌──────────┼───────────────────┐
     ▼          ▼                   ▼
scoreQuestion  industryCandidates  rankMissingInformation
(question       (planner catalog    (Missing Information
 ranking)        boost)              Engine gap order)
     │          │                   │
     └──────────┴───────────────────┘
                ▼
     runConsultingIntelligenceCycle
     (highestValueUnknown / questionDecision — Mission G,
      benefits automatically, no change needed there)
```

## The curated set

Six named industries — the same ones `data/catalog.ts` → `INDUSTRY_PROFILES`
already recognizes — plus one generic fallback. Each playbook lists 3–4
`DiscoveryDimension`s with a small additive weight and the anonymized
pattern behind it:

| Industry | Dimensions emphasized | Example pattern |
| --- | --- | --- |
| Manufactura | production, operations, finance, systems | "La planificación de producción suele ser el cuello de botella más costoso." |
| Construcción | finance, team, operations, systems | "Las órdenes de cambio y su aprobación son la fuente más común de fricción financiera." |
| Distribución | operations, finance, systems, production | "La exactitud de inventario y el picking suelen ser el punto más débil." |
| Salud | operations, customers, systems | "El agendamiento y la admisión concentran los cuellos de botella diarios." |
| Retail | operations, customers, systems | "El inventario entre canales suele ser el punto más débil." |
| Servicios | team, customers, operations | "El contexto del cliente entre personas es el riesgo de continuidad más común." |
| Genérico (`other` / `unknown`) | operations, systems | "Los cuellos de botella operativos suelen ser el punto de partida más revelador, sin importar la industria." |

Deliberately small on purpose — a tight, curated catalog a consultant would
actually trust beats a large one nobody reviewed. Growing it later is a data
change in `lib/industry-intelligence/playbooks.ts`, not a new module.

## Why this doesn't fabricate anything

- The bias is **additive priority only** (capped at +4 in `scoreQuestion`,
  the same order of magnitude as the consequence engine's own ±6 to ±25
  nudges), applied to a candidate that a real engine already generated from
  real evidence gaps. A playbook can move a question up the list; it cannot
  put a question in the list that evidence didn't already justify.
- The "Patrón de industria: …" note appended to a boosted candidate's
  `reason` is disclosed, not hidden — it tells whoever reads the rationale
  (Carmen today) *why* this question jumped the queue, exactly like the
  existing `industryCandidates` starter-question reason text
  ("Enfoque de industria: Manufactura.") already did before this mission.
- Consequence and contradiction candidates — which already carry a specific,
  evidence-grounded reason — get the priority nudge but never the extra
  reason text, so a real signal is never dressed up as an industry pattern.

## API

```ts
import {
  getIndustryPlaybook,        // (industry) → IndustryPlaybook — always resolves, generic fallback included
  industryDimensionWeight,    // (industry, dimension) → number (0 if the playbook doesn't touch that dimension)
  industryDimensionPattern,   // (industry, dimension) → string | null — the anonymized rationale
  applyIndustryPlaybookBias,  // (LibraryQuestion, ConversationMemory) → LibraryQuestion — the scoreQuestion bias step
  INDUSTRY_PLAYBOOKS,         // Record<Industry, IndustryPlaybook> — the full curated set
  type IndustryPlaybook,
  type IndustryPlaybookDimensionWeight,
} from "@/lib/industry-intelligence";
```

## Wired call sites

- `lib/consulting/questions/question-priority.ts` — `scoreQuestion` (every
  ranked question, live interview and Guided Assessment alike)
- `lib/reasoning/planner/next-question.ts` — `industryCandidates` (starter
  catalog boost; replaces the old two-industry hardcoded block)
- `lib/readiness/missing-information.ts` — `rankMissingInformation` /
  `buildMissingInformationReport` / `assessMissingInformation` (Missing
  Information Engine gap order)
- `lib/consulting-intelligence/cycle.ts` — passes `workspace.industry`
  through to `buildMissingInformationReport`, so Mission G's
  `highestValueUnknown` benefits automatically — no change needed to the
  cycle's own logic
- `lib/discovery-agent/capabilities.ts`, `lib/readiness/explainable-confidence.ts`
  — same `workspace.industry` / `memory.summary.industry` threading, so the
  Capability Digital Twin and Explainable Confidence reports stay consistent
  with the same industry-aware gap order

## Deliberately out of scope (this mission)

- No new UI. The bias is invisible to Álvaro apart from question ordering
  that already varied by industry before this mission (`industryCandidates`
  existed since the original planner); no new card, tab, or copy surface.
- No LLM. Playbook data is a static, hand-curated TypeScript table — same
  determinism guarantee as every other engine in this roadmap.
- No per-client learning or cross-tenant aggregation. Playbooks are edited
  by hand, not learned from other workspaces' data.
- This is the last mission on the Discovery Agent roadmap — no Mission G2.

## Verification

- `npx tsc --noEmit -p tsconfig.json` — clean.

## Files changed

- `lib/industry-intelligence/playbooks.ts` — new; the curated playbook data
  + `getIndustryPlaybook` / `industryDimensionWeight` / `industryDimensionPattern`
- `lib/industry-intelligence/bias.ts` — new; `applyIndustryPlaybookBias`,
  the `scoreQuestion` bias step
- `lib/industry-intelligence/index.ts` — new; public exports
- `lib/consulting/questions/question-priority.ts` — `scoreQuestion` now
  applies the industry bias after the consequence bias
- `lib/reasoning/planner/next-question.ts` — `industryCandidates`
  generalized from a two-industry hardcoded block to the playbook-driven
  weight lookup, covering every industry including the generic fallback
- `lib/readiness/missing-information.ts` — `rankMissingInformation` /
  `buildMissingInformationReport` / `assessMissingInformation` take an
  optional `industry` used only as a tie-break
- `lib/consulting-intelligence/cycle.ts`, `lib/discovery-agent/capabilities.ts`,
  `lib/readiness/explainable-confidence.ts` — thread `workspace.industry` /
  `memory.summary.industry` into `buildMissingInformationReport`
