# WAVE B — Issue / Organizational Memory Acceptance

**Date:** 2026-09-16  
**Wave:** B — Issue / Resolution Memory + Commitment productization + Reportar problema + Product Feedback + AI-ready evidence (AI OFF)  
**Worktree:** `wave2-remediation-integrate`  
**Hosted URL:** https://os-web-staging.onrender.com  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL org:** `01M2DV9F0V5DXS4G89AKF4D5SR` — **unchanged** after migration (no REAL mutations this wave)  
**Model:** `docs/product/ISALWA_ORGANIZATIONAL_MEMORY_MODEL.md`  
**Capability map:** `docs/product/ISALWA_COMPANY_OS_CAPABILITY_MAP.md`

---

## CURRENT VERDICT

| Gate | State |
|------|--------|
| CURRENT RUNTIME SHA (candidate) | **`b28e9fcafc339575ac6c667d2bbc2b1527e5db4d`** — **pending deploy confirmation** |
| Implementation | **IMPLEMENTED** |
| Automated tests | **TESTED** (os-issue lifecycle + adversarial; commitment; web issue/palette/feedback suites at commit time) |
| Integrated | **YES** (API adapters + os-web surfaces on same SHA) |
| Migration `20260919120000_os_issue_memory` | **APPLIED** (expected migration count **30**) |
| DEPLOYED | **PENDING** — deploy IDs not confirmed against candidate SHA |
| HOSTED | **PENDING / IN PROGRESS** — do **not** invent PASS |
| BROWSER-VERIFIED | **UNPROVEN** — independent verifier not run |
| USER-ACCEPTED | **NO** |
| AI | **OFF** (`modelCalled: false`; no OpenAI SDK / embeddings / AI keys / `AI_ENABLED`) |
| REAL tenant after migration | **UNCHANGED** |
| Overall Wave B hosted close | **NOT CLOSED** (await deploy confirm + verifier) |

Do **not** claim HOSTED PASS or BROWSER-VERIFIED PASS until an independent verifier receipt exists for this SHA (or a successor explicitly pinned here).

---

## Feature matrix

Proof vocabulary: keep `IMPLEMENTED` → `TESTED` → `INTEGRATED` → `DEPLOYED` → `HOSTED` → `BROWSER-VERIFIED` → `USER-ACCEPTED` separate. Never collapse.

| Capability | Code | Tests | Integrated | Deployed | Hosted | BV | UA | Notes |
|---|---|---|---|---|---|---|---|---|
| **Issue aggregate** (`OsIssue` + lifecycle commands) | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | `@isalwa/os-issue`; `/incidencias` |
| **Reportar problema** (universal) | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | Drawer + `/incidencias/reportar` |
| **Palette Reportar problema** | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | ⌘K → `/incidencias/reportar` |
| **Resolution Memory / precedents** | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | Cycles + `GET /v1/issues/:id/precedents` |
| **Commitment API** (create/fulfill/cancel) | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | Existing `OsCommitment`; no second aggregate |
| **Product Feedback** (≠ Issue) | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | `OsProductFeedback`; never auto-creates Issue |
| **Organizational memory evidence** | IMPLEMENTED | TESTED | YES | PENDING | PENDING | UNPROVEN | NO | `MemoryEvidenceService` + `GET /v1/memory/evidence` |
| **AI execution** | INTENTIONALLY DEFERRED | N/A | N/A | N/A | N/A | N/A | N/A | **AI OFF** |
| Commitment → Attention overdue type | NOT THIS WAVE | — | — | — | — | — | — | Wave C / Attention freeze |
| SOP / Architect deep link | NOT THIS WAVE | — | — | — | — | — | — | Deferred |

---

## Authority matrix summary

Canonical structured source:

**`packages/os-contracts/src/issue-authority-matrix.ts`** (`ISSUE_AUTHORITY_MATRIX`)

| Command | Required scope / rule |
|---------|------------------------|
| `ReportIssue` | `member_active` |
| `AddIssueJournalEntry` | `member_active` |
| `LinkIssueWork` | `member_active` |
| `RecordIssueOutcome` | `member_active` |
| `StartIssueProgress` | owner **or** `issue.manage` |
| `ResolveIssue` | owner **or** `issue.manage` |
| `TriageIssue` | `issue.manage` |
| `AssignIssueOwner` | `issue.manage` |
| `ConfirmIssueCause` | `issue.manage` |
| `CloseIssue` | `issue.manage` |
| `ReopenIssue` | `issue.manage` |
| `RelateIssues` | `issue.manage` |

Related scopes (operations catalog):

| Scope | Use |
|-------|-----|
| `issue.manage` | Govern Issue triage/assign/confirm/close/relate |
| `product.feedback.review` | List/review product feedback (`GET /v1/product-feedback`) |
| `people.admin` / `system.admin` | **Do not** imply `issue.manage` |

Boundaries enforced in tests: possible cause ≠ confirmed cause; work complete ≠ issue resolved; reopen preserves resolution cycles; cross-tenant deny.

---

## FOUNDATION GAPS / deferred business decisions

| ID | Item | Status |
|----|------|--------|
| BD-severity | **Issue severity / priority thresholds** | **DEFERRED** — Issue ships **without mandatory severity**; do not invent policy. Return later for thresholds. |
| BD-follow-up-vs-commitment | When employees must record Commitment vs Registrar seguimiento | Still open (coaching + UX) |
| FG-attention-commitment | Commitment overdue → Attention type | Not invented; Attention freeze = Wave C |
| FG-coord-write | Coordination hosted write | Still UNPROVEN (pre-Wave-B gap) |
| FG-quote-order-reassign | Quote/Order owner reassignment | FOUNDATION_GAP (Wave A; fail-closed) |
| FG-coverage-resolve | Customer coverage Grant/Revoke/Replace | FOUNDATION_GAP (Wave A) |
| FG-hosted-bv | Wave B independent hosted verifier | **PENDING** — deploy not confirmed |

---

## Prompt concept → actual primitive mapping

| Prompt concept | Actual ISALWA primitive |
|----------------|-------------------------|
| Business Issue / incidencia | `OsIssue` + `@isalwa/os-issue` (`IssueCommandService`) |
| Issue references | `OsIssueReference` |
| Issue journal / investigation | `OsIssueJournalEntry` (`possible_cause` ≠ confirmed) |
| Confirmed cause | Issue fields + `ConfirmIssueCause` |
| Linked work / action | `OsIssueWorkLink` → existing `OsWorkItem` (**no** IssueTask) |
| Related / recurrence | `OsIssueRelation` |
| Resolution cycle / reopen history | `OsIssueResolutionCycle` (append-only) |
| Ownership history | `OsIssueOwnershipHistory` |
| Events / audit | Existing `OsBusinessEvent` + `OsAuditLog` via command path |
| Commitment (promise memory) | Existing `OsCommitment` + `@isalwa/os-commitment` (productized API) |
| Product Feedback | `OsProductFeedback` (**separate** from Issue) |
| Organizational memory evidence | `MemoryEvidenceService` / `GET /v1/memory/evidence` |
| Reportar problema UX | `/incidencias/reportar` + `ReportIssueDrawer` + palette action |
| Antecedentes relacionados | Deterministic precedents API (no AI label) |
| AI summarize / suggest | **Not wired** — substrate only; **AI OFF** |

---

## Migration / tenants / AI

| Item | Exact |
|------|--------|
| Migration folder | `packages/os-database/prisma/migrations/20260919120000_os_issue_memory` |
| Applied | **YES** (count gate **30**) |
| Additive only | CREATE tables for issues, refs, journal, work links, relations, resolution cycles, ownership history, product feedback |
| REAL tenant `01M2DV9F0V5DXS4G89AKF4D5SR` | **UNCHANGED** (no REAL people/data mutations this wave) |
| SYNTH fixture actors | `staging-wave-b-issue-memory.ts` — reporter / manager / work (SYNTH-only) |
| AI | **OFF** |

---

## Surfaces & API (code truth)

| Surface | Path / entry |
|---------|----------------|
| Issue list | `/incidencias` |
| Issue detail | `/incidencias/[issueId]` |
| Report | `/incidencias/reportar`, shell trigger, palette |
| Cliente 360 | `Cliente360Issues` |
| Product feedback | `ProductFeedbackMenu` |
| Issues API | `GET /v1/issues`, `GET /v1/issues/:id`, `GET /v1/issues/:id/precedents` + Issue commands |
| Commitments API | Commitments controller + command service |
| Feedback API | `GET /v1/product-feedback` + `SubmitProductFeedback` |
| Memory API | `GET /v1/memory/evidence` |
| Termination impact | Adds `owned_issues` + `open_commitments` categories |

---

## HISTORICAL

Wave B first pass — no prior hosted verifier eras for Issue Memory.

*(Empty until deploy + independent verifier receipts are filed.)*

---

## Exact next action

1. Confirm hosted WEB + API deploy IDs match candidate SHA `b28e9fc…` (or pin successor SHA here).  
2. Run independent hosted verifier on SYNTH (Issue report → triage → resolve; Commitment wire; Feedback ≠ Issue; memory evidence authz; REAL unchanged; AI OFF).  
3. Only then update CURRENT VERDICT HOSTED / BV columns — never invent PASS.
