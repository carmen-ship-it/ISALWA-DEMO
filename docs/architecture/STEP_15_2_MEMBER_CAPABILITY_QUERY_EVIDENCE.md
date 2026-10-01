# Step 15.2 — Member Directory + Capability State Query Evidence

**Phase:** Step 15.2 — Lane F (shared read contracts)  
**Date:** 2026-08-24  
**Gate result:** **PASS** — member/capability queries verified; canonical terminated access denied.

**Rule:** **VERIFIED** requires reproducible Postgres + HTTP runtime evidence.

---

## Mission

Close two production UI read-side gaps without creating new business authority:

1. **ListMembers** — authorized organization-member directory
2. **GetCapabilityState** — factual backend capability availability (not authorization)

**Not modified:** `apps/os-web`, Commercial commands, Approval/Work internals, Agent 1 SuspendMember remediation, outbox recovery.

---

## Gate decision

| Criterion | Status |
|-----------|--------|
| `ListMembers` authorized query | PASS |
| `GetMember` summary (existing + extended) | PASS |
| `GetCapabilityState` backend-owned registry | PASS |
| Tenant isolation (Postgres + HTTP) | PASS |
| Non-admin denied org-wide directory | PASS |
| Capability state ≠ authorization | PASS |
| ACTIVE reflects implemented lanes only | PASS |
| Finance/Messaging remain non-active | PASS |
| Terminated member query behavior | PASS — canonical `revoked` + `employmentStatus: terminated` denied |
| Suspended/revoked denied per auth contract | PASS |
| Live HTTP member + capability endpoints | PASS |
| Manager hierarchy directory widening | **NOT IMPLEMENTED** — `people.admin` only |

---

## Architecture

### Member directory authority

| Query | Scope required | Visibility rule |
|-------|----------------|-----------------|
| `ListMembers` | `people.admin` | Org-wide directory for Equipo admin UX |
| `GetMember` | `member_active` | Same-org member summary (work UI resolver) |

Source of truth: canonical `Person` + `OrganizationMember` + effective-dated role/dept/manager assignments + active delegation count. No parallel employee authority.

### Capability state authority

| Layer | Role |
|-------|------|
| `OS_CAPABILITY_REGISTRY` (`packages/os-contracts/src/capabilities.ts`) | Server-owned defaults + `implemented` flag |
| `os_capability_states` (Postgres, Step 10) | Optional per-org overrides |

`GetCapabilityState` requires `member_active` only — reports availability; does **not** grant action permissions.

### Transition LOCKED → ACTIVE

1. Lane passes architecture evidence gate (runnable backend).
2. Developer updates `OS_CAPABILITY_REGISTRY`: `implemented: true`, `defaultState: 'ACTIVE'`.
3. Optional: org admin writes override to `os_capability_states` (future admin command — not in this step).

No UI manifest edits required after Agent 4 wires `GET /v1/capabilities`.

---

## Package / code map

| Area | Location |
|------|----------|
| Capability registry + DTOs | `packages/os-contracts/src/capabilities.ts`, `queries.ts` |
| Member query service | `packages/os-query/src/member/member-query-service.ts` |
| Capability query service | `packages/os-query/src/capability/capability-query-service.ts` |
| Prisma read store | `packages/os-database/src/prisma-member-query-store.ts` |
| HTTP | `apps/os-api/src/members.controller.ts`, `capabilities.controller.ts` |
| Wiring | `apps/os-api/src/os-store.module.ts`, `app.module.ts` |

---

## HTTP endpoints

| Query | Method | Path | Auth scope |
|-------|--------|------|------------|
| ListMembers | GET | `/v1/members` | `people.admin` |
| GetMember | GET | `/v1/members/:memberId` | `member_active` |
| GetCapabilityState | GET | `/v1/capabilities` | `member_active` |

`GET /v1/members/:id` response remains backward compatible (`member`, `person`) and adds `summary` for directory fields.

ListMembers supports cursor pagination and filters: `q`, `accessStatus`, `employmentStatus`, `departmentId`.

---

## Member fields exposed (`MemberSummaryReadModel`)

| Field | Notes |
|-------|-------|
| `memberId` | OrganizationMember id |
| `organizationId` | Tenant scope |
| `personId` | Person id |
| `givenName`, `familyName`, `displayName` | Display |
| `email` | From auth identity when permitted; nullable |
| `accessStatus` | active / suspended / revoked / invited (`employmentStatus` carries `terminated`) |
| `employmentStatus` | Employment lifecycle |
| `employmentStartedAt`, `employmentEndedAt` | Effective dates |
| `roleKeys[]` | Effective-dated roles |
| `departmentId`, `departmentName` | Effective department |
| `managerMemberId` | Effective manager |
| `activeDelegationCount` | Count of non-expired delegations |

**Not exposed:** passwords, provider credentials, raw security metadata.

---

## Capability registry (evidence-based defaults)

| Key | State | Implemented |
|-----|-------|-------------|
| `workforce` | ACTIVE | yes |
| `partygraph` | ACTIVE | yes |
| `work` | ACTIVE | yes |
| `commercial` | ACTIVE | yes |
| `finance` | LOCKED | no |
| `messaging` | NOT_CONFIGURED | no |
| `warehouse` | FUTURE | no |
| `territory` | FUTURE | no |
| `production` | FUTURE | no |
| `integrations` | NOT_CONFIGURED | no |

Org overrides in `os_capability_states` merge at query time (`source: org_override`).

---

## Terminated member auth (J-12 corrected)

**Classification:** **NOT A RUNTIME GAP** — prior postgres test used invalid `accessStatus: 'terminated'` (not in `ACCESS_STATUSES`).

**Canonical `TerminateMember` persists:**
- `employmentStatus: terminated`
- `accessStatus: revoked`
- `AuthIdentity.status: revoked`

**Query + HTTP behavior for canonical termination:** **DENIED** (`ACCESS_REVOKED` / HTTP 403) via `assertMemberActive` on `accessStatus: revoked`.

**Defense-in-depth (J-13, optional):** Synthetic corrupt state `employmentStatus: terminated` + `accessStatus: active` may build query context in isolation — not reachable via authoritative commands; HTTP session still requires active access + auth identity.

---

## Postgres verification (2026-08-24)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
./scripts/verify-step-15-2.sh
```

**Log:** `.step15-2-evidence/verify-20260824T134841Z.log` (J-12 corrected tests)

| Suite | Tests | Result |
|-------|-------|--------|
| member + capability prisma integration | 8 | PASS |
| os-api member + capability runtime HTTP | 8 | PASS |
| os-api tenant isolation (regression) | 2 | PASS |

---

## Security negative tests

| Test | Result |
|------|--------|
| Tenant A cannot list Tenant B members (HTTP) | PASS |
| Cross-tenant GET /v1/members (session org mismatch) | PASS |
| Non-admin (`sales_rep`) denied ListMembers | PASS |
| Suspended member denied query context + HTTP | PASS |
| Canonical terminated member denied (Postgres + HTTP) | PASS |
| Capability endpoint org-scoped via session | PASS |
| ACTIVE commercial in capabilities does not grant commercial list without records | PASS |
| Browser-supplied role cannot widen directory | PASS (session from server auth) |

---

## Extension procedure (low-maintenance handoff)

### Add a new ACTIVE capability

1. Complete lane evidence gate (commands + projections as required).
2. Edit `OS_CAPABILITY_REGISTRY` in `packages/os-contracts/src/capabilities.ts`.
3. Rebuild packages; no UI manifest change once os-web uses `GET /v1/capabilities`.
4. Optional org override: insert/update `os_capability_states`.

### Widen member directory visibility

Requires contracted scope (e.g. manager tree) — **not** invented in Step 15.2. Today: `people.admin` only.

### Member authority source

Workforce store (`Person`, `OrganizationMember`, assignments) → `PrismaMemberQueryStore` → `MemberQueryService` → HTTP.

---

## Carmen handoff

### WHERE WE ARE

Lane F member directory and capability state queries are **implemented and verified** at Postgres + HTTP layers. UI-1 Equipo admin can wire to backend contracts. Canonical terminated access is **denied**.

### LIST MEMBERS
**PASS**

### EXACT MEMBER FIELDS EXPOSED
`memberId`, `organizationId`, `personId`, `givenName`, `familyName`, `displayName`, `email`, `accessStatus`, `employmentStatus`, `employmentStartedAt`, `employmentEndedAt`, `roleKeys[]`, `departmentId`, `departmentName`, `managerMemberId`, `activeDelegationCount`.

### MEMBER VISIBILITY RULE
**ListMembers:** `people.admin` → full org directory within session tenant. **GetMember:** any `member_active` actor → same-org member by id. No manager-hierarchy widening. Tenant enforced via session + `assertQueryTenantResource`.

### GET CAPABILITY STATE
**PASS**

### CAPABILITIES CURRENTLY ACTIVE
`workforce`, `partygraph`, `work`, `commercial`.

### CAPABILITIES LOCKED / NOT CONFIGURED
LOCKED: `finance`. NOT_CONFIGURED: `messaging`, `integrations`. FUTURE: `warehouse`, `territory`, `production`.

### CAPABILITY STATE VS AUTHORIZATION
**PASS** — `GetCapabilityState` uses `member_active` only; commercial ACTIVE does not bypass commercial query auth (`people.admin` / ownership).

### TERMINATED MEMBER AUTH FINDING
**NOT A RUNTIME GAP** — J-12 corrected invalid test; canonical path **DENIED**

### WHAT POSTGRES PROVED
Admin directory list; non-admin denial; tenant-scoped GetMember; capability registry + org override; canonical terminated denied; suspended denied; defense-in-depth corrupt state documented.

### WHAT HTTP RUNTIME PROVED
Live `GET /v1/members`, `GET /v1/capabilities`; admin list; non-admin 403; cross-tenant 403; capability factual states; commercial capability ≠ commercial access; suspended 403; canonical terminated 403.

### SECURITY NEGATIVE TESTS
All listed negatives **PASS** including canonical terminated denial.

### WHAT IS NOT VERIFIED
- Manager/team peer directory scopes
- Browser E2E through os-web (Agent 4)
- Admin command to mutate `os_capability_states`
- J-13 optional `employmentStatus` guard on query context (hardening only)

### CROSS-LANE CHANGE REQUESTS
None for terminated-member auth. Optional J-13: `ActivateMember` guard when `employmentStatus: terminated` (Agent 1 hardening).

### ARCHITECTURE DRIFT
**NO** — uses existing Person/Member model, ADR-0006 capability semantics, `people.admin` contract.

### LOW-MAINTENANCE HANDOFF
**PASS** — registry in contracts; optional DB overrides; verify script `scripts/verify-step-15-2.sh`.

### CARMEN-DISAPPEARANCE TEST
**PASS** — backend contracts documented; UI wiring remains Agent 4.

### WHAT AGENT 4 CAN NOW REMOVE/REPLACE
- **Static capability manifest** (`apps/os-web/lib/capabilities/manifest.ts`) → replace with `GET /v1/capabilities`
- **Equipo list blocker** → wire `GET /v1/members` (admin-only)
- **Keep** `GET /v1/members/:id` for member resolver (backward compatible shape)
- **Workforce Admin blocker** on ListMembers HTTP → **unblocked**; UI slice still needs implementation

### UI-1 WORKFORCE ADMIN BACKEND READY
**YES** — ListMembers + GetMember + GetCapabilityState HTTP available.

### EXACT NEXT ACTION
Agent 4: wire Equipo admin list to `GET /v1/members` and nav gating to `GET /v1/capabilities`; remove static capability manifest.

### EXACT NEXT CURSOR PROMPT
For Agent 4 only:

```
UI-1 Workforce Admin — wire Equipo directory to GET /v1/members (people.admin gated) and replace apps/os-web/lib/capabilities/manifest.ts with GET /v1/capabilities. Do NOT modify os-api or workforce commands. Keep GET /v1/members/:id for member-resolver. Evidence: docs/architecture/STEP_15_2_MEMBER_CAPABILITY_QUERY_EVIDENCE.md
```

---

## Related gaps closed

| Gap | Before | After |
|-----|--------|-------|
| ListMembers HTTP | OPEN | **CLOSED** |
| GetCapabilityState HTTP | OPEN | **CLOSED** |
| Terminated member auth | OPEN | **CLOSED (J-12)** | canonical path denied |
