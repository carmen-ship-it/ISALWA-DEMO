# Increment 7 — Client Discovery Matrix

**Status:** Questions only — **no invented answers**  
**Purpose:** Minimum questions that can materially change architecture before implementation  
**Companion:** `UPDATED_CLIENT_DECISIONS.md`, `INCREMENT_7_ARCHITECTURE_CHALLENGE.md`

---

## Classification

| Gate | Meaning |
|------|---------|
| **REQUIRED BEFORE FOUNDATION** | Blocks or misroutes steps 10–11 (tenant, auth, events) |
| **REQUIRED BEFORE COMMERCIAL** | Blocks or misroutes step 16+ |
| **REQUIRED BEFORE FINANCE** | Blocks finance adapter / projections |
| **CAN DEFER** | Configurable at runtime or safe placeholder |

---

## Organization

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| O-01 | What departments exist today (names, hierarchy)? | DepartmentAssignment seed + admin UI | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| O-02 | Who are administrators vs managers vs individual contributors? | Admin scope mapping (RD-01) | REQUIRED BEFORE FOUNDATION | UNKNOWN |
| O-03 | Is there a formal manager hierarchy per department? | ManagerAssignment model | REQUIRED BEFORE COMMERCIAL | CAN DEFER (minimal tree) |
| O-04 | Rehire policy: same Person always? Any cooling-off rules? | RehireMember workflow | CAN DEFER | UNKNOWN |
| O-05 | Leave types: unpaid, medical, suspension — access rules? | SuspendMember vs on_leave | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| O-06 | Expected employee count in first 12 months? | Scale, indexing — not architecture | CAN DEFER | UNKNOWN |

---

## Authority

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| A-01 | Final admin role names and who holds them? | RD-01 — scope keys vs labels | REQUIRED BEFORE FOUNDATION | UNKNOWN |
| A-02 | Who can invite employees? | InviteMember authorization | REQUIRED BEFORE FOUNDATION | UNKNOWN |
| A-03 | Who can change roles that grant finance visibility? | ChangeRole class A vs B | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| A-04 | Approval thresholds: discount %, credit limit, merge | RD-02 | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| A-05 | Delegation: who may delegate approval authority? | GrantDelegation class B | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| A-06 | Can an admin grant themselves finance authority? | Separation of duties | REQUIRED BEFORE FOUNDATION | UNKNOWN (policy: NO in architecture) |
| A-07 | Territory / geographic scope for sales? | Territory model vs dept scope | REQUIRED BEFORE COMMERCIAL | UNKNOWN |

---

## Master data

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| M-01 | Customer creation process today (who, channel, fields)? | CreateParty + AssignPartyRole flow | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-02 | Supplier vs vendor distinction in ISALWA language? | PartyRoleAssignment catalog | CAN DEFER (roles extensible) | UNKNOWN |
| M-03 | Distributor/partner definitions and overlap with customer? | Multi-role same Party | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-04 | Duplicate detection rules (phone, NIT, name fuzzy)? | Match queue confidence | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-05 | NIT change policy — always approval? | class B fiscal | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-06 | Legal name change — fiscal/commercial impact workflow? | class B | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-07 | Party merge approval chain | RequestPartyMerge / ApprovePartyMerge | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-08 | Commercial account owner assignment rules | Reassign owner command | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| M-09 | Primary contact rules per organization Party | Contact isPrimary | CAN DEFER | UNKNOWN |

---

## Finance

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| F-01 | What accounting system is used today? | RD-03 — adapter selection | REQUIRED BEFORE FINANCE | UNKNOWN |
| F-02 | Who operates accounting (internal vs external accountant)? | Integration class D | REQUIRED BEFORE FINANCE | UNKNOWN |
| F-03 | Official invoice issuance process and system? | External authority boundary | REQUIRED BEFORE FINANCE | UNKNOWN |
| F-04 | SIN / e-invoicing status and timeline? | Fiscal adapter | REQUIRED BEFORE FINANCE | UNKNOWN |
| F-05 | How payments are recorded today? | Payment ingest vs manual | REQUIRED BEFORE FINANCE | UNKNOWN |
| F-06 | AR aging source of truth today? | FinanceProjection source | REQUIRED BEFORE FINANCE | UNKNOWN |
| F-07 | Who approves credit limits and holds? | RD-02 + Commercial blocks | REQUIRED BEFORE COMMERCIAL (if credit UI) | UNKNOWN |
| F-08 | Dual-run period acceptable for finance cutover? | Reconciliation architecture | REQUIRED BEFORE FINANCE | CAN DEFER |

---

## Integrations

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| I-01 | Corporate email provider (Google, Microsoft, other)? | Email adapter | REQUIRED BEFORE COMMERCIAL (notifications) | UNKNOWN |
| I-02 | WhatsApp Business API — existing WABA / numbers by purpose? | MessagingChannel mapping | REQUIRED BEFORE COMMERCIAL (WhatsApp step) | UNKNOWN |
| I-03 | Document storage preference (R2, Google Drive, SharePoint)? | Document adapter | CAN DEFER | UNKNOWN |
| I-04 | Banking: manual import vs API? | Banking adapter | REQUIRED BEFORE FINANCE | UNKNOWN |
| I-05 | Logistics carriers / systems in use? | Future logistics lane | CAN DEFER | UNKNOWN |
| I-06 | Excel/CSV export frequency from accountant? | Manual fallback path | REQUIRED BEFORE FINANCE | UNKNOWN |

---

## AI

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| AI-01 | What may AI suggest without human action? | ADR-0009 boundaries | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| AI-02 | What must always be human-approved? | Command vs suggestion split | REQUIRED BEFORE COMMERCIAL | UNKNOWN |
| AI-03 | Sensitive fields AI must never surface (margin, credit, NIT)? | Field-level masking | REQUIRED BEFORE FOUNDATION | UNKNOWN |
| AI-04 | Department-specific copilots desired at launch? | Capability-gated intelligence | CAN DEFER | UNKNOWN |
| AI-05 | Approved knowledge sources (SOPs, policies) at launch? | ApprovedKnowledge vault | CAN DEFER | UNKNOWN |

---

## Operational / handoff

| # | Question | Why it matters | Gate | Status |
|---|----------|----------------|------|--------|
| H-01 | Who becomes primary ISALWA admin after Carmen handoff? | Bootstrap admin | REQUIRED BEFORE FOUNDATION | UNKNOWN |
| H-02 | Break-glass support policy (Carmen time-boxed access)? | ADR-0003 consultant access | CAN DEFER | UNKNOWN |
| H-03 | Business hours / timezone for SLAs and notifications? | Organization.timezone (La_Paz default in legacy schema) | CAN DEFER | KNOWN default America/La_Paz |
| H-04 | Data retention expectations (messages, audit)? | Retention policy | CAN DEFER | UNKNOWN |

---

## Priority order for discovery interviews

1. **Foundation blockers:** A-01, A-02, A-06, AI-03, H-01  
2. **Commercial blockers:** O-01, A-07, M-01, M-03, M-04, A-04, F-07  
3. **Finance blockers:** F-01–F-06 (parallel track before step 19)  
4. **Defer:** team structure detail, logistics, retention, AI copilot scope at launch

---

## Evidence that questions are not yet answered

| Source | Evidence |
|--------|----------|
| `BOLIVIA_ACCOUNTING_DISCOVERY_MATRIX.md` | Cells marked REQUIRES ISALWA VALIDATION |
| `ADMIN_SELF_SERVICE_BOUNDARY.md` | "Final role names: CLIENT VALIDATION REQUIRED" |
| `handoff-manifest.yaml` | `requires_decision` RD-01, RD-02, RD-03 |
| `planificacion-derive.test.ts` | Workforce/party/admin **questions** surfaced on empty workspace |
| `ws_isalwa` / empty workspace tests | No operational ISALWA facts in Planificación |
