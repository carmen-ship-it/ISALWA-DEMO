# Step 12 — PartyGraph Implementation Evidence

**Phase:** Step 12 — Lane C (canonical PartyGraph foundation)  
**Date:** 2026-08-24  
**Gate result:** **PASS** (API + Postgres verified; admin UI deferred — see §Handoff)

**Rule:** **VERIFIED** requires reproducible Postgres/runtime evidence in this document.

---

## Gate decision

| Criterion | Status | Notes |
|-----------|--------|-------|
| Party canonical — not CRM/customer table | PASS | `os_parties`; no legacy `Account` usage |
| PartyRoleAssignment multi-role on one Party | PASS | Postgres integration test |
| Contact on organization Party | PASS | `UpdateContact` + integration test |
| CommercialAccount lens (customer role) | PASS | Created with `customer` role |
| Lead staging + resolve | PASS | `CreateLead`, `ResolveLead` commands |
| FiscalIdentity effective-dated | PASS | `UpdateFiscalIdentity`; history preserved |
| Duplicate detection (no silent merge) | PASS | NIT match → `party.duplicate.suggested` |
| Governed merge (request → approve) | PASS | Class B `org.admin` for approve |
| Merge lineage preserved | PASS | `lineageSnapshotJson` on merge request |
| All PartyGraph commands transactional (event+audit+outbox) | PASS | Every command via `runInTransaction` |
| Command idempotency inside transaction | PASS | Idempotency saved inside same tx |
| Tenant isolation | PASS | Cross-tenant command rejected |
| BusinessEvent / AuditLog / Outbox | PASS | Atomic append on every command |
| Legacy ActivityEvent / Account authority | PASS | OS path only; legacy frozen |
| Admin product UI for party master data | **DEFERRED** | API only — `apps/os-web` not started |
| Fuzzy-match duplicate scoring | **DEFERRED** | Exact NIT match only in Step 12 |
| ReassignCommercialAccountOwner command | **DEFERRED** | Spec listed; not required for Step 12 gate |

---

## Package map

| Package / path | Purpose | Status |
|----------------|---------|--------|
| `packages/os-contracts` | Party commands, events, roles, unified command registry | IMPLEMENTED |
| `packages/os-party` | `PartyCommandService`, store port | IMPLEMENTED + TESTED |
| `packages/os-database` | Prisma `os_*` party tables, `PrismaOsPartyStore` | IMPLEMENTED + VERIFIED |
| `apps/os-api` | Party commands via `POST /v1/commands/*`, `GET /v1/parties/:id` | INTEGRATED |

**Migration:** `20260824140000_os_step12_partygraph`

---

## Commands implemented (all transactional)

| Command | Scope | Event(s) |
|---------|-------|----------|
| `CreateParty` | `master_data.admin` | `party.created` (+ duplicate suggest if NIT clash) |
| `UpdateParty` | `master_data.admin` | `party.updated` |
| `DeactivateParty` | `master_data.admin` | `party.deactivated` |
| `ReactivateParty` | `master_data.admin` | `party.reactivated` |
| `AssignPartyRole` | `master_data.admin` | `party.role.assigned` |
| `EndPartyRole` | `master_data.admin` | `party.role.ended` |
| `UpdateContact` | `master_data.admin` | `contact.updated` |
| `UpdateFiscalIdentity` | `fiscal.admin` | `party.fiscal_identity.changed` |
| `CreateLead` | `master_data.admin` | `lead.created` |
| `ResolveLead` | `master_data.admin` | `lead.resolved` + `party.created` |
| `RequestPartyMerge` | `master_data.admin` | `party.merge.requested` |
| `ApprovePartyMerge` | `org.admin` | `party.merged` |
| `RejectPartyMerge` | `org.admin` | `party.merge.rejected` |

---

## Future department consumption (contract-only — not implemented)

| Department | How it consumes PartyGraph |
|------------|----------------------------|
| **Commercial** | `CommercialAccount.partyId` → canonical Party; quotes/orders attach to account lens, not separate customer master |
| **Purchasing** | `AssignPartyRole(supplier)` on existing Party — no Supplier master table |
| **Finance** | References same `partyId` / fiscal identity history; no OS ledger on Party create |
| **Messaging** | Contacts on organization Party (email, phone, WhatsApp fields) |
| **Logistics** | `logistics_provider` role on same Party graph |
| **AI** | Reads authorized Party projections only; inherits session scopes (ADR-0009) |

---

## Postgres verification (2026-08-24)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
./scripts/verify-step-12.sh
```

**Log:** `.step12-evidence/verify-20260824T123558Z.log`

| Suite | Tests | Result |
|-------|-------|--------|
| `partygraph prisma integration` | 9 | PASS |
| `outbox prisma integration` | 5 | PASS |
| `workforce prisma integration` | 5 | PASS |
| `os-api tenant isolation` | 2 | PASS |

**Scenarios verified on Postgres:**

- Create Party (+ commercial account when customer role)
- Event + audit + outbox in same transaction
- Correlation + idempotency key on event row
- Multiple roles on one Party
- End role without deleting Party
- Contact add/update
- Deactivate / reactivate
- Duplicate candidate on exact NIT (no silent merge)
- Governed merge with lineage snapshot + contact reassignment + role transfer
- Idempotent command retry (single party row)
- Cross-tenant command rejected

---

## Operational handoff

### Authority

- **Lane C owns:** `packages/os-party`, party `os_*` tables, party commands/events in `os-contracts`
- **Must not touch:** legacy `packages/database`, `apps/api`, `apps/web`, outbox worker internals (Lane D)

### Run / test / recover

```bash
# Prerequisites: Postgres running, OS_DATABASE_URL set
./scripts/verify-step-12.sh
```

Migrations: `pnpm --filter @isalwa/os-database migrate:deploy`

Failure modes:
- `CONFLICT` — optimistic version mismatch on Party/Contact update
- `VALIDATION_FAILED` — merge blocked when both parties have CommercialAccount
- `PERMISSION_DENIED` — missing `master_data.admin` / `fiscal.admin` / `org.admin` scope

Recovery: outbox messages remain in `os_outbox_messages` (Lane D worker); party state is authoritative in `os_parties`.

### HANDOFF_GAP

**Admin product UI not built.** Authorized administrators cannot yet manage Party master data through in-app workflows — only via `POST /v1/commands/*` API. Engineering is not required for *architecture* once UI lands (Step 14+ / `apps/os-web`).

---

## Architecture drift

**NO** — contracts from Step 9 / ADR-0004 implemented without local workarounds.  
**Minor extension:** `CreateLead` / `ResolveLead` added (lifecycle doc; not in handoff YAML command list) — documented here, not a second identity spine.

---

## Parallel lanes

| Lane | Can continue? | Evidence |
|------|---------------|----------|
| **E — Work / Approval** | **YES** | Party exists as work subject; event spine ready |
| **F — Query / Projection** | **YES** | Party events in outbox; consumers can project |
| **G — Commercial** | **NO** | Needs Work (E), projections (F), admin UI, commercial commands |

---

## Deferred

1. Admin UI (`apps/os-web`) for Carmen-disappearance UX  
2. Fuzzy duplicate scoring / WhatsApp ingest resolution pipeline  
3. `ReassignCommercialAccountOwner` command  
4. Dedicated party search query (`SearchParties`) — only `GET /v1/parties/:id` in Step 12
