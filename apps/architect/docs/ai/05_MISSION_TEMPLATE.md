# 05 — Mission Doc Template

**Before writing this doc — or any code — read
[`01_ARCHITECT_CONTEXT.md`](./01_ARCHITECT_CONTEXT.md),
[`02_ARCHITECT_CONSTITUTION.md`](./02_ARCHITECT_CONSTITUTION.md), and
[`04_ARCHITECT_RECEIPT.md`](./04_ARCHITECT_RECEIPT.md).** They answer, respectively: what
Architect is, what rules never bend, and what already exists so you don't rebuild it.

Copy the structure below into a new `apps/architect/MISSION{N}.md` (or `MISSION{N}_{SLUG}.md` for
a multi-word title, matching existing convention). Keep prose concrete and evidence-based — this
doc will itself become evidence future agents read, per the Constitution's "no invented evidence"
rule extended to documentation.

---

```markdown
# Mission {N} — {Short Title}

**Status:** {Complete | In progress | Scaffolded, not live}
**App:** `apps/architect`
**Scope:** {One or two sentences: what this mission does and, importantly, does NOT do.}
**Plan:** {Which roadmap/phase this belongs to, if any.}
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md`,
[`docs/ai/02_ARCHITECT_CONSTITUTION.md`](./02_ARCHITECT_CONSTITUTION.md).
**Follows:** {Prior mission(s) this builds on, with commit hashes.}
**Extends (unchanged):** {Exact files/functions this mission reuses as-is — prove you read them
before writing new code, per Engineering Guidelines' "read before writing."}

## Mission Objective

One paragraph: what business/product problem this solves, and which of the three permanent
client questions (What do we know? / What are we trying to learn? / Why does it matter?) it
answers. If it can't answer one of them, per the Constitution, it shouldn't ship.

## Protected Systems

List every protected system (from
[`02_ARCHITECT_CONSTITUTION.md`](./02_ARCHITECT_CONSTITUTION.md)) this mission touches or is
adjacent to, and state explicitly that it was **extended, not replaced**.

## Existing Engines To Use

Name the exact functions/files this mission composes (e.g. `runConsultingIntelligenceCycle`,
`buildRetrievalPackSync`, `explainWorkspaceRecommendations`). If you searched for an existing
engine/component and didn't find one, say so explicitly and explain why a new one is justified —
this is the artifact that proves the "reuse before creating" rule was actually followed, not just
asserted.

## Implementation Strategy

Concrete files added/changed, in the order they'd be built. Call out any new client-visible
Spanish copy (must be generated in-engine, not via i18n) and any new engine (should be none, per
the Constitution, unless explicitly justified above).

## Definition of Done

- [ ] Every claim/number shown to a client traces to evidence.
- [ ] No new scoring model / parallel engine (or explicitly justified above).
- [ ] Client Mode / Consultant Mode boundary respected.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass.
- [ ] Mobile + accessibility preserved.
- [ ] No duplicated components.
- [ ] {Mission-specific checks.}

## Verification

```bash
git diff --stat main   # confirm the touched-file list matches what this doc claims
pnpm --filter @isalwa/architect typecheck
pnpm --filter @isalwa/architect lint
pnpm --filter @isalwa/architect build
```

## Deliberately out of scope

State what this mission chose *not* to do and why — this is what lets the next agent tell the
difference between "not built yet" and "considered and rejected."

## Receipt Update

After this mission ships, add a row to
[`04_ARCHITECT_RECEIPT.md`](./04_ARCHITECT_RECEIPT.md) "Completed missions" with the real commit
hash (verify via `git log --oneline`, never guess), and move anything it resolved out of "Known
gaps" / "Known WIP."
```

---

## Notes on using this template

- Don't duplicate the "what is Architect" essay here or in the mission doc itself — link
  [`01_ARCHITECT_CONTEXT.md`](./01_ARCHITECT_CONTEXT.md) instead. Every mission doc used to open
  with a paragraphs-long restatement of the product principles; that duplication is exactly what
  this AI context system exists to remove.
- Work **one mission at a time** unless explicitly told otherwise (per
  `.cursor/rules/architect-product-principles.mdc`).
- If a mission is purely documentation/governance (like Mission 25, or the mission that added this
  system), say so in **Status** and keep the "Hard constraints honored" framing that mission used
  — a docs-only mission has a stricter, not looser, bar for "did you actually touch zero product
  code."
