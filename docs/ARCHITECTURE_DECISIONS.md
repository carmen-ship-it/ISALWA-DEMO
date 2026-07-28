# ISALWA Architect — Architecture Decisions

**Status:** Permanent record of *why*, not *what*. For the current shape of the codebase, see
[`apps/architect/ARCHITECTURE.md`](../apps/architect/ARCHITECTURE.md). For product-level rules,
see [`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md). For the monorepo-wide ADR log
(ISALWA OS decisions, e.g. database hosting), see [`docs/adr/`](./adr/).

This document exists so a future mission never re-litigates a decision that was already made
deliberately, and so a new contributor understands *why* an engine is shaped the way it is before
extending it. Each entry links to the mission doc(s) under `apps/architect/` that shipped the
decision.

---

## ADR-A1 — Single Business Blueprint as the source of truth

**Decision:** The company owns exactly **one** evolving, versioned Business Blueprint. Reports,
Solution Architecture, Process Model, Deliverables, and (future) generated software all derive
from it; none of them maintain a parallel or competing model of the business.

**Why:** A consulting engagement that shows the owner and the consultant different "truths" about
their own company has already failed, regardless of how good each individual view is in
isolation. Versioning (append-only: v1 → v2 → v3, prior versions superseded, never overwritten)
gives an auditable evolution across the consulting relationship instead of silent mutation.

**Consequence:** Any new derived artifact must consume the Blueprint (and cite `BlueprintEvidenceRef`
lineage back to Knowledge/Memory/Meetings/Reasoning), never invent its own parallel facts about the
company.

**Mission docs:** [`MISSION4.md`](../apps/architect/MISSION4.md) (Business OS Blueprint Engine),
`ARCHITECTURE.md` §"Business OS Blueprint (Mission 4)".

---

## ADR-A2 — Evidence-first (no fabricated content, ever)

**Decision:** Every score, recommendation, risk, opportunity, or maturity rating must trace to
real evidence (an answer, a document, a known fact). An unmeasured dimension reports "not
measured" — never a guessed or interpolated number. Seed/demo data must be honestly empty, never a
synthetic evidence trail dressed up as a real discovery session.

**Why:** Architect's entire value proposition is that a client can trust what it tells them. The
first time a client discovers a "76% understood" figure was partly synthetic, that trust is gone
permanently — this is a stronger failure mode than a missing feature. This principle was violated
and had to be actively *fixed* twice in the product's history (a fabricated ~71% score in an
in-flight interview, and a fabricated pilot seed that produced a plausible-looking but ungrounded
dashboard) — both fixes are preserved as heal-on-load logic in `lib/repositories/migrate.ts` so the
same class of regression self-corrects for any already-persisted row, not just new ones.

**Consequence:** Risk/opportunity engines are gated *by construction* (a rule's `test()` only
fires on matched real text) rather than by a bolted-on `if (empty) show placeholder` check. Any
new engine must follow the same construction-time gating, not a UI-layer patch.

**Mission docs:** [`NO_FABRICATED_CONTENT.md`](../apps/architect/NO_FABRICATED_CONTENT.md),
`PILOT_FAKE_PCT_AND_ENGLISH_FIX.md`, `apps/architect/PRODUCT_PRINCIPLES.md` principle 3.

---

## ADR-A3 — Deterministic readiness (no fake percentages)

**Decision:** Business Understanding, Readiness, and confidence scores are computed by
deterministic engines (`lib/readiness/*`, `lib/reasoning/confidence/score.ts`) from actual
workspace evidence — never by an LLM guess, never hardcoded, never derived from a formula that
could silently drift by provider or model version.

**Why:** A number a client can act on (e.g. "you are ready to conclude discovery") must be
reproducible and explainable. An LLM-derived score would be neither — the same evidence could
score differently on a different day for reasons that have nothing to do with the business. This
also keeps Architect useful with **zero AI API keys configured** (`LocalHeuristicProvider`
fallback) — a hard product requirement verified in `ALVARO_CARMEN_PRODUCT_AUDIT.md`'s executive
answer ("the guided discovery interview, dashboard, blueprint, recommendations, report, and
simulator all run on the deterministic local engine... none of that path calls an LLM").

**Consequence:** LLM calls are reserved for narrative/retrieval assistance (chat, summarize,
embed for retrieval ranking), never for producing the gate number itself. Any mission proposing an
LLM-derived score must be rejected or redesigned to keep the score deterministic and the LLM
advisory-only.

**Mission docs:** [`EXPLAINABLE_CONFIDENCE.md`](../apps/architect/EXPLAINABLE_CONFIDENCE.md),
`MISSING_INFORMATION_ENGINE.md`, `UNDERSTANDABLE_SCORES.md`, `CONSULTANT_READINESS_ENGINE.md`.

---

## ADR-A4 — Central AI provider abstraction

**Decision:** All LLM/embedding calls route through `lib/ai` (`ai.chat()` / `ai.embed()` /
`ai.summarize()`), config-driven from environment variables (`ARCHITECT_LLM_*`), with adapters for
Gemini (current default), OpenAI, Anthropic, and a deterministic local fallback. No call site
hardcodes a model id or vendor SDK.

**Why:** Vendor/model choice is a cost and availability decision that should never require code
changes across a dozen call sites, and a pilot with zero configured keys must still work fully
(see ADR-A3). A single abstraction point also means "never hardcode a model id" is enforceable by
code review at one file, not an audit across the whole codebase.

**Consequence:** Any new feature that needs an LLM call must add it through `lib/ai`, extending the
adapter list only if a genuinely new provider is needed — never adding a second parallel "AI
client" module.

**Mission docs:** [`AI_PROVIDER_ABSTRACTION.md`](../apps/architect/AI_PROVIDER_ABSTRACTION.md).

---

## ADR-A5 — Industry playbooks re-weight priority only, never invent facts

**Decision:** Anonymized industry playbooks (6 curated industries + 1 generic fallback) may only
adjust question/gap *priority* (a bounded ±1–4 re-weight), and may never invent a client fact,
alter a lift number, or introduce industry-specific copy the client sees.

**Why:** Industry context is genuinely useful for *ordering* what to ask next (a manufacturer and
a retailer have different high-value first questions), but the moment a playbook starts asserting
things about the *specific* client company rather than the client's own answers, it becomes
fabrication with extra plausibility — a more dangerous failure mode than an obviously fake number,
because industry-typical claims sound reasonable. Keeping the bias invisible to the client (no UI,
no card, no copy surface) was a deliberate choice, not an oversight — see decision below.

**Consequence:** The bias step (`applyIndustryPlaybookBias` in `lib/industry-intelligence/bias.ts`)
only ever touches a priority score, never a `knownFacts` entry, a score, or a lift number. Any
future extension of industry intelligence must preserve that boundary.

**Mission docs:** [`INDUSTRY_PLAYBOOKS.md`](../apps/architect/INDUSTRY_PLAYBOOKS.md).

---

## ADR-A6 — Capability Digital Twin regroups existing evidence, no second scoring model

**Decision:** The Capability Digital Twin (10 business capabilities, client-visible on the
Dashboard) is a pure regrouping/projection of Readiness Engine evidence that already exists — it
introduces zero new scoring logic.

**Why:** A tempting shortcut for "give the client a capability view" would have been a second,
capability-shaped confidence model computed independently from the Readiness Engine. That would
create exactly the "second source of truth" risk ADR-A1 exists to prevent — two numbers that could
silently disagree with each other for the same underlying evidence. Regrouping the existing engine
output instead guarantees the Twin can never contradict the Readiness Engine, by construction.

**Consequence:** Any new "view" over readiness/evidence (a new panel, a new report section) should
default to being a projection of `lib/readiness` output, not a new derivation, unless there is a
specific reason the existing engine's shape cannot represent the new view (and if so, that reason
belongs in a new ADR here).

**Mission docs:** [`CAPABILITY_DIGITAL_TWIN.md`](../apps/architect/CAPABILITY_DIGITAL_TWIN.md).

---

## ADR-A7 — RetrievalPack: bounded, provenance-tagged context packing

**Decision:** Context assembled for the Consulting Intelligence cycle and the guided-discovery
"Basado en…" evidence chips goes through a single `RetrievalPack` abstraction
(`lib/ai/retrieval/pack.ts`) — bounded in size, and every included item tagged with where it came
from (answer, document chunk, knowledge entity, readiness gap). A synchronous, keyword-ranked
variant (`buildRetrievalPackSync`) runs today at both current call sites; an async, real-embeddings
variant (`buildRetrievalPack`) exists but is not yet wired to a call site (both current call sites
are structurally synchronous/client-side).

**Why:** "Cursor-style bounded context packing" was chosen deliberately over sending unbounded
history to an LLM or reasoning engine: unbounded context is both a cost problem and a hallucination
risk (more irrelevant context increases the chance a downstream consumer treats noise as signal).
Provenance tagging exists so every "Basado en…" chip a client sees can be traced to a real,
specific source — never a vague "the AI thinks so."

**Consequence:** New consumers of retrieved context must go through `RetrievalPack`, not assemble
their own ad hoc context string. Wiring the async, real-embeddings variant to a call site (e.g. via
an `/api/retrieval/pack` route, or moving the Consulting Intelligence cycle server-side) is a
documented, intentional upgrade path — not a bug — and should be picked up as its own mission
rather than done as a side effect of an unrelated change.

**Mission docs:** [`RETRIEVAL_PACK.md`](../apps/architect/RETRIEVAL_PACK.md).

---

## ADR-A8 — Continuous Intelligence: re-read, never re-score

**Decision:** The Consulting Intelligence Agent (`lib/consulting-intelligence/cycle.ts`) is a
background, non-conversational loop that re-reads what the engines already say after every new
piece of evidence and writes a private notebook (`workspace.consultingIntelligence`) — it never
re-implements or re-scores anything the Readiness/Consulting/Blueprint engines already compute,
and it is never exposed to Client Mode.

**Why:** "Architect never finishes" (product principle 8) needed a concrete mechanism, and the
tempting shortcut — a second reasoning pass that re-derives its own opinion about the business —
would again create a second source of truth (see ADR-A1, ADR-A6). Making the agent's job explicitly
"read and synthesize what already exists" rather than "compute something new" keeps it safe to run
after every single answer without risking drift from the deterministic engines. Keeping it
consultant-only (never client-visible, enforced by `lib/consulting-intelligence/visibility.ts`) was
deliberate: it is a working notebook for Carmen's judgment, not a client-facing claim that needs the
same evidence-citation bar as everything in Client Mode.

**Consequence:** Any future "agent" or "background intelligence" feature must default to this same
shape — read existing engine output, self-check with a believe/why/evidence/contradicts structure
(`lib/consulting-intelligence/self-check.ts`), gate client-visibility explicitly — rather than
becoming a second parallel reasoning system.

**Mission docs:** [`CONSULTING_INTELLIGENCE_AGENT.md`](../apps/architect/CONSULTING_INTELLIGENCE_AGENT.md).

---

## ADR-A9 — Client Mode / Consultant Mode as a first-class product boundary

**Decision:** A single shared workspace (`ws_isalwa`) is visible to two roles with different tab
sets (`CLIENT_VISIBLE_TAB_IDS`) and different route access (`CONSULTANT_ONLY_PATHS`), rather than
two separate workspace copies or a permissions system bolted on after the fact.

**Why:** Architect's core promise — "one evolving Business Blueprint," "human-first" — requires
that the consultant and the client are looking at the *same* underlying truth, just through
different lenses (raw diagnostic reasoning vs. client-safe narrative). Building two separate data
models would have violated ADR-A1 immediately.

**Consequence:** New consultant-only surfaces are additions to the existing tab/route allowlists,
never a fork of the workspace data model. The current gap (UI-level gating without a matching
`kind`-aware RLS policy for every write) is tracked as a known, explicit limitation — see
[`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) §6 — rather than something to silently patch
around; the correct fix is to extend the membership-`kind` model, not add a second permission
layer next to it.

**Mission docs:** `MISSION10.md` (Authentication Foundation),
[`ALVARO_CARMEN_PRODUCT_AUDIT.md`](../apps/architect/ALVARO_CARMEN_PRODUCT_AUDIT.md) (B5/S5
finding).

---

## ADR-A10 — Implementation Package is orchestration-only, never regenerates content

**Decision:** The Implementation Package (`lib/implementation-package/`) assembles references to
existing artifacts (Blueprint, Solution, Process Maps, Deliverables) once
`businessUnderstanding >= CONCLUSION_THRESHOLD` — it does not regenerate their content, does not
generate code, and does not call an LLM.

**Why:** "Architect discovers, structures, designs, and prepares; other products build and
operate" (product principle 10 / `docs/VISION.md` "Product Boundaries") is a hard product
boundary, not a soft aspiration. The temptation, once discovery reaches a conclusion threshold, is
to start generating code or Cursor prompts directly from Architect — this ADR exists to record
that the boundary was considered and deliberately not crossed in Mission 18, and should not be
crossed silently in a future mission either. If that boundary is ever intentionally moved, it
should be a new ADR here, not a quiet scope creep inside an unrelated mission.

**Consequence:** Any future "generate the software" feature is a **new, explicitly-scoped mission**
with its own ADR — not an incremental extension of the Implementation Package's current
orchestration-only contract.

**Mission docs:** [`MISSION18.md`](../apps/architect/MISSION18.md).

---

## Other ADRs already implied by shipped missions (brief)

| ADR | Decision | Why (short) | Mission doc |
| --- | --- | --- | --- |
| A11 | Knowledge memory links reuse the 8 existing `KnowledgeRelationKind` values | No new taxonomy for every new relation type; extend the enum, don't fork it | `KNOWLEDGE_MEMORY_LINKS.md` |
| A12 | Adaptive follow-ups cite the strongest evidence item (answer > readiness gap > knowledge entity > document chunk), one grounded sentence, never a generic prompt | Consultant-quality interviewing means every question earns its place with a visible reason | `ADAPTIVE_FOLLOWUPS.md` |
| A13 | Discovery Complete/Incomplete is a composed verdict (Readiness gate **and** every capability's auto-stop flag), never a bare percentage | A number alone invites false precision; a verdict + reasons is what a consultant would actually say | `DISCOVERY_CEREMONY.md` |
| A14 | Architect is a standalone Next.js app independent of `@isalwa/ui` / `@isalwa/web`, its own Vercel project | Architect and ISALWA OS are different products with different release cadences; coupling their deploy pipelines would make either one fragile to the other's changes | `apps/architect/DEPLOYMENT.md` ("Independence from ISALWA OS") |
| A15 | Auth defaults to Supabase when configured, falls back to signed-in-by-cookie + localStorage otherwise — never requires either to run locally | A contributor must be able to run and demo Architect with zero external accounts configured | `apps/architect/MISSION10.md`, `DEPLOYMENT.md` |

---

## How to add a new ADR

When a future mission makes a decision that a later contributor might otherwise reverse or
re-litigate without knowing why it was made — add an entry here in the same shape (Decision / Why /
Consequence / Mission docs), numbered `ADR-A<next>`. Do not delete or renumber existing entries;
supersede them explicitly (`ADR-A3, superseded by ADR-A21`) if a later decision changes course.
