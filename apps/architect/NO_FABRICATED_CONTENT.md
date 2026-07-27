# No Fabricated Content — audit

Goal: audit Architect for hardcoded/invented demo business content (fake
company names, fake documents, fake dates/scores/recommendations) that could
mislead Carmen or Álvaro into thinking something happened that didn't, and
make sure every surface has an honest loading/empty state when evidence is
thin or missing. See `SPANISH_CLIENT_EXPERIENCE_100.md` for the related
English-copy hotfix shipped in the same commit.

## What was already honest (verified, not re-done)

Most of this was already handled by prior missions (M3–M18). Verified rather
than rebuilt:

- **No placeholder multi-tenant demo companies.** `lib/repositories/
  migrate.ts` already purges `ws_acme`, `ws_viaggio`, `ws_abc`
  (`REMOVED_DEMO_WORKSPACE_IDS`) from any bundle on load. `lib/workspace/
  seed.ts` seeds exactly one workspace, `ws_isalwa`/"ISALWA" — the real pilot
  client — from a small, explicit set of real facts/pain points (not
  invented ones): consulting knowledge lives in people, project handoffs
  lose context, Álvaro is the client-side contact. No `Acme`, `Sample Co`,
  `Test Company`, or similar found anywhere in source (`rg`'d the whole app).
- **New/empty workspaces start honest.** `createEmptyWorkspace()` returns
  all-empty arrays/nulls, `businessUnderstanding: 0`, and Spanish copy
  ("Recién creado", "Iniciar la primera entrevista de descubrimiento") — no
  fabricated starter content.
- **Blueprint generation is already evidence-gated at the zero bar.**
  `lib/blueprint/seed.ts#createSeedBlueprints` returns `[]` (no blueprint at
  all) when a workspace has zero meetings **and** zero pain points — it will
  not invent a blueprint from nothing.
- **Risk/opportunity pattern-matching is evidence-gated by construction.**
  `lib/consulting/risk.ts` / `opportunities.ts` only produce a risk/
  opportunity when a rule's `test()` matches actual discovered text (known
  facts, pain points, business description) — an empty discovery blob
  matches nothing, so the lists are naturally empty rather than fabricated.
- **Empty/loading states already exist broadly** — not just one place.
  `EmptyPanel`/`EmptyState` (`@isalwa/ui`) plus local `EmptyHint`-style
  fallbacks are already used in `executive-dashboard.tsx` (`CockpitList`),
  `executive-insights-panel.tsx`, `deliverables-panel.tsx`,
  `business-processes-panel.tsx`, `brand-experience-panel.tsx`,
  `company-model-panel.tsx`, `company-evolution-panel.tsx`,
  `roadmap-timeline.tsx`, `explained-recommendation-card.tsx`,
  `executive-simulator-panel.tsx`, `report-view.tsx`, and the guided
  discovery panels — all in Spanish ("Aparecerá a medida que crezca la
  evidencia…", etc.). Several files carry explicit "never invented" /
  "honest empty state" doc comments already (`lib/insights/types.ts`,
  `lib/knowledge/coverage.ts`, `types/brand.ts`, `lib/reasoning/think.ts`,
  `explained-recommendation-card.tsx`, `executive-dashboard.tsx`,
  `executive-simulator-panel.tsx`).

## What was actually fabricated — found and fixed

- **`lib/knowledge/seed.ts`** invented two "processed" Knowledge Center
  documents for the real `ws_isalwa` pilot workspace — a presentation and
  process notes, tagged `source: "powerpoint · mock"` / `"word · mock"` —
  plus a summary claiming they had been reviewed ("Se revisaron dos
  presentaciones de estrategia y una nota de traspaso de proyecto..."). Those
  documents were never uploaded. Álvaro/Carmen would see them as real
  evidence in the Knowledge Center and its timeline. **Fixed:** removed;
  `createSeedKnowledge()` now returns `emptyWorkspaceKnowledge()` for every
  workspace, including the pilot. The Knowledge Center starts honestly empty
  until someone uploads something real through the existing
  `lib/knowledge/intake.ts` pipeline.
- **English leaks re-audited and fixed as part of the same pass** (full
  detail in `SPANISH_CLIENT_EXPERIENCE_100.md`'s HOTFIX section):
  stale pre-translation English persisted in `conversationMemory.consulting`
  / `businessProcesses.bottlenecks` / `solutionArchitecture.roadmap` for
  already-saved workspaces, a missing `phaseLabel()`/`moduleLabel()` call in
  the executive roadmap projection, and English knowledge-timeline titles
  (`timelineTitleForAsset`, e.g. "Presentation Analyzed") — none of these are
  fabricated *facts*, but they undermine trust the same way stale/foreign
  copy does, so they're covered here too.

## HOTFIX — pilot seed itself reclassified as fabricated, emptied

Prior missions (see "What was already honest" above, and `SPANISH_CLIENT_EXPERIENCE_100.md`)
judged the `ws_isalwa` seed acceptable because every fact/pain point in it was *true* — a real
description of ISALWA's own business — rather than an invented client. On review, that
standard was too permissive: **the dashboard showing "Salud 23 · Emergente" and ~24%
Business Understanding on a workspace where no one has actually sat through a discovery
interview or uploaded a document is a false impression of progress**, even though the
underlying statements are factually true and the engine math is 100% honest given its
inputs. Consultant Readiness Engine math was never fake here — the *evidence it was fed* was
synthetic (programmatically inserted, not gathered).

**What `lib/workspace/seed.ts#createSeedWorkspaces()` used to inject for `ws_isalwa`:**
5 `knownFacts` (evidence tagged `"Sesión de descubrimiento anterior"` — a meeting that never
happened), 1 fabricated `Meeting` record, 2 pain points, a 3-module recommendation, and —
cascading from that thin evidence — a full `BusinessBlueprint` → `SolutionArchitecture` →
`BusinessProcesses` → `Deliverables` → `BrandExperience` → `CompanyModel` →
`ImplementationPackage` chain, all real engine output but all rooted in evidence nobody
actually gave.

**Fixed:** `createSeedWorkspaces()` now returns `createEmptyWorkspace("ISALWA")` (with
`id: "ws_isalwa"`) — the same honest-empty path already used for every brand-new workspace.
Login identity is untouched: Carmen (`consultant`) and Álvaro (`client`) still land on
`ws_isalwa`; `lib/auth/constants.ts` membership/role wiring was not touched. Every gauge
(Business Understanding, Health/Maturity, dimension confidence) will read 0 /
"aún sin evaluar" until a real interview or a real document upload produces evidence — same
behavior any new client workspace already has.

**Already-persisted Supabase rows:** code alone cannot delete an existing database row, so
`lib/repositories/migrate.ts`'s existing "Honest scores" heal step (previously dead for this
exact case — it looked for a `seed_fact_*` key prefix that the seed had never actually used)
now also detects the real marker: every `knownFacts[].evidence` entry citing the literal
placeholder `"Sesión de descubrimiento anterior"`. When detected for `ws_isalwa`, the heal
resets `conversationMemory`, `businessUnderstanding`, `openQuestions`, `painPoints`,
`meetings`, `recommendations`, `modules`, and the entire derived cascade (`blueprints`
through `implementationPackage`) to empty — it runs automatically on the next load/save, no
manual Supabase reset required. (If a real interview or upload has already added evidence
with different, non-seed keys, the heal correctly leaves it alone — it only fires when
*every* known fact still carries the seed's placeholder evidence string.)

## Known, deliberately-not-rewritten gap

Once a workspace has **any** meeting or pain point (i.e. it clears the
zero-evidence bar above), `migrateBundle` derives a **full** blueprint →
solution architecture → business processes → deliverables → brand →
company model → implementation package in one pass, at full detail,
regardless of how thin that first meeting's evidence is. This is real,
deterministic engine output (not decorative filler) and every fact in it
traces to something in the workspace — so it is not "fabricated" in the
sense of invented facts — but for a company with only 1-2 pain points it can
*read* as more finished than the evidence supports.

`lib/executive/derive.ts`'s journey checklist already gates its **copy**
(not the underlying artifacts) on `businessUnderstanding >= 40` ("Borrador
inicial…" below that bar). Extending that same threshold to gate the
Dashboard/roadmap/solution-architecture *panels* themselves would touch
seven engines (`blueprint`, `solution`, `processes`, `deliverables`,
`brand`, `company-model`, `implementation-package`) and their call sites —
explicitly out of scope for this pass per "don't rewrite consulting engines
wholesale." Flagging as a follow-up rather than rushing a cross-cutting gate
change into a hotfix commit.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- Manual grep sweep for `Example|Sample|Demo|Mock|Acme|Lorem|fake` (case
  insensitive) across `apps/architect` source — no remaining hits outside
  legitimate false positives (e.g. `confidenceSamples`, "demora", "podemos").
