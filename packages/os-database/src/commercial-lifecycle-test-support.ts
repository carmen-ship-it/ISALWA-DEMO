import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import type { CommercialCommandService } from '@isalwa/os-commercial';
import type { WorkCommandService } from '@isalwa/os-work';
import type { getOsPrisma } from './index';

/**
 * Test support for the T04 quote lifecycle against Postgres:
 * draft → request approval (bound revision) → approve → issue → record acceptance → CreateOrder.
 * Not exported from the package index; integration tests only.
 */

type Prisma = NonNullable<ReturnType<typeof getOsPrisma>>;

/** An explicitly synthetic member that holds commercial.price.approve in its own right. */
export async function seedSyntheticPriceApprover(prisma: Prisma, orgId: string, email: string) {
  const personId = createId();
  const memberId = createId();
  const authId = createId();
  await prisma.osPerson.create({ data: { id: personId, givenName: 'Synthetic', familyName: 'Approver' } });
  await prisma.osOrganizationMember.create({
    data: {
      id: memberId,
      organizationId: orgId,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date(),
      version: 0,
    },
  });
  await prisma.osAuthIdentity.create({
    data: {
      id: authId,
      personId,
      provider: 'local-dev',
      providerSubject: `subject:${email}`,
      email,
      status: 'active',
      activatedAt: new Date(),
    },
  });
  await prisma.osRoleAssignment.create({
    data: {
      id: createId(),
      organizationId: orgId,
      memberId,
      roleKey: 'commercial.price.approve',
      effectiveAt: new Date('2020-01-01'),
    },
  });
  return { memberId, personId, authId };
}

export function contextFor(
  orgId: string,
  member: { memberId: string; personId: string; authId: string },
  effectiveAt = new Date('2026-08-24T12:00:00Z'),
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: member.memberId,
    personId: member.personId,
    authIdentityId: member.authId,
    correlationId: createId(),
    effectiveAt,
  };
}

/** Requests and records approval of the quote's current revision. Returns the approval request id. */
export async function approveQuoteRevision(input: {
  workSvc: WorkCommandService;
  ownerCtx: RequestContext;
  approverCtx: RequestContext;
  quoteId: string;
}): Promise<string> {
  const requested = await input.workSvc.execute('RequestApproval', input.ownerCtx, {
    approverMemberId: input.approverCtx.actorMemberId,
    subjectType: 'quote',
    subjectId: input.quoteId,
  });
  const approvalRequestId = String(requested.data.approvalRequestId);
  await input.workSvc.execute('Approve', input.approverCtx, { approvalRequestId });
  return approvalRequestId;
}

/**
 * Approve (current revision) → issue → record the customer's acceptance.
 * expectedRevision is the quote's current revision (1 + number of material changes).
 */
export async function issueAndAcceptQuote(input: {
  commercialSvc: CommercialCommandService;
  workSvc: WorkCommandService;
  ownerCtx: RequestContext;
  approverCtx: RequestContext;
  quoteId: string;
  expectedRevision: number;
}): Promise<void> {
  await approveQuoteRevision(input);
  await input.commercialSvc.execute('SubmitQuote', input.ownerCtx, { quoteId: input.quoteId });
  await input.commercialSvc.execute('RecordQuoteCustomerAcceptance', input.ownerCtx, {
    quoteId: input.quoteId,
    channel: 'llamada',
    acceptedOn: input.ownerCtx.effectiveAt.toISOString().slice(0, 10),
    evidence: 'Confirmó por llamada con el vendedor',
    expectedRevision: input.expectedRevision,
  });
}
