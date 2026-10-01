# ISALWA OS — Foundation Specification

**Status:** Architecture gate (Increment 5) — documentation only, no runtime implementation  
**Audience:** Engineering, Architect, ISALWA leadership  
**Related:** `FINANCE_ACCOUNTING_BOUNDARY.md`, `CROSS_DEPARTMENT_DEPENDENCIES.md`, `docs/adr/0003-*.md` … `0009-*.md`

---

## Product philosophy

ISALWA OS is **one connected company operating system** — not a CRM, not a collection of mini-apps.

- **One tenant** → one canonical company truth  
- **Commercial** is the first **activated capability lane**, not a separate product silo  
- **Departments** are organizational and permission **lenses** over shared truth  
- **Command Center** answers: *What matters to me right now?* — not 40 vanity dashboards  
- **Locked departments** never fabricate KPIs, activity, AI conclusions, or cross-department insights  
- **Human authority** over money, identity, fiscal, and external communications  
- **AI** classifies, summarizes, suggests — never silently alters authoritative records  

**Classification:** PROPOSED architecture direction (accepted for planning).

---

## Canonical source-of-truth layers

| Layer | Contents | Authority |
|-------|----------|-----------|
| L0 | Tenant (`Organization`) | Boundary |
| L1 | Party graph (Person, Account, Contact, Lead) | Authoritative when human-confirmed |
| L2 | Commercial objects (Opportunity, Quote, Order, PromiseToPay, PriceObservation) | OS commercial lane |
| L3 | Work (WorkItem, ApprovalRequest, Blocker) | Obligation + audit |
| L4 | Messages (immutable ingest + links) | Not a second contact store |
| L5 | Documents + extracted facts | Provenance-tagged |
| L6 | `BusinessEvent` (append-only memory) | System memory |
| L7 | Audit + AI suggestion log | Compliance |
| L8 | Soft projections (scores, attention, AI conclusions) | Non-authoritative |
| L9 | Reports | Scoped queries — not a drifted warehouse |

**Hard vs soft:** quote accepted, payment recorded, visit logged = **hard**. Risk score, AI conclusion, suggested price = **soft**.

---

## Tenant and organization model

```
Organization (tenant)
  ├── Departments (org structure)
  ├── Teams (optional)
  ├── Users + role assignments
  ├── Scopes: department | team | territory | ownership
  └── CapabilityRegistry entries
```

Every tenant-owned record carries `organizationId`. AI retrieval uses the **same** filters as the user session.

---

## Multi-person work

Not `assignedTo` alone. Per entity:

- owner, collaborators, watchers, approver, delegated worker  
- ownership **history** via events (`task_assigned`, `task_reassigned`, `delegation_granted`)  
- concurrent WorkItems on same subject with explicit dependencies  

---

## Party / identity

```
Person → Contact at Party → Party (+ PartyRoleAssignment) → CommercialAccount → Opportunity
Lead = staging (pre-resolution), not permanent duplicate Party
```

**Person ≠ OrganizationMember ≠ AuthIdentity** — see `WORKFORCE_ORGANIZATION_LIFECYCLE.md`.  
**Party roles** (customer, supplier, vendor, …) on one Party — see `PARTYGRAPH_LIFECYCLE.md`.

Resolution: raw input → match candidates → confidence → **human confirm/approve** → canonical identity.  
**Never** silent merge when financial history exists.

---

## Data entry (unified ingest)

Manual, mobile, Excel, WhatsApp, email, documents, call notes → **same** identity + event pipeline.  
No per-channel customer databases.

---

## Event spine

`BusinessEvent`: `occurredAt`, `recordedAt`, `eventType`, `actor`, `authorizationContext`, `primaryEntity`, `relatedEntities`, `payload`, `provenance`, `correlationId`, `idempotencyKey`, `dataOrigin`.

Append-oriented; corrections via compensating events.

---

## Outbox + idempotency

Transactional outbox when DB write and event publication must stay consistent.  
Idempotency for webhooks, import rows, payment replays.

---

## Work ≠ Event ≠ Attention ≠ Notification

| Concept | Meaning |
|---------|---------|
| Event | Something happened |
| WorkItem | Someone must act |
| AttentionItem | Deserves attention now (auto-resolves) |
| Notification | Sparse delivery to human |

---

## Capability registry

States: `LOCKED` | `APPROVED` | `CONNECTING` | `ACTIVE` | `DEGRADED` | (future: `DEPRECATED`)

Command Center, AI, workflows, and reports **must** respect capability state.

---

## AI intelligence

Tiers: rules → retrieval → draft → classify → rank → forecast (Mission 15 alignment).  
Provenance: FACT → PATTERN → CONCLUSION → RECOMMENDATION.  
Retrieval authorized as user. Locked departments: no fake department intelligence.

---

## Reporting

Reports = authorized query + filters + scope. Saved definitions, optional schedule.  
No separate reporting truth.

---

## Knowledge boundary

Approved SOPs/policies versioned in knowledge vault.  
Changing SOP does not rewrite historical events.

---

## Demo / production isolation

Demo universe, simulation, and production tenant **never** share authoritative truth.  
`dataOrigin` on events and imports.

---

## Handoff readiness (Increment 5.1)

**Target:** ISALWA operates normal company administration without Carmen/engineering.

| ISALWA admin (A) | Engineering (C/D) |
|------------------|---------------------|
| Hire, invite, dept/role change, deactivate, rehire | New OS capability/module |
| Add customer, supplier, contact, party roles | Schema migration |
| Reassign work (authorized) | New integration adapter type |
| Correct master data (governed) | Infrastructure, security model |

Every admin action: **command → audit → event** (see `ADMIN_SELF_SERVICE_BOUNDARY.md`, `API_SERVICE_CONTRACT.md`).

**Storage and API contracts** defined before runtime: `STORAGE_CONTRACT.md`, `API_SERVICE_CONTRACT.md`, `INTEGRATION_CONTRACT.md`.

**Handoff manifest (Increment 6):** `ISALWA_OS_HANDOFF_MANIFEST.md` + `handoff-manifest.yaml` — implementation-ready bridge for OS team and multi-agent lanes.

---

## Implementation phases (qualitative)

| Phase | Scope |
|-------|--------|
| Foundation P0 | Tenant, Member/Person/Auth, events, audit, PartyGraph, work, capability registry, ingest idempotency |
| Foundation P0b | Effective-dated role/dept, delegation, admin commands |
| Foundation P1 | Attention, notifications, query layer, calendar, AI authority |
| Commercial v1 | Capture, manual quote path, price memory, visits — on foundation |
| Commercial v2 | WhatsApp ingest, match queue |
| Finance lane | After client names accounting system + adapter |

See `docs/adr/` for binding decisions.
