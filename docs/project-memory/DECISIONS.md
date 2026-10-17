# DECISIONS — register of consequential decisions (pointer, not authority)

**This file does not decide anything.** It indexes where each decision is recorded, who made it, its original wording (short exact excerpt) and what superseded it. The authoritative records are:

- Plan: `docs/product/COMMERCIAL_RELEASE_V2.md` + `COMMERCIAL_INTERACTIONS_A1.md` + `COMMERCIAL_SELF_SERVICE_A2.md`
- Decision matrix: `docs/operations/commercial-release/REUSE_MAP.md` §8 (new vs previous), §11 (demo artifacts), §12 (authoritative commercial authority matrix), §13 (consolidated engineering decisions)
- Review decisions and reserved owner decisions: `docs/operations/commercial-release/REVIEW_RECONCILIATION.md`
- Checkpoint: `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md`
- Release-branch ADR: `docs/adr/0003-v1-delivery-quantities-and-commercial-approvals.md`

If this register and an authoritative record disagree, the authoritative record wins and this register is corrected.

**Speakers.**
- **Carmen** = owner.
- **Engineering counterpart (relayed)** = text Carmen pasted from her engineering counterpart.
- **Isa / Álvaro (relayed)** = customer facts relayed by Carmen. These are customer evidence, not final policy unless authority is proven (takeover `01`).
- **Agent** = a Cursor agent proposal. It is never a decision until accepted.

**Locators.**
- `V#L` = `history/2026-10-instructions-verbatim.md`, chat `6e146cf5`, transcript line L.
- `O##` = takeover `originals/O##`.
- `LIVE` = `history/2026-10-live-only-messages.md`.

## A. Customer evidence (relayed facts; not agent proposals)

| Date | Speaker | Fact (summary unless quoted) | Locator | Status / contradiction |
|---|---|---|---|---|
| 2026-09-14 | Isa (relayed) | 8 verbatim answers: advisors register clients; jefe comercial sees the whole team without technical permissions; gerente general administers; advisors convert quotes to orders; special discounts outside the list need jefe comercial or gerencia; one owner per client, others may attend | `O07` (verbatim); recovery supplement `01_RECOVERED_TEXT.md` | **Contradiction kept open:** Isa said all advisors convert; code and the 19:30 decision allow conversion only with coverage that includes conversion and an independently held permission (B5). The questions behind the 8 answers are missing. |
| 2026-09-14 | Isa (relayed) | A covering advisor may "modificar y continuar con todo el proceso"; payment is not universally required before a pedido | `O08` | Bounded by B5 (conversion) and A2 coverage actions |
| 2026-09-14 | Isa (relayed) | Two dates: customer-committed date and internal production target | `O09` | Supersedes the earlier "do not invent a production date" |
| 2026-07-28 → 08-23 | Álvaro (relayed) | Completed the first questionnaire; "answered many questions"; wants to start with the commercial department | recovery supplement `01`, `R*` | No verbatim business answers recovered; the Architect export is pending |

## B. Owner and engineering decisions

| # | Date (UTC-4) | Speaker | Decision (exact excerpt or labelled summary) | Recorded in (authority) | Locator | Supersedes / superseded by |
|---|---|---|---|---|---|---|
| B1 | 2026-09-30 | Carmen | Delivery quantities, commercial approvals, V1 operational scope (summary) | `docs/adr/0003-v1-delivery-quantities-and-commercial-approvals.md` | `O21` | The scope part is superseded by B3. The product rules (quantities, approvals) still stand. |
| B2 | 2026-10-01 | Engineering | Immutable checkpoint `32810573…`, undeployed; repairs continue on `ct3/v1-repairs` (summary) | `docs/reviews/V1_REPAIR_LEDGER.md` | `O22` | In force: never move or deploy it |
| B3 | 2026-10-16 14:29 | Carmen | Commercial-first priority (summary) | takeover `07_COMMERCIAL_FIRST_MAPPING.md` | `O23` | Supersedes B1's scope. **Map: held 09-30 (`O21`), back in scope 10-16 (`O23`)** |
| B4 | 2026-10-16 16:43 | Carmen | "I authorize local implementation, testing, and release preparation T00–T20 under the document's boundaries … One active writer and one task at a time." | `COMMERCIAL_RELEASE_V2.md` (copy of the brief) | V#2127 | The single-writer part is amended by B11 |
| B5 | 2026-10-16 19:30 | Engineering counterpart (relayed) | "Replace the blanket 'coverage never converts' rule. An advisor may convert for a covered account only when: coverage is currently active … its delegated actions explicitly include conversion; the advisor independently holds the required conversion permission … Coverage alone never grants conversion permission." | `REUSE_MAP.md` §12.1 | V#2923 | Supersedes BR-CNV-02 "coverage never converts". Narrower than Isa's `O07` #4 (kept open) |
| B6 | 2026-10-16 17:58 / 18:04 | Carmen | Two demo artifacts: remove the sample-data demo view; keep and update the Journey/walkthrough tab | `REUSE_MAP.md` §11, §11.0 | V#2603, V#2639 | 18:04 supersedes the 17:58 identification where they differ |
| B7 | 2026-10-16 20:03 | Engineering counterpart (relayed) | Consolidated engineering decisions and review reconciliation (summary; full text verbatim at locator) | `REUSE_MAP.md` §13; `REVIEW_RECONCILIATION.md` | V#3019 | Governs later review repairs |
| B8 | 2026-10-16 22:29 | Engineering counterpart (relayed) | "ActivateMember must not revive delegations from before suspension." | checkpoint row "R4 reactivation" | V#3294 | Extended by B13 item 4 (commercial authority) |
| B9 | 2026-10-16 23:27 | Engineering counterpart (relayed) | ReassignWork, `organization_member` approvals and F07 are "required authorization repairs, not optional cleanup" (summary) | checkpoint R4 part B rows | V#3493 | ReassignWork contract corrected by B12 |
| B10 | 2026-10-16 | Agent (accepted in commit `36e1d10`) | `ReassignWork` scope `people.admin` → `member_active`, with authority decided per work class | receipt `REVIEW-R4-REASSIGN-WORK.md` | commit `36e1d10` | Production/warehouse as "general" is **superseded by B12** |
| B11 | 2026-10-16 23:39 | Carmen | "This explicitly amends the single-writer arrangement to one writer PER isolated worktree; you remain sole integrator." | `commercial-release/LANES.md`; checkpoint header | V#3546 | Amends B4 |
| B12 | 2026-10-16 23:47 | Engineering counterpart (relayed) | "Do not classify production, warehouse or other domain work as 'general' … people.admin alone is not a universal operational reassignment permission. For purchasing prep … reassignment remains disabled pending a bounded authority definition … Record this as an incomplete workflow. … Unknown/ambiguous work types fail closed." | pending integrator commit (ReassignWork delta) | V#3598 | Supersedes part of B10 |
| B13 | 2026-10-16 23:47 | Engineering counterpart (relayed) | "Reactivation must not silently restore previous commercial authority. Require authorized review/regrant, including primary-role-derived authority … Do not invent a parallel permissions system." | `REVIEW_RECONCILIATION.md`; receipt `REVIEW-B4-REACTIVATION-REGRANT.md` | V#3598 | Implemented locally (not reviewed) |
| B14 | 2026-10-16 23:47 | Engineering counterpart (relayed) | Lane B keeps the Journey's current audience as an interim choice; final role-appropriate visibility is tracked for the main UI task (summary) | `LANES.md` § Lane status | V#3598 | Interim |
| B15 | 2026-10-17 00:12 | Engineering counterpart (relayed) | "Mark the five mutation results UNVERIFIED … Do not retry that script, relocate it again, or reuse its execution as acceptance evidence." | `LANES.md` § Lane A | LIVE | In force |
| B16 | 2026-10-17 00:51 | Carmen | This archive: `docs/project-memory/` reserved; one documentation writer; no chat deletion in this task | this folder | V#3615 | In force |

## C. Standing constraints (in force; exact wording at locator)

| Constraint | Locator |
|---|---|
| Not authorized: push, merge, deploy, shared/production DB writes, real messages, number migration, DNS, purchases, budget changes, deleting historical data, granting permissions to real people | V#2127 and later turns; checkpoint |
| R1 logs and every commit from `e7d8d98` on are "UNREVIEWED — NOT FOR TRANSFER" | `docs/operations/commercial-release/evidence/REVIEW-R1/UNREVIEWED-NOT-FOR-TRANSFER.md` |
| Never use staging DB `isalwa-os-staging`; never deploy latest main; never move `32810573` | takeover `START_HERE` §2; `O22` |
| Do not merge `ct3/oa4-conversations-durable` (`fb49b25` deletes about 5,400 lines) | takeover `START_HERE` §6 |
| Keep ISALWA separate from CCA; no "Rose" authority | `REUSE_MAP.md` §7 |

## D. Contradictions preserved (not resolved here)

1. **Advisor conversion:** Isa `O07` #4 (all advisors convert) vs B5 and code (coverage with explicit conversion plus an independently held permission).
2. **Advisor client registration:** Isa `O07` #1 (advisors register) vs older code (`master_data.admin`) vs V2 (`REUSE_MAP.md` §8: allowed through a new scoped command).
3. **Map:** `O21` (held) vs `O23` (in scope).
4. **Two ADR 0003 files:** `0003-os-tenant-isolation` (preserve branch) vs `0003-v1-delivery-quantities…` (release branch). Always name the file.
5. **Architect "empty by design"** (09-13 audits) vs 26 live facts seen 07-30 (takeover `START_HERE` §5.1).
6. **Coverage advisor modifies quote:** instruction 09:05 "do not" vs V2 "allowed within delegated scope" (`REUSE_MAP.md` §8).
