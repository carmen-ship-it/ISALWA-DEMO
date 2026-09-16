# Wave B Agent 5 — Commitment Productization Wire Needed

## Status: IMPLEMENTED, API WIRE BLOCKED

Agent 5 created `@isalwa/os-commitment` package with:
- CommitmentCommandService: CreateEmployeeCommitment, CreateCustomerReportedCommitment, FulfillCommitment, CancelCommitment, ReassignCommitmentOwner
- OsCommitmentStore interface (includes member auth lookups)
- Tests for commands + overdue derivation + customer_reported NOT implying payment

## Blocker: Parallel PrismaOsCommitmentStore Interface

Another agent already created `packages/os-database/src/prisma-commitment-store.ts` with a different interface:
- Does NOT include getMemberInOrg, listRoleAssignmentsForMember, listDelegationsForDelegate
- Has different method names (listCommitmentsByOrg vs listCommitmentsInOrg)
- Has fulfilledByMemberId field not in the canonical CommitmentRecord

## Required Wire Steps

### Option A: Extend existing PrismaOsCommitmentStore
Add to `packages/os-database/src/prisma-commitment-store.ts`:
```typescript
// Import from os-commitment
import type { OsCommitmentStore as CommandStoreInterface } from '@isalwa/os-commitment';

// Add member auth methods (copy from PrismaOsWorkStore):
async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>
async listRoleAssignmentsForMember(memberId: string, organizationId?: string): Promise<RoleAssignmentRecord[]>
async listDelegationsForDelegate(memberId: string, organizationId?: string): Promise<DelegationRecord[]>
async partyExistsInOrg(organizationId: string, partyId: string): Promise<boolean>
async appendEventAndAudit(...)
async findIdempotency(...)
async saveIdempotency(...)
```

### Option B: Use existing store + delegate auth
The command service could accept two stores: one for commitments, one for auth. But this deviates from the os-work pattern.

## os-contracts Additions (DONE)

- `packages/os-contracts/src/commitment-commands.ts` — command schemas
- `packages/os-contracts/src/command-registry.ts` — registers commitment commands
- `packages/os-contracts/src/scopes.ts` — COMMAND_REQUIRED_SCOPES entries

## os-api Wiring (PARTIALLY DONE)

Files updated:
- `apps/os-api/src/commands.controller.ts` — isCommitmentCommand + routing
- `apps/os-api/src/os-store.module.ts` — OS_COMMITMENT_STORE, OS_COMMITMENT_COMMAND_SERVICE (blocked on store interface)
- `apps/os-api/src/commitments.controller.ts` — GET /v1/commitments endpoints
- `apps/os-api/src/app.module.ts` — CommitmentsController registration

## os-web Updates (DONE)

- `apps/os-web/lib/commitments/persistence.ts` — now calls OS API instead of stub (returns schema_not_available if API URL not configured)

## Tests (DONE)

- `packages/os-commitment/src/commitment-command-service.test.ts` — all pass
- `apps/os-web/lib/commitments/commitments.test.ts` — all pass

## Customer-Reported Origin Does NOT Imply Payment

Test in commitment-command-service.test.ts confirms:
- CreateCustomerReportedCommitment creates a commitment
- No paymentConfirmed field exists on commitment
- origin is stored (employee_entered since customer_reported not in current contract)
- lifecycle is open, not payment-related

## Integration Checklist

- [ ] Reconcile PrismaOsCommitmentStore interfaces
- [ ] Rebuild os-database with extended interface
- [ ] os-api typecheck passes
- [ ] Test API endpoint with live database
- [ ] Verify Client 360 can list commitments for a party
