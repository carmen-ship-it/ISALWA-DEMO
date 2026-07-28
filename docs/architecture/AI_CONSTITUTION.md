# ISALWA AI Constitution

**Status:** Binding for the PRODUCT MATURITY phase.  
**Priority:** Higher than implementation convenience.  
**Related:** `docs/design/MISSION11_*.md`, `docs/design/MISSION12_*.md`, `docs/architecture/DESIGN_INTEGRATION_PROTOCOL.md` (if present).

This repository is no longer in the exploration phase. Every future decision must optimize for **consistency**, **maintainability**, and **enterprise quality**.

---

## Core Principles

1. Never rewrite working systems.
2. Never create parallel implementations.
3. Extend before replacing.
4. Reuse before creating.
5. Every UI element belongs to the design system.
6. Business logic always wins over aesthetics.
7. Architecture stability is more valuable than visual novelty.
8. Prefer smaller pull requests over large refactors.
9. Every new feature must feel like it has always existed.
10. If unsure, preserve existing behavior.

---

## Design Language

The ISALWA visual language is **frozen**.

It is defined by:

- porcelain backgrounds
- kiln sidebar
- glaze accents
- Newsreader italic page titles
- uppercase section kickers
- 8px spacing rhythm
- soft elevation
- calm motion
- premium enterprise feel

Do not introduce another visual language.

Canonical tokens live in `packages/ui/src/tokens/tokens.css`.  
Shared primitives live in `@isalwa/ui`.

---

## Architecture Rules

### Never

- replace frameworks
- migrate stacks
- introduce competing component systems
- create duplicate primitives
- move business logic without explicit approval
- add dependencies without justification

### Always

- extend `@isalwa/ui`
- reuse shared primitives
- document architectural decisions
- prefer composition over duplication

---

## Pull Request Rules

Every PR should answer:

1. Why is this change necessary?
2. Which shared component was reused?
3. Which design token was used?
4. Does this introduce duplication?
5. Does this preserve architecture?
6. Could this have been done with fewer changes?

---

## Before Creating Any Component

Search for an existing equivalent first.

Examples:

- `MetricCard`
- `Panel`
- `ExperienceHeader`
- `Chip`
- `Button`
- `Timeline`
- `SectionHeader`
- `InsightCard`
- `DashboardGrid`
- `ActionBar`
- `SearchField`
- `PageContainer`
- `PageSection`
- `StatGroup`
- `ListRow`
- `EmptyPanel`
- `StatusPill`
- `EmptyState`

If one exists: **reuse it**. Do not build another.

---

## Definition of Done

A task is complete only when:

- UI is consistent
- Mobile still works
- Accessibility preserved
- No duplicated components
- No dead code introduced
- Documentation updated
- Types pass
- Build passes
- Existing behavior unchanged

---

## Agent note

When in conflict: **preserve behavior**, **reuse `@isalwa/ui`**, **do not invent a parallel look**. Read Mission 11/12 design docs before visual work.

---

## App-specific extensions

- **ISALWA Architect** (`apps/architect`) — a separate product that does not use `@isalwa/ui`
  (documented deployment independence). This constitution's *process* rules (reuse before
  creating, extend before replacing, one visual language, small PRs) still apply, substituting
  Architect's own local component set. See
  [`apps/architect/docs/ai/README.md`](../../apps/architect/docs/ai/README.md) for the permanent,
  Architect-scoped constitution, architecture map, and living receipt.
