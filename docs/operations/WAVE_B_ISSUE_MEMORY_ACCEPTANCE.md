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
| CURRENT RUNTIME SHA | **`9fbafb7ffff5e4cc7eba0840567487be7aa4a8b7`** — **VERIFIED** |
| Implementation | **IMPLEMENTED** |
| Automated tests | **TESTED** (os-issue lifecycle + adversarial; commitment; web issue/palette/feedback suites at commit time) |
| Integrated | **YES** (API adapters + os-web surfaces on same SHA) |
| Migration `20260919120000_os_issue_memory` | **APPLIED** (expected migration count **30**) |
| DEPLOYED | **PASS** — WEB `dep-dal2aldg1s2s73e065h0`, API `dep-dal2allg1s2s73e066r0` |
| HOSTED | **PASS** — https://os-web-staging.onrender.com |
| BROWSER-VERIFIED | **PASS** — Independent verifier 2026-09-16T05:24:54Z (AGENT 9) |
| USER-ACCEPTED | **PENDING** |
| AI | **OFF** (`modelCalled: false`; no OpenAI SDK / embeddings / AI keys / `AI_ENABLED`) |
| REAL tenant after migration | **UNCHANGED** (partyCount=18, memberCount=3) |
| Overall Wave B hosted close | **CONDITIONAL PASS** (19/20 checks pass, 1 conditional) |

**Independent verifier receipt:** `docs/operations/wave-b-issue-memory-2026-09-16/independent-verifier-wave-b.md`

---

## Feature matrix

Proof vocabulary: keep `IMPLEMENTED` → `TESTED` → `INTEGRATED` → `DEPLOYED` → `HOSTED` → `BROWSER-VERIFIED` → `USER-ACCEPTED` separate. Never collapse.

| Capability | Code | Tests | Integrated | Deployed | Hosted | BV | UA | Notes |
|---|---|---|---|---|---|---|---|---|
| **Issue aggregate** (`OsIssue` + lifecycle commands) | IMPLEMENTED | TESTED | YES | PASS | PASS | PASS | — | `@isalwa/os-issue`; `/incidencias` |
| **Reportar problema** (universal) | IMPLEMENTED | TESTED | YES | PASS | PASS | PASS | — | Drawer + `/incidencias/reportar` |
| **Palette Reportar problema** | IMPLEMENTED | TESTED | YES | PASS | PASS | — | — | ⌘K → `/incidencias/reportar` |
| **Resolution Memory / precedents** | IMPLEMENTED | TESTED | YES | PASS | PASS | PASS | — | Cycles + resolve/reopen history preserved |
| **Commitment API** (create/fulfill/cancel) | IMPLEMENTED | TESTED | YES | PASS | PASS | — | — | Existing `OsCommitment`; no second aggregate |
| **Product Feedback** (≠ Issue) | IMPLEMENTED | TESTED | YES | PASS | PASS | — | — | `OsProductFeedback`; never auto-creates Issue |
| **Organizational memory evidence** | IMPLEMENTED | TESTED | YES | PASS | PASS | — | — | `MemoryEvidenceService` + `GET /v1/memory/evidence` |
| **AI execution** | INTENTIONALLY DEFERRED | N/A | N/A | N/A | N/A | N/A | N/A | **AI OFF** (verified) |
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

### Era 1 — 2026-09-16T05:24:54Z (AGENT 9)

**SHA:** `9fbafb7ffff5e4cc7eba0840567487be7aa4a8b7`  
**Deploy IDs:** WEB `dep-dal2aldg1s2s73e065h0`, API `dep-dal2allg1s2s73e066r0`  
**Verifier:** AGENT 9 (independent — did not implement product)  
**Result:** **PASS** (19/20 PASS, 1 CONDITIONAL)

Browser-verified checks:
- ✅ Reportar problema hosted submit + issue visible
- ✅ Reporter cannot triage (403 PERMISSION_DENIED)
- ✅ Manager triage/assign (201)
- ✅ Journal possible cause not confirmed until explicit ConfirmIssueCause
- ✅ Work complete does not auto-resolve issue
- ✅ Resolve/reopen history preserved (resolvedAt, reopenedAt timestamps)
- ✅ Cross-tenant denied (404)
- ✅ AI OFF (no openai/AI_ENABLED)
- ✅ Wave A coverage categories present (12 categories including owned_issues, open_commitments)
- ✅ REAL unchanged (18 parties, 3 members)
- ✅ Mobile 390 report path

CONDITIONAL: CompleteWorkItem command shape (400) — invariant test still passed

Receipt: `docs/operations/wave-b-issue-memory-2026-09-16/independent-verifier-wave-b.md`

---

## Exact next action

1. ~~Confirm hosted WEB + API deploy IDs match candidate SHA~~ **DONE**
2. ~~Run independent hosted verifier on SYNTH~~ **DONE** (CONDITIONAL PASS)
3. Await USER-ACCEPTED for full Wave B close
4. Address API routing quirk (`/v1/v1/issues`) in follow-up
