# ISALWA Architect — Engineering Guidelines

**Status:** Permanent engineering process for `apps/architect`.
**Related:** [`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md) ·
[`docs/ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) ·
[`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) ·
[`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) ·
[`.cursor/rules/isalwa-ai-constitution.mdc`](../.cursor/rules/isalwa-ai-constitution.mdc) ·
[`.cursor/rules/architect-product-principles.mdc`](../.cursor/rules/architect-product-principles.mdc)

---

## 1. Folder & naming conventions

Architect's shape is documented in [`apps/architect/ARCHITECTURE.md`](../apps/architect/ARCHITECTURE.md).
Keep new code inside the existing convention rather than inventing a new one:

```text
apps/architect/
  app/                    Next.js App Router routes
  components/             home, workspace, discovery, report, nav — grouped by feature area
  lib/
    reasoning/            Consultant brain — adaptive interview engine
    memory/                Interview → workspace application
    workspace/             Seed + helpers
    knowledge/             Knowledge Ingestion (vault, pipeline, graph, bridge)
    blueprint/             Business OS Blueprint — derive, version, future outputs
    consulting/             Consulting Intelligence — maturity, risk, opportunities, contradictions
    solution/                Solution Architect — modules, entities, roles, APIs, roadmap
    processes/                Business Process Engine — workflows, steps, handoffs, bottlenecks
    process-visualization/     Deterministic layouts + studio model
    deliverables/               Consulting package builders
    brand/                        Brand & Experience Studio
    executive/                     Executive presentation projection
    consulting-intelligence/        Background non-conversational re-reading loop
    industry-intelligence/           Anonymized industry playbooks (priority bias only)
    discovery-agent/                  Capability Digital Twin
    ai/                                Central provider abstraction (chat/embed/summarize)
    ai/retrieval/                       RetrievalPack — bounded, provenance-tagged context packing
    auth/                                 Session, roles, Supabase + pilot cookie auth
    repositories/                          Local/mock/Supabase CompanyMemoryStore
    resume/ · timeline/ · reports/ · documents/ · search/ · llm/ · persistence/ · prompts/
  domain/ · prompts/ · agents/ · types/ · data/ · styles/
```

- New engine logic belongs in a new or existing `lib/<domain>/` folder named after the business
  concept it models (e.g. `lib/blueprint/`, not `lib/utils2/`).
- New UI belongs under the existing `components/<feature-area>/` grouping. Search for an existing
  equivalent component before adding a file (see §7).
- Mission documentation for a shipped mission lives at `apps/architect/MISSION<N>.md` (or
  `MISSION<N>_<slug>.md` for larger efforts under `docs/product/`, `docs/design/`, or
  `docs/experience/` when the mission spans product/design concerns beyond Architect's own repo
  folder — follow the existing precedent for where a given mission type has historically lived).
  Deep-dive feature docs (e.g. `RETRIEVAL_PACK.md`, `CAPABILITY_DIGITAL_TWIN.md`) live alongside
  `MISSION*.md` at `apps/architect/` root when they document a single shipped mission in detail.

## 2. Mission process

Architect's development happens in **missions** — a mission is one scoped, documented unit of
work with a clear goal, explicit constraints, and a written record.

1. **Read before writing.** Before starting a mission, read
   [`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md),
   `apps/architect/PRODUCT_PRINCIPLES.md`, `apps/architect/ARCHITECTURE.md`, and the most recent
   related mission doc(s). Apply the Decision Filter before scoping any new work.
2. **State the goal and constraints up front** in the mission doc, including an explicit
   "deliberately out of scope" section — this is the single most consistently useful pattern in
   the existing mission docs (see `MISSION18.md`, `INDUSTRY_PLAYBOOKS.md`, `RETRIEVAL_PACK.md` for
   examples) and must be preserved.
3. **Build the smallest change that satisfies the goal** by composing existing engines. Never
   introduce a second scoring formula, a second knowledge graph, a second AI provider abstraction,
   or any other parallel implementation of something that already exists.
4. **Document what was built** in a `MISSION<N>.md` (or feature doc) with: goal, hard constraints
   honored (as a checklist), what was built, public API surface, intentionally deferred items, and
   Definition of Done.
5. **Typecheck, then commit, then push** — see §4 and §8.

## 3. One mission at a time

Work **one task at a time** unless the user/requester explicitly asks otherwise — this is stated
directly in `.cursor/rules/architect-product-principles.mdc` and is not optional guidance. Do not
start a second mission's code changes while a first mission's changes are uncommitted or
unverified. If a follow-on idea emerges mid-mission, write it into the current mission doc's
"deliberately out of scope" / "known gaps" section rather than silently expanding scope.

## 4. Typecheck required

Every mission that touches `.ts`/`.tsx` files must pass a clean typecheck before being considered
done:

```bash
cd apps/architect
pnpm typecheck   # tsc -p tsconfig.json --noEmit
```

TypeScript is strict, `any` is disallowed as a style default (`apps/architect/README.md`, Stack
table). A mission is not complete if `pnpm typecheck` fails, regardless of how the runtime
behavior looks in the browser.

## 5. No parallel rewrites

This is the single rule violated most expensively when ignored, and it is binding across the
whole monorepo (`.cursor/rules/isalwa-ai-constitution.mdc`) and specifically inside Architect
(`.cursor/rules/architect-product-principles.mdc`, principle 5: "One evolving Business Blueprint
is the source of truth"):

- Never rewrite a working engine to add a feature that could be composed on top of it instead.
- Never create a second version of an existing model (a second scoring formula, a second knowledge
  graph, a second retrieval mechanism, a second AI provider layer) — extend the one that exists.
- Never move business logic out of `lib/reasoning`, `lib/consulting`, `lib/blueprint`,
  `lib/solution`, `lib/processes`, `lib/deliverables`, `lib/knowledge`, or `lib/readiness` without
  explicit approval — these are the engines named in the mission's own critical constraints and in
  [`docs/ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md).
- If unsure whether a change touches business logic, treat it as if it does and ask before
  proceeding.

## 6. Reuse existing engines

Before building new derivation logic, check whether one of these already produces (or could be
extended to produce) what you need — see [`apps/architect/ARCHITECTURE.md`](../apps/architect/ARCHITECTURE.md)
for the full contract list:

- `lib/reasoning` — adaptive interview / next-question planning
- `lib/readiness` — Readiness Engine, Missing Information Engine, Explainable Confidence
- `lib/knowledge` — Knowledge Ingestion, coverage, bridge, briefing
- `lib/blueprint` — Business OS Blueprint (versioned)
- `lib/consulting` — maturity, risk, opportunities, contradictions
- `lib/solution` — Solution Architecture
- `lib/processes` / `lib/process-visualization` — Business Process Engine + Studio
- `lib/deliverables` — Deliverables Engine
- `lib/consulting-intelligence` — background re-reading loop, working memory, self-check
- `lib/discovery-agent` — Capability Digital Twin
- `lib/ai` + `lib/ai/retrieval` — provider abstraction + RetrievalPack
- `lib/industry-intelligence` — anonymized playbooks (priority bias only, never invents facts)
- `lib/implementation-package` — orchestration-only assembly of the above into a client-facing
  package (never regenerates the underlying content)

A new mission composing two or more of the above (reading their output, never rewriting their
internals) is the expected shape of most future work.

## 7. Component reuse

Before creating any new UI component, search the existing tree for an equivalent — this applies
both to Architect's local `components/ui/*` (shadcn/ui-pattern primitives:
`Button`, `Card`, `Progress`, `Separator`, and any others added since) and to the design-system
vocabulary named in the AI Constitution (`MetricCard`, `Panel`, `ExperienceHeader`, `Chip`,
`Button`, `Timeline`, `SectionHeader`, `InsightCard`, `DashboardGrid`, `ActionBar`, `SearchField`,
`PageContainer`, `PageSection`, `StatGroup`, `ListRow`, `EmptyPanel`, `StatusPill`, `EmptyState`) —
even though Architect does not import `@isalwa/ui` directly (see
[`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md#alignment-with-the-frozen-design-language)),
the same "search first, reuse, don't duplicate" discipline applies to its own local equivalents.
If one exists: reuse it. Do not build another.

## 8. Git process

- Typecheck clean → commit with a descriptive message in the existing style
  (`feat(architect): ...`, `fix(architect): ...`, `docs(architect): ...`) → push to `main`.
- Prefer smaller PRs/commits over large refactors (AI Constitution, principle 8).
- Every commit should be able to answer: why is this change necessary, which existing engine/
  component was reused, does this introduce duplication, does this preserve architecture?

## 9. Spanish client copy

Any string a client (`role: "client"`) can see is generated **in Spanish inside the engine
itself** and must **never** be routed through the i18n layer (`lib/i18n/messages/{es,en}.ts`) —
this prevents client-facing consulting language from drifting by locale or accidentally rendering
in English. Only UI chrome (labels, kickers, empty-state copy, nav) goes through
`useTranslations()` / the i18n message dictionaries. This distinction is the root-cause fix
documented in `apps/architect/I18N_100.md` and `SPANISH_CLIENT_EXPERIENCE_100.md` — re-derive from
those docs before touching either layer. Never hardcode a client-visible Spanish string that
bypasses an existing translation function (`coverageAreaLabel()`, `phaseLabel()`, `moduleLabel()`,
etc.) if an equivalent already exists — extend that function, don't add a second one.

## 10. Consultant-only logic and Client Mode rules

- `CLIENT_VISIBLE_TAB_IDS` (`components/workspace/workspace-tabs.tsx`) is the single source of
  truth for which workspace tabs a client sees. Consultant-only tabs today: `assessment`
  (Diagnóstico), `architecture` (Sistema recomendado), `processes` (Cómo opera).
  `CONSULTANT_ONLY_PATHS` (`lib/auth/constants.ts`) is the equivalent for top-level routes
  (`/companies`, `/preparation`). Any new consultant-only surface must be added to the relevant
  list — never gated only by "the client just won't navigate there."
- Client Mode must never expose raw engine ids, internal consultant reasoning, or diagnostic
  language. The `simulator` tab's own code comment ("client-safe by construction... read-only,
  Spanish-only, no raw engine ids") is the model to follow for any new client-visible surface.
- UI-level gating (`{session?.role === "consultant" ? ... : null}`) is necessary but **not
  sufficient** for anything that must be a hard security boundary — see
  [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) §6 for the current RLS gap this creates and
  why a new consultant-only *write* path must also be checked at the RLS/server-action layer, not
  only hidden in React.
- Never fabricate content to make Client Mode look more finished — see
  `apps/architect/NO_FABRICATED_CONTENT.md`. An empty or thin workspace must show an honest empty
  state, never a synthetic score or invented evidence.

## 11. UI principles

- Minimal, premium, executive document tone — no dashboard chaos, no unnecessary navigation.
- One screen answers one question; it does not compete with ten panels for attention.
- Every dashboard/report section must be evidence-gated: it renders from real workspace data or
  shows an explicit empty/loading state (`EmptyHint`-style), never a placeholder that could be
  mistaken for real content.
- No dashboard chrome or diagram canvas beyond what a mission has explicitly built and documented.
- Follow the visual/motion restraint already established (calm motion, no decorative filler) even
  though Architect's specific token values are its own, independent from ISALWA OS's porcelain/
  kiln/glaze palette.

## 12. Testing expectations

- `apps/architect` currently has no automated test suite (`pnpm test` is a placeholder — see
  `package.json`). Until a real test runner is introduced, the verification bar for a mission is:
  1. `pnpm typecheck` clean.
  2. `pnpm lint` clean (or no new warnings introduced).
  3. A manual walkthrough of the affected flow(s) in both Client Mode and Consultant Mode where
     relevant (this is the pattern the product audits already follow —
     `ALVARO_CARMEN_PRODUCT_AUDIT.md` is the reference example of what a thorough manual pass looks
     like).
  4. For anything touching evidence/scoring, a manual repo-wide grep sweep for fabrication smells
     (`Example|Sample|Demo|Mock|Acme|Lorem|fake`, case-insensitive) as done in
     `NO_FABRICATED_CONTENT.md`, to catch accidental hardcoded demo content.
- If a mission introduces the first real automated tests, document the chosen runner and
  convention in this file's next revision — do not introduce two competing test frameworks.
- See [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) for the full pre-release verification
  list, which is broader than per-mission testing.
