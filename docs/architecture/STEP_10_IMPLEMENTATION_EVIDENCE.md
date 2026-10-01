# Step 10 — Foundation Implementation Evidence

**Phase:** Step 10 — Tenant + Person + Member + AuthIdentity + Authorization + Self-Service  
**Date:** 2026-08-23  
**Gate result:** **CONDITIONAL PASS** (see §Gate decision)

**Rule:** Status labels are not interchangeable. **VERIFIED** requires reproducible runtime evidence in this document.

---

## Gate decision

| Criterion | Status | Notes |
|-----------|--------|-------|
| Person/Member/AuthIdentity separation in code | PASS | `packages/os-workforce`, `packages/os-database/prisma/schema.prisma` |
| Tenant boundary tested | PASS | Unit + API integration tests |
| Authorization boundary tested | PASS | `os-domain` + workforce tests |
| Lifecycle + effective-dated assignments | PASS | Role/dept/manager/delegation |
| Provider credential boundary explicit | PASS | `AuthProviderPort`; OS does not store passwords |
| BusinessEvent canonical | PASS | `os-events`; no ActivityEvent in OS path |
| Audit on admin commands | PASS | `buildAuditEntry` on every command |
| AI authorization inheritance | PASS | `aiEffectiveScopes` tested |
| Legacy commercial schema frozen | PASS | No changes to `packages/database` authority |
| Prisma-backed runtime store | **BLOCKED** | Schema + migration exist; adapter not wired |
| Production auth provider | **DEFERRED** | `LocalAuthProviderPort` only |
| Admin UI (Carmen-disappearance UX) | **PLANNED** | `apps/os-web` not started |
| `delegation.expired` auto-emission | **DEFERRED** | Expiry enforced at read time; no scheduler |
| SG-03 break-glass | **DEFERRED** | Documented boundary; not implemented |

---

## Carmen-disappearance test matrix

| # | Capability | ARCHITECTURE SOURCE | CODE | TEST | RUNTIME | STATUS |
|---|------------|---------------------|------|------|---------|--------|
| A | Invite employee | ADR-0010; `shared-contracts.yaml` InviteMember | `workforce-command-service.ts` `inviteMember` | `workforce-lifecycle.test.ts` | curl InviteMember 2026-08-23 | **VERIFIED** |
| B | Accept invitation | ADR-0010 ActivateMember | `activateMember` | lifecycle test | — | **TESTED** |
| C | Password change (provider) | ADR-0010 §credentials | `auth-provider.ts` port only | boundary doc | — | **DEFERRED** (provider owns password) |
| D | Governed email change | SG-01; `member.email.*` events | `requestMemberEmailChange`, `changeMemberEmail` | lifecycle tests | — | **TESTED** |
| E | Admin updates member | ADR-0011 class A/B | ChangeRole, ChangeDepartment, etc. | lifecycle tests | — | **TESTED** |
| F | Assign department | `member.department.changed` | `changeDepartment` | — | — | **IMPLEMENTED** |
| G | Assign role/scope | `member.role.changed` | `changeRole` | role history test | — | **TESTED** |
| H | Change manager | `member.manager.changed` | `changeManager` | — | — | **IMPLEMENTED** |
| I | Grant delegation | `delegation.granted` | `grantDelegation` | delegation test | — | **TESTED** |
| J | Delegation expires | contracts `delegation.expired` | `computeEffectiveScopes` at `asOf` | delegation expiry test | — | **TESTED** (read-time; no scheduled event) |
| K | Terminate member | `member.terminated` | `terminateMember` | lifecycle test | — | **TESTED** |
| L | Rehire same Person | `employment.restarted` | `rehireMember` | rehire test | — | **TESTED** |
| M | Audit trail preserved | ADR-0005; outbox | `os-events/append.ts` | audit test | — | **TESTED** |
| N | Reassign work before terminate | TerminateMember policy | `reassignWork`; terminate fails if open work | — | — | **IMPLEMENTED** (policy enforced; no UI) |
| O | Cross-tenant forbidden | ADR-0003 | `assertTenantMatch` + actor org check | tenant tests (workforce + api) | curl cross-tenant 403 | **VERIFIED** |
| P | AI same authorization | ADR-0009 | `aiEffectiveScopes` | `authorization.test.ts` | — | **TESTED** |
| Q | Admin commands audited | API contract | `buildAuditEntry` | audit test | — | **TESTED** |

---

## Package map (Lane A foundation)

| Package | Purpose | Status |
|---------|---------|--------|
| `packages/os-contracts` | Commands, scopes, events, lifecycle enums, Zod payloads | IMPLEMENTED |
| `packages/os-database` | Prisma `os_*` schema + migration + client | IMPLEMENTED (schema); INTEGRATED pending adapter |
| `packages/os-domain` | Authorization, effective-dated scopes, tenant assert | IMPLEMENTED + TESTED |
| `packages/os-events` | BusinessEvent, outbox, audit builders | IMPLEMENTED |
| `packages/os-workforce` | Workforce command service + memory store + auth port | IMPLEMENTED + TESTED |
| `apps/os-api` | `POST /v1/commands/{name}`, `GET /v1/members/:id`, dev bootstrap | IMPLEMENTED + TESTED + VERIFIED |

Legacy `packages/database`, `apps/api`, `apps/web` — **not modified** as OS authority.

---

## API surface

| Route | Auth | Status |
|-------|------|--------|
| `GET /v1/health` | none | VERIFIED |
| `POST /v1/dev/bootstrap` | dev only | VERIFIED |
| `POST /v1/commands/:commandName` | session headers | VERIFIED |
| `GET /v1/members/:memberId` | session headers | INTEGRATED (tests) |

Session headers (dev boundary — production replaces with signed session):

- `x-os-organization-id`
- `x-os-member-id`
- `x-os-person-id`
- `x-os-auth-identity-id`
- `x-correlation-id` (optional)

Tenant context is **never** taken from JSON body.

---

## Commands implemented

`InviteMember`, `ActivateMember`, `RequestMemberEmailChange`, `ChangeMemberEmail`, `ChangeDepartment`, `ChangeRole`, `ChangeManager`, `GrantDelegation`, `RevokeDelegation`, `SuspendMember`, `TerminateMember`, `RehireMember`, `ReassignWork`

---

## Test evidence (2026-08-23)

```bash
cd /Users/carmen/projects/isalwa
npx pnpm@9.15.4 --filter @isalwa/os-domain --filter @isalwa/os-workforce --filter @isalwa/os-api test
```

| Suite | Pass | Fail |
|-------|------|------|
| `packages/os-domain` authorization | 6 | 0 |
| `packages/os-workforce` lifecycle | 11 | 0 |
| `apps/os-api` tenant isolation | 2 | 0 |
| **Total** | **19** | **0** |

---

## Runtime verification (2026-08-23)

```bash
cd /Users/carmen/projects/isalwa/apps/os-api
pnpm build   # or: npx pnpm@9.15.4 --filter @isalwa/os-api build
node dist/main.js   # listens on :4001

curl -s http://127.0.0.1:4001/v1/health
curl -s -X POST http://127.0.0.1:4001/v1/dev/bootstrap
# Use returned IDs in headers:
curl -s -X POST http://127.0.0.1:4001/v1/commands/InviteMember \
  -H "content-type: application/json" \
  -H "x-os-organization-id: <orgId>" \
  -H "x-os-member-id: <memberId>" \
  -H "x-os-person-id: <personId>" \
  -H "x-os-auth-identity-id: <authId>" \
  -d '{"email":"runtime@isalwa.bo","givenName":"Runtime","familyName":"Test","roleKey":"sales_rep"}'
```

Observed: health `ok`, bootstrap returns session IDs, InviteMember returns `member.invited` event payload with `inviteRef`.

---

## Typecheck / build

```bash
export OS_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/isalwa_os"
npx pnpm@9.15.4 --filter @isalwa/os-contracts --filter @isalwa/os-database \
  --filter @isalwa/os-domain --filter @isalwa/os-events \
  --filter @isalwa/os-workforce --filter @isalwa/os-api build
```

---

## Open gaps (not architecture drift)

| ID | Gap | Classification | Next step |
|----|-----|----------------|-----------|
| GAP-10-01 | Prisma store adapter | FOUNDATION_GAP | Wire `WorkforceCommandService` to `os-database` |
| GAP-10-02 | Auth.js / production provider | INTEGRATION | Implement `AuthProviderPort` for real IdP |
| GAP-10-03 | `delegation.expired` scheduler | CROSS-LANE (D) | Outbox worker emits on expiry |
| GAP-10-04 | SG-03 break-glass | REQUIRES_DECISION | Governed workflow per Step 7 SG-03 |
| GAP-10-05 | Admin UI | UI lane | `apps/os-web` consumes same commands |
| GAP-10-06 | DB migration deploy | OPS | `pnpm --filter @isalwa/os-database migrate:deploy` against `OS_DATABASE_URL` |

---

## Architecture contract changes

**None.** Implementation follows Step 9 contracts and ADR-0012 Strategy B. No new event types or commands beyond `shared-contracts.yaml` foundation set.

---

## Next gate

**Step 10.5 / Step 11 readiness:** Prisma persistence adapter + migration deploy + production auth session before Lane D (outbox worker) and Commercial parity work.

Carmen approval required to mark Step 10 **PASS** (full) vs **CONDITIONAL PASS**.
