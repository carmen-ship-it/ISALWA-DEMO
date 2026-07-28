# Mission 25 — Product Constitution & Security Foundation

> **Follow-on:** the permanent Architect AI context system
> ([`docs/ai/README.md`](./docs/ai/README.md)) builds directly on this mission's governance
> layer — read it first when starting a new mission; it extends, and cross-links back to, every
> doc this mission established.

**Status:** Complete (documentation only)
**App:** `apps/architect`
**Depends on:** Missions 0–18 + the Discovery Agent roadmap (P0 → F, see
[`CHATGPT_AGENT_RECEIPT.md`](./CHATGPT_AGENT_RECEIPT.md)) and the 2026-07-27 product/security
audit ([`ALVARO_CARMEN_PRODUCT_AUDIT.md`](./ALVARO_CARMEN_PRODUCT_AUDIT.md)) — this mission
codifies governance from work already shipped; it does not ship new product behavior.

## Goal

Before Missions 19–24 continue, establish **permanent governance docs** so future missions have a
single, stable place to check product intent, security posture, engineering process, past
architectural decisions, operations, and release quality — instead of re-deriving them from
scattered mission docs and audits each time.

## Hard constraints honored

| Constraint | Status |
| --- | --- |
| No runtime behavior changed | ✅ — zero `.ts`/`.tsx`/config files touched |
| No business logic changed | ✅ |
| AI / Discovery / Readiness / Consulting / Retrieval / Blueprint / Knowledge / Process / Deliverables / Executive engines untouched | ✅ — verified by `git diff` (see Verification below) |
| Documentation-only file writes | ✅ — new files under `docs/`, this file, and README additions |
| No secrets committed | ✅ — no `.env`/`.env.local` touched; env variable **names** only, never values |
| No invented runtime features | ✅ — every claim in the new docs is sourced from existing code, existing mission docs, or the existing product/security audit, not invented |

## What was established

Six permanent governance documents, created under `docs/` at the monorepo root (scoped explicitly
to `apps/architect` in their own headers, since ISALWA OS has its own separate governance
documents):

1. **[`docs/PRODUCT_CONSTITUTION.md`](../../docs/PRODUCT_CONSTITUTION.md)** — vision, mission,
   product principles, what Architect is/is not, the tagline
   ("Architect becomes more intelligent every time your company shares knowledge"), the three
   permanent client questions (What do we know? What are we trying to learn? Why does it matter?),
   the Decision Filter for future missions, and "Architect should never feel like software."
   Extends `docs/architecture/AI_CONSTITUTION.md` and `apps/architect/PRODUCT_PRINCIPLES.md`
   without contradicting either.
2. **[`docs/SECURITY_POSTURE.md`](../../docs/SECURITY_POSTURE.md)** — approved/forbidden write
   paths, credential policy, environment variable rules, service role handling, Supabase RLS
   posture, LLM API policy, deployment rules, rollback process, emergency procedures, required
   approvals, production access principles, and a threat model table — sourced directly from
   `ALVARO_CARMEN_PRODUCT_AUDIT.md`, `CHATGPT_AGENT_RECEIPT.md`, `middleware.ts`, `lib/auth/*`,
   `DEPLOYMENT.md`, and both `.env.example` files (names only, never values).
3. **[`docs/ENGINEERING_GUIDELINES.md`](../../docs/ENGINEERING_GUIDELINES.md)** — folder/naming
   conventions, the mission process, "one mission at a time," typecheck-required, no parallel
   rewrites, which existing engines to reuse, Spanish client copy rules, consultant-only logic and
   Client Mode rules, component reuse, UI principles, and current testing expectations.
4. **[`docs/ARCHITECTURE_DECISIONS.md`](../../docs/ARCHITECTURE_DECISIONS.md)** — records *why*
   for the Single Business Blueprint, evidence-first content, deterministic readiness, the AI
   provider abstraction, industry playbooks' priority-only bias, the Capability Digital Twin's
   no-second-scoring-model design, RetrievalPack's bounded/provenance-tagged context, the
   Consulting Intelligence Agent's re-read-never-re-score design, Client/Consultant Mode as a
   first-class boundary, and the Implementation Package's orchestration-only contract — each
   linked to its shipping mission doc.
5. **[`docs/OPERATIONS_RUNBOOK.md`](../../docs/OPERATIONS_RUNBOOK.md)** — local dev, Supabase,
   Vercel, production deploy, env setup, auth operational notes, troubleshooting table, recovery,
   and a daily ops checklist. Explicitly notes: do **not** advise a hard refresh — HTML is already
   `no-store`.
6. **[`docs/RELEASE_CHECKLIST.md`](../../docs/RELEASE_CHECKLIST.md)** — pre-release checklist
   covering typecheck, lint, tests, Client Mode, Consultant Mode, Spanish audit, no mock
   data/fake scores, accessibility, mobile, performance, security review, and deployment
   verification.

All six documents cross-link to each other and back to this mission file.

### README updates

- **Root [`README.md`](../../README.md)** — added a short "Governance" section pointing at the
  Architect-scoped docs above (with a note that they are Architect-specific), alongside the
  existing ISALWA OS documentation table.
- **[`apps/architect/README.md`](./README.md)** — added a "Governance" section linking the same
  six documents plus this mission file, near the existing "Docs" section.

## Deliberately out of scope

- No change to any engine, component, route, middleware, or config file.
- No new automated tests — `docs/ENGINEERING_GUIDELINES.md` and `docs/RELEASE_CHECKLIST.md`
  document the *current* (manual) testing posture honestly rather than claiming a test suite that
  doesn't exist.
- No rotation of any credential, no fix to any of the open P1/P2 security findings from the
  2026-07-27 audit — this mission documents the threat model and fix order; it does not close any
  finding. Those remain tracked, actionable follow-ups (see `docs/SECURITY_POSTURE.md` §14).
- No change to `apps/web` / `apps/api` (ISALWA OS) governance — that product already has its own
  `docs/product/PRODUCT_PRINCIPLES.md`, `docs/architecture/ENGINEERING_MASTER_PLAN.md`, and
  `SECURITY.md`; this mission's docs are explicitly scoped to `apps/architect` and say so in their
  headers.

## Verification

```bash
git diff --stat main   # (or the relevant base) before committing
```

Confirmed: every changed/added path is one of `docs/PRODUCT_CONSTITUTION.md`,
`docs/SECURITY_POSTURE.md`, `docs/ENGINEERING_GUIDELINES.md`, `docs/ARCHITECTURE_DECISIONS.md`,
`docs/OPERATIONS_RUNBOOK.md`, `docs/RELEASE_CHECKLIST.md`, `apps/architect/MISSION25.md`,
`README.md`, or `apps/architect/README.md`. No `.ts`, `.tsx`, `.sql`, `.json`, or `.env*` file
appears in the diff.

## Definition of Done

- [x] All six required documents created at the exact requested paths.
- [x] `apps/architect/MISSION25.md` written (this file).
- [x] All six docs cross-link to each other.
- [x] Root and Architect READMEs updated with a "Governance" section.
- [x] Zero runtime/business-logic files changed — verified via `git diff --stat`.
- [x] No secret values written anywhere — only variable names and policy descriptions.
- [x] Commit created on `main` with message `docs: Mission 25 — Product Constitution & Security Foundation` and pushed.
