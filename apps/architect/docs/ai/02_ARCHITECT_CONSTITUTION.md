# 02 — Architect Constitution

**Status:** Permanent. Binding for every future mission, screen, feature, and refactor inside
`apps/architect`. Outranks implementation convenience, "we could also…" ideas, and individual
`MISSION*.md` prompts. If a mission conflicts with this document, change the mission.

**Aligns with:** [`docs/PRODUCT_CONSTITUTION.md`](../../../../docs/PRODUCT_CONSTITUTION.md),
[`apps/architect/PRODUCT_PRINCIPLES.md`](../../PRODUCT_PRINCIPLES.md) (the canonical,
do-not-remove principles file — this document does not fork it), and the monorepo-wide
[`docs/architecture/AI_CONSTITUTION.md`](../../../../docs/architecture/AI_CONSTITUTION.md). Also
aligns with the Mission 25 governance layer —
[`docs/ENGINEERING_GUIDELINES.md`](../../../../docs/ENGINEERING_GUIDELINES.md) and
[`docs/ARCHITECTURE_DECISIONS.md`](../../../../docs/ARCHITECTURE_DECISIONS.md) in particular.
Where any of these overlap, they must agree.

---

## Permanent rules

1. **Never rebuild an engine.** Readiness, Blueprint, Consulting Intelligence, Company Model,
   Solution Architecture, Process Model, Deliverables, Retrieval, the AI Provider abstraction, and
   Knowledge each have exactly one implementation. A new mission composes them; it does not add a
   second scoring formula, a second retrieval path, or a second knowledge graph.
2. **Always compose, never fork.** If a capability looks like it needs a new engine, first prove
   the existing engines can't already answer it by reading their code and mission docs
   (`docs/ENGINEERING_GUIDELINES.md` §"read before writing"). Consulting Intelligence is the
   canonical example: it explicitly *re-reads* what other engines already computed; it never
   re-scores.
3. **Never invent evidence.** Every fact, score, recommendation, or confidence value must trace to
   an interview answer, a document, a meeting transcript, or a deterministic derivation of one of
   those. No hallucinated workflows, no guessed maturity, no fabricated percentages.
4. **Never fake readiness or confidence.** An unmeasured capability reports "not measured," never a
   guessed number. A playbook or bias step may re-order *priority*; it may never touch a lift number
   or invent a client fact (see `INDUSTRY_PLAYBOOKS.md`, the Mission F precedent).
5. **Always derive from evidence.** Recommendations, blueprint content, and process models must be
   traceable back through their evidence refs. If it can't be traced, it can't be shown.
6. **Spanish client copy, generated in-engine.** Any string a client can see is written in Spanish
   inside the engine itself, not routed through i18n (so it can't drift by locale). Only UI chrome
   (labels, kickers, empty-state copy) goes through `lib/i18n/messages/{es,en}.ts`.
7. **Executive, premium design — no new visual language.** Reuse Architect's own local component
   set (`components/ui/*`, shadcn/ui patterns) and existing composed patterns (`Card`, `Panel`,
   tint tokens). Architect does not import `@isalwa/ui` (documented deployment independence — see
   `apps/architect/DEPLOYMENT.md`), but the *process* rules of the AI Constitution still apply:
   reuse before creating, one visual language per product, calm motion, no dashboard chrome for
   the sake of decoration.
8. **One product, no parallel intelligence.** The company owns exactly one evolving Business
   Blueprint. Reports, recommendations, process maps, deliverables — all derive from it. Nothing
   becomes a second source of truth, and nothing built for Client Mode duplicates a
   Consultant-Mode-only engine (or vice versa) — they read the same evidence through a visibility
   gate (`lib/consulting-intelligence/visibility.ts`), never a fork.
9. **No duplicated primitives.** Search first: does a component like this already exist in
   `components/ui/`, `components/workspace/`, `components/workspace/executive/`, or
   `components/discovery/guided/`? If yes, reuse or extend it.
10. **Client/Consultant Mode is a hard boundary of intent.** A client (`role: "client"`) never sees
    internal consultant reasoning, raw engine ids, or the `assessment`/`architecture`/`processes`
    tabs — enforced server-side, never trusted from the client. See
    `docs/SECURITY_POSTURE.md`.

## Protected systems

Treat every one of these as **load-bearing** — read its mission doc and current implementation
before touching it, and extend rather than replace:

| System | Entry point |
| --- | --- |
| Discovery / guided interview | `lib/discovery/`, `lib/discovery-agent/`, `components/discovery/guided/` |
| Readiness Engine | `lib/readiness/` (`evaluate.ts`, `gate.ts`, `missing-information.ts`) |
| Capability Digital Twin | `lib/discovery-agent/capabilities.ts` |
| Consulting Intelligence | `lib/consulting-intelligence/` (`cycle.ts` is the entry point) |
| Retrieval | `lib/ai/retrieval/` (`pack.ts`, `chunks.ts`) |
| AI Provider abstraction | `lib/ai/` (`ai.chat()` / `ai.embed()` / `ai.summarize()` — never a hardcoded model id at a new call site) |
| Knowledge | `lib/knowledge/`, `lib/intake/` |
| Industry Playbooks | `lib/industry-intelligence/` |
| Company Model / Company Brain | `lib/company-model/`, `lib/consulting-intelligence/company-brain.ts` |
| Business Blueprint | `lib/blueprint/` |
| Solution Architecture | `lib/solution/` |
| Process Model | `lib/processes/`, `lib/process-visualization/` |
| Deliverables | `lib/deliverables/` |
| Auth / Client-Consultant boundary | `lib/auth/`, `middleware.ts` |

## Definition of done (every mission)

- Consistent UI — reuses existing components/tokens.
- Mobile still works.
- Accessibility preserved.
- No duplicated components, no dead code.
- No new engine where an existing one already answers the need.
- Every new client-visible claim traces to evidence.
- `pnpm typecheck` / `pnpm lint` / `pnpm build` pass (see
  `docs/RELEASE_CHECKLIST.md`).
- Docs updated — including [`04_ARCHITECT_RECEIPT.md`](./04_ARCHITECT_RECEIPT.md) after the
  mission ships.
- Behavior unchanged unless the mission explicitly intends to change it.

## Governance alignment

This constitution codifies, and must stay consistent with, the Mission 25 governance layer:

- [`docs/PRODUCT_CONSTITUTION.md`](../../../../docs/PRODUCT_CONSTITUTION.md) — vision, Decision
  Filter, Client/Consultant boundary.
- [`docs/SECURITY_POSTURE.md`](../../../../docs/SECURITY_POSTURE.md) — write paths, credential
  policy, threat model.
- [`docs/ENGINEERING_GUIDELINES.md`](../../../../docs/ENGINEERING_GUIDELINES.md) — mission
  process, component reuse, testing posture.
- [`docs/ARCHITECTURE_DECISIONS.md`](../../../../docs/ARCHITECTURE_DECISIONS.md) — the *why*
  behind each protected system's shape.
- [`docs/OPERATIONS_RUNBOOK.md`](../../../../docs/OPERATIONS_RUNBOOK.md) /
  [`docs/RELEASE_CHECKLIST.md`](../../../../docs/RELEASE_CHECKLIST.md) — ops and release gates.

If a future mission needs a rule not covered above, add it here and cross-link the mission that
established it — do not let a second, competing "rules" doc form. See
[`05_MISSION_TEMPLATE.md`](./05_MISSION_TEMPLATE.md) for how to propose one.
