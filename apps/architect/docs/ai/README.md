# Architect AI Context System

**Purpose:** the permanent, single entrypoint for any AI agent (or human) picking up work on
`apps/architect` — so a fresh session never has to re-derive product intent, engineering law, or
current state from dozens of scattered mission docs.

**Scope:** `apps/architect` only. ISALWA OS (`apps/web`, `apps/api`) has its own governance —
see [`docs/product/PRODUCT_PRINCIPLES.md`](../../../../docs/product/PRODUCT_PRINCIPLES.md).

## Read in this order

| # | Doc | Answers |
| --- | --- | --- |
| 01 | [`01_ARCHITECT_CONTEXT.md`](./01_ARCHITECT_CONTEXT.md) | What is Architect? What is it not? How do the systems connect? |
| 02 | [`02_ARCHITECT_CONSTITUTION.md`](./02_ARCHITECT_CONSTITUTION.md) | What are the permanent engineering rules? What must never break? |
| 03 | [`03_ARCHITECT_ARCHITECTURE.md`](./03_ARCHITECT_ARCHITECTURE.md) | Where does the code live? How does data flow through it? |
| 04 | [`04_ARCHITECT_RECEIPT.md`](./04_ARCHITECT_RECEIPT.md) | What has already shipped? What's the current phase? What's WIP? |
| 05 | [`05_MISSION_TEMPLATE.md`](./05_MISSION_TEMPLATE.md) | How do I structure a new mission doc? |

## The rule for every future mission

> **Read 01, 02, and 04 before writing a single line. Implement Mission XX. Update the receipt (04) when done.**

01 and 02 rarely change — they are the product's permanent identity and law. 04 changes after
**every** mission; it is the living state of the product. 03 changes only when the architecture
itself changes (new top-level `lib/` module, new lifecycle). 05 is the template new mission docs
should follow, so agents (and humans) stop re-deriving structure from scratch each time.

**ChatGPT / external agent paste:** use
[`CHATGPT_AGENT_RECEIPT.md`](../../CHATGPT_AGENT_RECEIPT.md) — the full, self-contained
hand-off (keeps pace with 04; do not invent a third receipt).

## Relationship to monorepo-wide governance

This system **extends**, and never contradicts, the monorepo-wide docs:

- [`docs/PRODUCT_CONSTITUTION.md`](../../../../docs/PRODUCT_CONSTITUTION.md) — Architect-scoped
  vision/mission/principles, established by [`MISSION25.md`](../../MISSION25.md).
- [`docs/architecture/AI_CONSTITUTION.md`](../../../../docs/architecture/AI_CONSTITUTION.md) —
  monorepo-wide engineering law (reuse before creating, extend before replacing, one visual
  language, small PRs).
- [`docs/SECURITY_POSTURE.md`](../../../../docs/SECURITY_POSTURE.md),
  [`docs/ENGINEERING_GUIDELINES.md`](../../../../docs/ENGINEERING_GUIDELINES.md),
  [`docs/ARCHITECTURE_DECISIONS.md`](../../../../docs/ARCHITECTURE_DECISIONS.md),
  [`docs/OPERATIONS_RUNBOOK.md`](../../../../docs/OPERATIONS_RUNBOOK.md),
  [`docs/RELEASE_CHECKLIST.md`](../../../../docs/RELEASE_CHECKLIST.md) — the rest of the Mission 25
  governance layer (security, process, ADRs, ops, release).

Where this system and Mission 25's docs overlap (constitution, principles), they must agree. This
system exists to be the **fast path into context** for an agent starting a session; Mission 25's
docs remain the deeper reference for security/process/ADR detail.

## Relationship to individual mission docs

`apps/architect/MISSION*.md` and the many feature docs (`*.md` at the `apps/architect/` root)
remain the historical record of *what shipped and why*, in chronological detail. They are not
superseded by this system — they are the evidence this system's [receipt](./04_ARCHITECT_RECEIPT.md)
summarizes. Long "what is Architect" preambles that used to open many of those docs have been
trimmed to a short pointer back to [`01_ARCHITECT_CONTEXT.md`](./01_ARCHITECT_CONTEXT.md); the
mission-specific content itself was left untouched.
