# Handoff Architecture Consistency Audit

**Increment:** 6  
**Date:** 2026-08-23  
**Scope:** Pre-manifest reconciliation of approved architecture (Increments 5 + 5.1)  
**Method:** Cross-read foundation spec, lifecycle docs, storage/API/integration contracts, ADRs 0003–0011, Planificación derive modules

---

## Summary

| Classification | Count |
|----------------|-------|
| **BLOCKER** | 0 |
| **REQUIRES_DECISION** | 3 |
| **DOCUMENTATION_GAP** | 6 |
| **IMPLEMENTATION_FOLLOW-UP** | 8 |

**No silent conflicts were resolved.** All findings are classified below. The handoff manifest uses canonical names and flags gaps explicitly.

---

## Conflicts checked (none blocking)

| Topic | Sources | Finding |
|-------|---------|---------|
| Person ≠ Member ≠ Auth | ADR-0010, WORKFORCE, STORAGE | **Consistent** |
| Party multi-role | ADR-0004, PARTYGRAPH | **Consistent** |
| Event ≠ Work ≠ Attention | ADR-0005, foundation | **Consistent** |
| Finance LOCKED | ADR-0007, finance boundary | **Consistent** |
| Outbox + idempotency | ADR-0008, STORAGE, API | **Consistent** |
| Admin A/B/C/D | ADR-0011, ADMIN_SELF_SERVICE | **Consistent** |
| AI auth inheritance | ADR-0009, ADR-0003 | **Consistent** |
| Commercial first | foundation phases, CROSS_DEPT | **Consistent** |

---

## REQUIRES_DECISION (client / leadership — not invented in manifest)

| ID | Topic | Why it matters | Manifest treatment |
|----|-------|----------------|-------------------|
| RD-01 | **Exact admin role names** | `people.admin`, `master_data.admin`, etc. are proposed scopes — not validated with ISALWA | Marked `REQUIRES_CLIENT_CONFIRMATION` |
| RD-02 | **Approval thresholds** | Credit limit, payment terms, merge approval tiers unknown | Marked `REQUIRES_CLIENT_CONFIRMATION` |
| RD-03 | **Accounting provider** | QuickBooks scaffold only; Bolivia path deferred | Marked `LOCKED` / `DEFERRED` — no vendor in manifest |

---

## DOCUMENTATION_GAP (canonical name or missing detail — no architecture reversal)

| ID | Gap | Sources | Resolution in manifest |
|----|-----|---------|------------------------|
| DG-01 | **Account vs CommercialAccount** | Foundation L1 lists "Account"; ADR-0004 and PARTYGRAPH use `CommercialAccount` | Manifest uses **`CommercialAccount`**; notes Foundation L1 alias |
| DG-02 | **Workforce Person vs Party (person kind)** | Person in workforce + Party `partyKind: person` for external individuals | Manifest defines **two concepts** + Contact bridge — not duplicate identity systems |
| DG-03 | **Blocker entity** | Foundation L3 lists Blocker; STORAGE_CONTRACT omits | Classified as **Work lane follow-up** — may be WorkItem subtype or tag |
| DG-04 | **Team entity** | Foundation mentions Teams (optional); no lifecycle doc | **IMPLEMENTATION_FOLLOW-UP** — DepartmentAssignment sufficient for P0 |
| DG-05 | **FiscalIdentity table vs Party fields** | PARTYGRAPH lists FiscalIdentity; STORAGE lists fiscal on Party | Manifest: fiscal attributes on Party + governed change events; table shape at schema step |
| DG-06 | **REST command URL style** | API contract defers POST `/v1/commands/*` vs resource-oriented | **IMPLEMENTATION_FOLLOW-UP** at step 9 — single style required |

---

## IMPLEMENTATION_FOLLOW-UP (expected at runtime steps — not 5.1 gaps)

| ID | Topic | Owning lane | Gate |
|----|-------|-------------|------|
| IF-01 | Prisma/schema mapping to STORAGE_CONTRACT | Foundation | Step 9 |
| IF-02 | OpenAPI command surface | API / Foundation | Step 9–10 |
| IF-03 | Break-glass support workflow | Auth / Security | Step 10 |
| IF-04 | Team optional model | Workforce | Step 13 |
| IF-05 | Commercial Opportunity/Quote/Order detail | Commercial | Step 16+ |
| IF-06 | Warehouse/Operations event catalog | Future lanes | Post-Commercial |
| IF-07 | Tenant export/portability format | Foundation | Post-foundation |
| IF-08 | Data retention / legal hold policy | Ops / Legal | Client discovery (Increment 7) |

---

## Entity contract completeness (manifest sections)

| Entity | Owner lane | Authority | Storage | API | Lifecycle | Events | Audit | Status |
|--------|------------|-----------|---------|-----|-----------|--------|-------|--------|
| Person | B | ADR-0010 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| OrganizationMember | B | ADR-0010 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| AuthIdentity | A | ADR-0010 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| RoleAssignment | B | ADR-0003 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| DepartmentAssignment | B | ADR-0010 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| ManagerAssignment | B | ADR-0010 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| Delegation | B | ADR-0003 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| Party | C | ADR-0004 | STORAGE | API | PARTYGRAPH | ✓ | ✓ | **COMPLETE** |
| PartyRoleAssignment | C | ADR-0004 | STORAGE | API | PARTYGRAPH | ✓ | ✓ | **COMPLETE** |
| Contact | C | ADR-0004 | STORAGE | API | PARTYGRAPH | ✓ | ✓ | **COMPLETE** |
| CommercialAccount | G | ADR-0004 | STORAGE | API | PARTYGRAPH | ✓ | ✓ | **COMPLETE** |
| Lead | C/G | ADR-0004 | STORAGE | API | PARTYGRAPH | ✓ | ✓ | **COMPLETE** |
| WorkItem | E | ADR-0005 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| ApprovalRequest | E | ADR-0005 | STORAGE | API | WORKFORCE | ✓ | ✓ | **COMPLETE** |
| BusinessEvent | D | ADR-0005 | STORAGE | internal | foundation | ✓ | ✓ | **COMPLETE** |
| AuditLog | D | ADR-0009 | STORAGE | query | foundation | — | ✓ | **COMPLETE** |
| FinanceProjection | I | ADR-0007 | STORAGE | API | finance boundary | ✓ | ✓ | **LOCKED** |
| CapabilityState | A | ADR-0006 | STORAGE | API | ADR-0006 | ✓ | ✓ | **COMPLETE** |
| IntegrationConnection | H | INTEGRATION | STORAGE | API | INTEGRATION | ✓ | ✓ | **COMPLETE** |
| AttentionItem | E/F | ADR-0005 | derived | query | ADR-0005 | derived | partial | **COMPLETE** |
| Notification | E | ADR-0005 | STORAGE | query | ADR-0005 | ✓ | partial | **COMPLETE** |
| ApprovedKnowledge | Future | foundation | STORAGE | query | foundation | ✓ | ✓ | **DEFERRED** detail |
| IdempotencyKey | D | ADR-0008 | STORAGE | ingest | ADR-0008 | — | ✓ | **COMPLETE** |
| Document metadata | H | foundation | STORAGE | API | INTEGRATION | ✓ | ✓ | **COMPLETE** |

---

## Duplicate-system risk check

| Risk | Status |
|------|--------|
| Separate customer/supplier/vendor masters | **Prevented** — PartyRoleAssignment |
| Second event log | **Prevented** — BusinessEvent only |
| Second ledger | **Prevented** — FinanceProjection only |
| UI-as-authority | **Prohibited** — API contract |
| Per-channel contact DB | **Prevented** — unified ingest |
| Department mini-app DB coupling | **Prevented** — event + projection contract |

---

## Audit sign-off

Architecture is **consistent enough** to produce the handoff manifest without reinterpretation. Remaining items are classified, not hidden.

**Next gate:** Increment 7 (client discovery) for RD-01, RD-02, RD-03.
