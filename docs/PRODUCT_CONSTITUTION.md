# ISALWA Architect — Product Constitution

**Status:** Permanent north star. Binding for every future mission, screen, and feature.
**Scope:** `apps/architect` only. ISALWA OS (`apps/web`, `apps/api`) has its own product
identity — see [`docs/product/PRODUCT_BLUEPRINT.md`](./product/PRODUCT_BLUEPRINT.md) and
[`docs/product/PRODUCT_PRINCIPLES.md`](./product/PRODUCT_PRINCIPLES.md) for that product.
**Outranks:** individual `MISSION*.md` prompts, implementation convenience, and "we could also…"
ideas. If a mission conflicts with this document, change the mission.
**Extends, does not replace:** [`docs/architecture/AI_CONSTITUTION.md`](./architecture/AI_CONSTITUTION.md)
(monorepo-wide design/architecture law) and [`apps/architect/PRODUCT_PRINCIPLES.md`](../apps/architect/PRODUCT_PRINCIPLES.md)
(the canonical, do-not-remove product principles file for Architect). Where this document and
`apps/architect/PRODUCT_PRINCIPLES.md` overlap, they must agree; this document exists to make the
governance layer complete (security, engineering process, ADRs, ops, release) rather than to
restate or override product principles that already have a canonical home.

---

## Vision

In five years, ISALWA Architect is the world's best business discovery and software planning
platform. Owners and operators open it and feel understood — not surveyed. Consultants open it
and feel armed — not replaced. Engineers open it and receive clarity — not chaos.

The market recognizes Architect as the standard first step before custom software: the place
where companies get a living blueprint of how they work, what is broken, what to build, and why.

Not the loudest AI product. The calmest, most precise one.

## Mission

**Before writing software… understand the business.**

Everything else — Blueprint, Solution Architecture, Process Engine, Deliverables, the future
Implementation Package — is downstream of that sentence.

## Tagline

> **"Architect becomes more intelligent every time your company shares knowledge."**

This is not marketing copy. It is a test. Every future feature, screen, or mission must make this
sentence *more true* — the product must visibly compound what it knows as evidence accumulates
(meetings, documents, answers, corrections). A feature that does not increase what Architect
understands, or that fakes the appearance of understanding, does not belong.

## Architect should never feel like software

Architect should feel like a **senior consulting team that happens to live inside software** —
not a form, not a dashboard, not a chatbot. Concretely:

- It listens before it advises. It asks the fewest questions that maximize information gain.
- It explains itself. Every recommendation carries its evidence and its confidence.
- It remembers. Nothing is asked twice; nothing already known is re-derived from scratch.
- It is calm. One clear answer per screen, not ten competing panels.
- It never performs certainty it hasn't earned. An unmeasured area says "not measured," never a
  guessed number.

## The three permanent client questions

Every future screen, panel, or deliverable in Architect must be traceable to one (or more) of
these three questions. If a proposed screen cannot answer any of them, it does not ship.

1. **What do we know?** — evidence gathered so far: facts, documents, answers, knowledge.
2. **What are we trying to learn?** — the open questions, gaps, and next-highest-value inquiry.
3. **Why does it matter?** — the business consequence: risk, opportunity, cost of not knowing.

A screen that shows data without answering one of these three is decoration, not consulting.

## Product Principles

The canonical, binding list lives in [`apps/architect/PRODUCT_PRINCIPLES.md`](../apps/architect/PRODUCT_PRINCIPLES.md)
(do not duplicate or fork it here). In summary, for quick reference:

1. Architect is **not** software — it is consulting intelligence. Code/software generation is one
   future *output*, never the organizing idea.
2. Every feature must improve business understanding, or it belongs in another product.
3. Everything derives from evidence. No fake scores, no guessed maturity, no invented workflows,
   no hallucinated recommendations.
4. Architect never asks unnecessary questions — every question maximizes information gain.
5. The company owns **one** evolving Business Blueprint. Reports, PRDs, roadmaps, process maps,
   architecture, backlogs, deliverables, and software all derive from it. No parallel realities.
6. Multi-tenant first — every company is isolated, namespaced, permission-aware.
7. White-label by design — language, brand, terminology, and navigation are configurable without
   code, eventually.
8. Continuous consulting — Architect never "finishes." It becomes the institutional memory of the
   company.
9. Human-first — Architect assists judgment, explains recommendations, always shows evidence and
   confidence. It never silently decides for the human.
10. Architect is the front door; other products (future Command Center, CRM, ERP, HR, Finance,
    AI Agents, ISALWA OS, etc.) execute what Architect understands.

## What Architect IS

- A business architecture and discovery platform that sits with a company *before* a line of
  production software is written.
- A living, evidence-derived model of how a company actually operates (people, process,
  information flow, systems, pain, opportunity).
- A senior-consultant-grade interview and reasoning engine that produces a Business Blueprint,
  Solution Architecture, Process Model, and Deliverables package — all deterministic, all
  traceable to evidence.
- Continuous institutional memory: every meeting, document, and correction makes the model richer,
  never resets it.

## What Architect IS NOT

- Not a chatbot.
- Not a CRM.
- Not a workflow editor or no-code/low-code builder.
- Not a generic project management tool.
- Not a generic AI assistant with no business model behind it.
- Not a form that pretends to be consulting.
- Not a place to "generate apps" without first understanding the company.
- Not an ERP replacement, a Slack/Teams replacement, a ChatGPT clone, a generic BI tool, a ticket
  tracker, or a document dump with AI on top.

If a feature would make Architect feel like any of the above, it does not belong — regardless of
how impressive it is in isolation.

## Decision Filter for future missions

Before proposing, scoping, or building any mission, feature, or redesign, ask:

> **Does this make Architect better at understanding businesses — and does it make the tagline
> ("Architect becomes more intelligent every time your company shares knowledge") more true?**

- If **no** → don't build it. It only makes the product busier, prettier without insight, or more
  "AI" without evidence.
- If **yes**, but it conflicts with a Never/Always rule in the [AI Constitution](./architecture/AI_CONSTITUTION.md)
  (parallel implementations, duplicated primitives, rewritten working systems) → redesign the
  approach, not the rule.
- If **yes** and compatible → build it as the smallest change that composes existing engines
  (Readiness, Blueprint, Consulting, Solution, Processes, Deliverables, Knowledge, Retrieval,
  Capability Twin) rather than a parallel one. See
  [`docs/ENGINEERING_GUIDELINES.md`](./ENGINEERING_GUIDELINES.md) for the mission process and
  [`docs/ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) for why the existing engines are
  shaped the way they are.

Additional filters that apply specifically inside `apps/architect`:

- **Evidence over opinions.** Recommendations earn their place. Speculation does not.
- **Understand before recommending.** Diagnosis precedes prescription.
- **Never overwhelm the client.** One screen that tells the truth beats ten competing panels.
- **Every recommendation must trace back to evidence.** If it cannot be traced, it cannot be
  shown.
- **Client Mode and Consultant Mode are a hard boundary of intent, not decoration.** A client
  (`role: "client"`) never sees internal consultant reasoning, raw engine ids, or diagnostic
  tabs (`assessment`, `architecture`, `processes`) — see
  [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) for the current enforcement boundary and its
  known gaps.

## Alignment with the frozen design language

Architect's product identity (consulting intelligence, evidence-first, Spanish client copy) is
independent from ISALWA OS's visual brand (porcelain / kiln / glaze / copper, `@isalwa/ui`).
Architect currently ships its own local component set (`components/ui/*`, shadcn/ui patterns) and
does not import `@isalwa/ui` primitives, consistent with its documented deployment independence
(see [`apps/architect/DEPLOYMENT.md`](../apps/architect/DEPLOYMENT.md), "Independence from ISALWA
OS"). This document does not change that boundary. Where Architect and ISALWA OS *do* share law,
it is the process-level rules in the [AI Constitution](./architecture/AI_CONSTITUTION.md) — reuse
before creating, extend before replacing, one visual language per product, small PRs, preserve
behavior when unsure — which apply to Architect's own local component library exactly as written,
substituting Architect's own primitives (`Panel`, `Card`, `MetricCard`-equivalents, etc.) for
`@isalwa/ui` ones. Search Architect's existing `components/` tree before adding a new one; see
[`docs/ENGINEERING_GUIDELINES.md`](./ENGINEERING_GUIDELINES.md#component-reuse).

## How to use this document

Read this before proposing a mission, a feature, or a redesign inside `apps/architect`. If the
proposal fails the Decision Filter, stop. If it passes, build with the Product Principles, the AI
Constitution, and the security posture intact.

This document outranks convenience. It outranks novelty. It outranks "we could also…".

**Understand the business. Then write software.**

---

## Related governance documents

- [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) — write paths, credentials, threat model
- [`docs/ENGINEERING_GUIDELINES.md`](./ENGINEERING_GUIDELINES.md) — how missions are built
- [`docs/ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) — why the engines are shaped this way
- [`docs/OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) — running and operating the app
- [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) — what to verify before every release
- [`apps/architect/MISSION25.md`](../apps/architect/MISSION25.md) — the mission that established this governance layer
