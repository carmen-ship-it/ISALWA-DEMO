# Receipt — Batch 7 / T08–T09 commitments: create, change, hand over, notify

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD: `9803b01f`. Authority: `CONTINUATION-2026-11-16.md` §12.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit + HTTP over a real Nest app + disposable Postgres + production `next build`). Not independently reviewed. Not browser-verified. Not pushed, not deployed.

Scope: the commitment desk becomes usable end to end, and the person responsible actually hears about it. Everything extends the existing commitment command service, store port, `os_commitments`, `os_internal_notifications` and the `/compromisos` desk. No parallel commitment or notification system.

## Shipped

| Requirement | What exists |
|---|---|
| **Crear compromiso** | Button on `/compromisos` opening the existing `CommitmentRecordForm` in desk mode: what was promised, optional customer (existing server typeahead), **responsible active member** (existing server typeahead, "Asignarme a mí" shortcut), date **and time**, source (team promise / reported by the customer). Cliente 360 keeps using the same form unchanged (customer fixed, owner = the member). Reuses `CreateEmployeeCommitment` / `CreateCustomerReportedCommitment`. |
| **Date semantics** | Stored as UTC, shown and typed on the Bolivia clock. A day alone now means **12:00 La Paz**, the same noon a conversation's next step uses (`commitmentDueAtFromLaPaz`, impossible days/times refused rather than rolled over). The old midnight helper stays only for coverage windows, where a day boundary is correct. |
| **Marcar cumplido** | One click, optional note kept in the history. Owner only (as before). |
| **Cambiar fecha** | New command `RescheduleCommitment` (`member_active`, owner only). Reason required. An unchanged instant is refused. The **previous deadline, the actor and the reason** are kept in the new append-only `os_commitment_changes`. |
| **Reasignar** | `ReassignCommitmentOwner` now requires a reason, an active target different from the current owner, and records previous and new owner and the actor. A customer commitment only goes to someone who can already work that customer (`TARGET_PREREQUISITE_MISSING` otherwise): handing it over grants nothing. |
| **Cancelar compromiso** | Reason now required. Kept in the history. A cancelled or fulfilled commitment accepts no further action. |
| **Who may hand over** | The current owner; a **customer manager** (`commercial.work.manage` + `commercial.org.read`, or `commercial.team.read` with the account owner a direct report, target limited to the manager or a direct report) for a customer commitment; and **workforce continuity** (`people.admin`) only for an *internal* commitment whose owner **no longer has access**. `people.admin` never moves a live owner's promises or a customer's. Same model as work reassignment (R4). `CommitmentHandoverAuthorizer` in `os-query`. |
| **Concurrency** | Every change is a conditional update on "still open and still this owner". Two simultaneous changes have one winner; the loser gets 409 `COMMITMENT_CHANGED` and leaves no history row (HTTP-proven). |
| **Deep link and history** | `/compromisos/[commitmentId]`: state, who may act, and the full change history (new date / previous date, previous / new responsible, reasons, actors, times). Hidden and missing commitments answer identically (404). |
| **Per-member action flags** | `GET /commitments` and `/commitments/:id` return `ownerAccessActive` and `actor { canFulfill, canReschedule, canCancel, canReassign, handoverAuthority }` from the same rules the commands enforce. The UI only shows what will work. |
| **Suspended member** | Loses API access (403 `ACCESS_REVOKED` on reads, notices and commands). Their open commitments appear in **"Esperan responsable"** on `/compromisos` (`GET /commitments?view=reassignment`) only for members with handover authority over each one, and leave the queue when reassigned. A commitment linked to another record (work item, order, issue, …) with no customer has **no** handover authority defined and stays owner-only: production, warehouse and purchasing responsibility is not invented. |
| **T09 notifications** | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/:id/acknowledge`: the member's own stored notices only (another member or tenant gets the same 404 as a missing id). The bell now merges these with the Attention/Work projection. Persisted kinds: `commitment_assigned` (new), `commitment_due`, `commitment_overdue`, `responsibility_changed`, plus the T07 payment notices that were stored but never shown. |
| **Read ≠ acknowledged ≠ resolved** | Three separate fields (`read_at`, new `acknowledged_at`, `resolved_at`). "Enterado" acknowledges without reading or resolving; reading does not acknowledge; only a gone source condition resolves (`source_condition_gone`). First stamp wins. |
| **Dedupe and the current owner** | One unresolved notice per recipient and reason (existing partial unique index). On reassignment the previous owner's notices resolve, the new owner gets `commitment_assigned`, and an active previous owner who did not act is told once (`responsibility_changed`). Nobody is notified of their own action. Fulfil / cancel resolve everything. A commitment notice is only shown while the member may still read the commitment. |
| **Due / overdue** | Produced **lazily** when the recipient loads their notices (idempotent), and resolved when the date moves or the work ends. See gaps. |
| **No email** | Channel is `internal`. Nothing sends email, push or WhatsApp. |

## Schema / migration (disposable only)

- `20261023000000_os_commitment_actions_notifications_t08_t09`: table `os_commitment_changes` (kinds `rescheduled` / `reassigned` / `cancelled` / `fulfilled`, shape CHECKs per kind, append-only trigger `COMMITMENT_CHANGE_APPEND_ONLY`, per-commitment index); `os_internal_notifications.acknowledged_at`; kind CHECK widened to `commitment_assigned`; recipient index.
- `EXPECTED_MIGRATION_COUNT` 43 → 44. Applied only to `isalwa_stage_a_disposable` @ 54329. Prisma client regenerated and committed.
- Also fixed: the store adapter silently dropped `ownerMemberId` on update, so a reassignment would not have persisted.

## Checks

| Check | Result |
|---|---|
| `batch7-commitments.http.test.ts` (new, real Nest + PG) | 9/9: create for another owner + deduped notice + read/ack/resolve separate + recipient-only; reschedule history + authority; cancel reasons + terminal state; owner reassign + bad targets leave no trace; manager handover + previous-owner notice; suspended owner → 403, queue per authority, continuity vs customer manager, linked-record stays owner-only; one-winner race; due/overdue lazy + resolve on reschedule + tenant isolation; customer-reported origin |
| `os-commitment` | 30/30 (reschedule, reasons, stale notices, guarded handover, terminal refusals) |
| `os-query` | 124/124 (`commitment-handover.test.ts` 9) |
| `os-contracts` | 250/250 (La Paz deadline helpers, acknowledged separate from read/resolved) |
| `os-database` (disposable PG, concurrency 1) | 315/315 |
| `os-web` | 1384/1384 (noon default, time on the Bolivia clock, history lines, link to `/compromisos/:id`, read/ack/resolved rows, `proj:` rows not stored); `tsc --noEmit` exit 0; `next build` exit 0 (`/compromisos`, `/compromisos/[commitmentId]`) |
| `os-api` | `tsc --noEmit` exit 0; full suite `--test-concurrency=1` **398/398** (was 389; `GET /notifications` classified in the inspection-read inventory) |
| Lint | Not run: `os-web` has no ESLint config in this repo. |

## Honest gaps

1. **No 48h follow-up engine.** Follow-up suggestions still exist only as contracts; nothing detects "promised, silent for 48h" or proposes a commitment. Not built.
2. **No scheduler.** Due/overdue notices appear when the owner next loads notices (app shell load), not at midnight. A member who never opens ISALWA is not reached; there is no email by design.
3. **No opt-in sound** and no browser push.
4. **Handover is limited to what was defined.** Customer commitments (account manager) and internal commitments of a member who lost access (`people.admin`). Commitments linked to work items, orders, issues or other records without a customer stay owner-only, so a suspended member's production/warehouse/purchasing commitments are **not** reassignable here until an authority is defined.
5. **A suspended member's notices are not reassigned**, only resolved when the commitment moves. Payment notices (T07) are still addressed at write time and are not re-routed.
6. **Bell count is computed once per page load**; marking read in the drawer updates the rows, not the badge until the next navigation (unchanged behavior).
7. **"Reportar problema"** untouched.
8. **Date-only conversation commitments and old rows** created before this batch at Bolivia midnight keep that instant; nothing was rewritten.
9. Not browser-verified, not independently reviewed, not pushed.
