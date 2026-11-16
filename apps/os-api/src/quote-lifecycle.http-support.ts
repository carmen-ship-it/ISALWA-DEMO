import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';

/**
 * Test support for the T04 quote lifecycle over HTTP (disposable Postgres only):
 * draft → request approval of the exact terms → approve → issue → record acceptance → CreateOrder.
 * Not imported by production code.
 */

export type SyntheticSession = {
  member: { id: string };
  person: { id: string };
  auth: { id: string };
};

export function sessionHeadersFor(orgId: string, session: SyntheticSession): Record<string, string> {
  return {
    'x-os-organization-id': orgId,
    'x-os-member-id': session.member.id,
    'x-os-person-id': session.person.id,
    'x-os-auth-identity-id': session.auth.id,
    'content-type': 'application/json',
  };
}

/** An explicitly synthetic member that holds commercial.price.approve in its own right. */
export async function seedSyntheticPriceApprover(orgId: string, email: string): Promise<SyntheticSession> {
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('Postgres required');
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
  return { member: { id: memberId }, person: { id: personId }, auth: { id: authId } };
}

async function post(baseUrl: string, command: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(`${baseUrl}/v1/commands/${command}`, {
    method: 'POST',
    // A fresh key per command: callers reuse one header set for the whole lifecycle.
    headers: { ...headers, 'idempotency-key': createId() },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown> };
  return { status: res.status, body: json };
}

async function currentRevision(quoteId: string): Promise<number> {
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('Postgres required');
  const row = await prisma.osQuote.findUnique({ where: { id: quoteId }, select: { revisionNumber: true } });
  if (!row) throw new Error(`quote ${quoteId} not found`);
  return row.revisionNumber;
}

/** Requests approval of the quote's current revision and has the approver approve it. */
export async function approveQuoteOverHttp(input: {
  baseUrl: string;
  ownerHeaders: Record<string, string>;
  approverHeaders: Record<string, string>;
  quoteId: string;
}): Promise<void> {
  const requested = await post(input.baseUrl, 'RequestApproval', input.ownerHeaders, {
    approverMemberId: input.approverHeaders['x-os-member-id'],
    subjectType: 'quote',
    subjectId: input.quoteId,
  });
  if (requested.status !== 201) throw new Error(`RequestApproval ${requested.status}`);
  const approved = await post(input.baseUrl, 'Approve', input.approverHeaders, {
    approvalRequestId: String(requested.body.data?.approvalRequestId),
  });
  if (approved.status !== 201) throw new Error(`Approve ${approved.status}`);
}

/** Approve the current revision, issue it (SubmitQuote) and record the customer's acceptance. */
export async function issueAndAcceptOverHttp(input: {
  baseUrl: string;
  ownerHeaders: Record<string, string>;
  approverHeaders: Record<string, string>;
  quoteId: string;
}): Promise<void> {
  await approveQuoteOverHttp(input);
  const issued = await post(input.baseUrl, 'SubmitQuote', input.ownerHeaders, { quoteId: input.quoteId });
  if (issued.status !== 201) throw new Error(`SubmitQuote ${issued.status}`);
  const accepted = await post(input.baseUrl, 'RecordQuoteCustomerAcceptance', input.ownerHeaders, {
    quoteId: input.quoteId,
    channel: 'llamada',
    acceptedOn: new Date().toISOString().slice(0, 10),
    evidence: 'Confirmó por llamada con el vendedor',
    expectedRevision: await currentRevision(input.quoteId),
  });
  if (accepted.status !== 201) throw new Error(`RecordQuoteCustomerAcceptance ${accepted.status}`);
}
