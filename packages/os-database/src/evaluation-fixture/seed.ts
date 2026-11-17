/**
 * Evaluation fixture seed — isolated evaluation database + org `isalwa-eval-demo-v1` ONLY.
 *
 * Idempotent EVALUACIÓN-labelled data for the real-app evaluation walkthrough, written through the
 * same command services as owner-demo (PartyCommandService, LocationCommandService,
 * CommercialCommandService, WorkCommandService, CommitmentCommandService). It does not restore the
 * old demo mode, OWNER_DEMO_SYNTH_ORG or any hard-coded fake company id, and it never gives the
 * shared reviewer people.admin / system.admin / master_data.admin / payments.confirm / audit scopes
 * or commercial.price.approve.
 *
 * T04 quote path (the reviewer never approves their own quote):
 *   draft -> RequestApproval (reviewer, WorkCommandService) -> Approve (separate Jefatura member)
 *   -> SubmitQuote -> RecordQuoteCustomerAcceptance -> CreateOrder
 *
 * Required:
 *   OS_DATABASE_URL        host must contain the evaluation project marker (guards.ts)
 *   EVALUATION_FIXTURE_CONFIRM=1
 *
 * Run:
 *   export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/evaluation-real-app-2026-11-17/database-url.txt | tr -d '\n')"
 *   EVALUATION_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:evaluation
 *
 * Receipts (no secrets):
 *   ~/.isalwa-secrets/evaluation-real-app-2026-11-17/evaluation-fixture-receipt.json
 *   docs/operations/commercial-release/receipts/EVALUATION-FIXTURE-SEED.md
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import {
  buildReportedOperationalFactRow,
  normalizePaymentReference,
  recordManualCustomerConversation,
  type RequestContext,
} from '@isalwa/os-contracts';
import { PartyCommandService, LocationCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { WorkCommandService } from '@isalwa/os-work';
import { CommitmentCommandService, type OsCommitmentStore } from '@isalwa/os-commitment';
import { getOsPrisma } from '../client';
import { PrismaOsPartyStore } from '../prisma-party-store';
import { PrismaOsCommercialStore } from '../prisma-commercial-store';
import { PrismaOsWorkStore } from '../prisma-work-store';
import { PrismaOsWorkforceStore } from '../prisma-workforce-store';
import { PrismaOsCommitmentStore } from '../prisma-commitment-store';
import { assertMigrationCount } from '../staging-wave2-role-fixtures-guards';
import {
  EVALUATION_COMMITMENTS,
  EVALUATION_COVERAGE_CUSTOMER_KEY,
  EVALUATION_CUSTOMERS,
  EVALUATION_PAYMENT_CUSTOMER_KEY,
  EVALUATION_PAYMENT_REPORT,
  assertEvaluationCatalogValid,
  evaluationCatalogMeta,
  evaluationConversationNaturalKey,
  type EvaluationCustomerKey,
  type EvaluationCustomerSpec,
} from './catalog';
import {
  ADVISOR_EVAL_EMAIL,
  ADVISOR_EVAL_FAMILY_NAME,
  ADVISOR_EVAL_GIVEN_NAME,
  ADVISOR_EVAL_SCOPES,
  EVALUACION_LABEL,
  EVALUACION_PREFIX,
  EVALUATION_DB_HOST_MARKER,
  EVALUATION_FIXTURE_CONFIRM_ENV,
  EVALUATION_ORG_SLUG,
  JEFE_EVAL_EMAIL,
  JEFE_EVAL_FAMILY_NAME,
  JEFE_EVAL_GIVEN_NAME,
  JEFE_EVAL_SCOPES,
  SHARED_REVIEWER_EMAIL,
  SHARED_REVIEWER_SCOPES,
  assertConversationPhrase,
  assertEvaluationConfirm,
  assertEvaluationDatabaseUrl,
  assertEvaluationOrgIdNotLegacyDemo,
  assertEvaluationOrgSlug,
  assertNoLegacyDemoEnv,
  assertReviewerScopesExact,
  assertSyntheticEvaluationEmail,
  evaluationFixtureProof,
  isForbiddenReviewerScope,
} from './guards';

const HERE = dirname(__filename);
const SECRETS_DIR = join(homedir(), '.isalwa-secrets', 'evaluation-real-app-2026-11-17');
const RECEIPT_JSON = join(SECRETS_DIR, 'evaluation-fixture-receipt.json');
const RECEIPT_MD = join(
  HERE,
  '../../../../docs/operations/commercial-release/receipts/EVALUATION-FIXTURE-SEED.md',
);

type Prisma = NonNullable<ReturnType<typeof getOsPrisma>>;

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

// ---------------------------------------------------------------------------
// Run statistics (created vs reused) — proves idempotency per entity.
// ---------------------------------------------------------------------------
type Stats = { created: Record<string, number>; reused: Record<string, number> };
const stats: Stats = { created: {}, reused: {} };
const blockers: string[] = [];

function mark(kind: 'created' | 'reused', entity: string): void {
  stats[kind][entity] = (stats[kind][entity] ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
type Actor = {
  key: 'reviewer' | 'jefe' | 'advisor';
  memberId: string;
  personId: string;
  authIdentityId: string;
  email: string;
};

function ctx(organizationId: string, actor: Actor): RequestContext {
  return {
    organizationId,
    actorMemberId: actor.memberId,
    personId: actor.personId,
    authIdentityId: actor.authIdentityId,
    correlationId: createId(),
    effectiveAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Members + scopes
// ---------------------------------------------------------------------------

async function ensureMemberRow(
  prisma: Prisma,
  organizationId: string,
  personId: string,
  entity: string,
): Promise<string> {
  const existing = await prisma.osOrganizationMember.findFirst({ where: { organizationId, personId } });
  if (!existing) {
    const id = createId();
    await prisma.osOrganizationMember.create({
      data: {
        id,
        organizationId,
        personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date(),
        version: 0,
      },
    });
    mark('created', entity);
    return id;
  }
  if (existing.accessStatus !== 'active' || existing.employmentStatus !== 'active') {
    await prisma.osOrganizationMember.update({
      where: { id: existing.id },
      data: { accessStatus: 'active', employmentStatus: 'active', employmentEndedAt: null, version: { increment: 1 } },
    });
    mark('created', `${entity}.reactivated`);
  } else {
    mark('reused', entity);
  }
  return existing.id;
}

/** Makes the member's active role assignments exactly `desired` (ends extras, adds missing). */
async function ensureExactScopes(
  prisma: Prisma,
  organizationId: string,
  memberId: string,
  desired: readonly string[],
  entity: string,
): Promise<string[]> {
  const now = new Date();
  const active = await prisma.osRoleAssignment.findMany({
    where: { organizationId, memberId, endedAt: null },
  });
  const seen = new Set<string>();
  for (const row of active) {
    if (!desired.includes(row.roleKey) || seen.has(row.roleKey)) {
      await prisma.osRoleAssignment.update({ where: { id: row.id }, data: { endedAt: now } });
      mark('created', `${entity}.scopeEnded`);
      log(`SCOPE_ENDED entity=${entity} scope=${row.roleKey}`);
    } else {
      seen.add(row.roleKey);
      mark('reused', `${entity}.scope`);
    }
  }
  for (const roleKey of desired) {
    if (seen.has(roleKey)) continue;
    await prisma.osRoleAssignment.create({
      data: { id: createId(), organizationId, memberId, roleKey, effectiveAt: now },
    });
    mark('created', `${entity}.scope`);
  }
  const final = await prisma.osRoleAssignment.findMany({
    where: { organizationId, memberId, endedAt: null },
    select: { roleKey: true },
  });
  return final.map((r) => r.roleKey).sort();
}

async function assertNoForbiddenDelegation(prisma: Prisma, organizationId: string, memberId: string): Promise<void> {
  const now = new Date();
  const delegations = await prisma.osDelegation.findMany({
    where: { organizationId, delegateMemberId: memberId, revokedAt: null, expiresAt: { gt: now } },
    select: { scopesJson: true },
  });
  for (const delegation of delegations) {
    const scopes = Array.isArray(delegation.scopesJson) ? delegation.scopesJson.map(String) : [];
    const forbidden = scopes.filter(isForbiddenReviewerScope);
    if (forbidden.length > 0) throw new Error(`EVALUATION_REVIEWER_FORBIDDEN_DELEGATION:${forbidden.join(',')}`);
  }
}

async function ensureSharedReviewer(prisma: Prisma, organizationId: string): Promise<Actor & { scopes: string[] }> {
  const auth = await prisma.osAuthIdentity.findFirst({
    where: { provider: 'supabase', email: { equals: SHARED_REVIEWER_EMAIL, mode: 'insensitive' } },
  });
  if (!auth) throw new Error('EVALUATION_SHARED_REVIEWER_AUTH_IDENTITY_MISSING');
  if (auth.status !== 'active') throw new Error(`EVALUATION_SHARED_REVIEWER_AUTH_NOT_ACTIVE:${auth.status}`);
  const memberId = await ensureMemberRow(prisma, organizationId, auth.personId, 'member.reviewer');
  const scopes = await ensureExactScopes(prisma, organizationId, memberId, SHARED_REVIEWER_SCOPES, 'reviewer');
  assertReviewerScopesExact(scopes);
  await assertNoForbiddenDelegation(prisma, organizationId, memberId);
  return {
    key: 'reviewer',
    memberId,
    personId: auth.personId,
    authIdentityId: auth.id,
    email: auth.email,
    scopes,
  };
}

async function ensureSyntheticMember(
  prisma: Prisma,
  organizationId: string,
  spec: {
    key: 'jefe' | 'advisor';
    email: string;
    givenName: string;
    familyName: string;
    scopes: readonly string[];
  },
): Promise<Actor & { scopes: string[] }> {
  assertSyntheticEvaluationEmail(spec.email);
  let auth = await prisma.osAuthIdentity.findFirst({ where: { provider: 'local-dev', email: spec.email } });
  let personId = auth?.personId;
  if (!auth) {
    personId = createId();
    await prisma.osPerson.create({
      data: { id: personId, givenName: spec.givenName, familyName: spec.familyName, version: 0 },
    });
    auth = await prisma.osAuthIdentity.create({
      data: {
        id: createId(),
        personId,
        provider: 'local-dev',
        providerSubject: `subject:${spec.email}`,
        email: spec.email,
        status: 'active',
        activatedAt: new Date(),
      },
    });
    mark('created', `auth.${spec.key}`);
  } else {
    mark('reused', `auth.${spec.key}`);
  }
  if (!personId) throw new Error('EVALUATION_SYNTHETIC_PERSON_MISSING');
  const memberId = await ensureMemberRow(prisma, organizationId, personId, `member.${spec.key}`);
  const scopes = await ensureExactScopes(prisma, organizationId, memberId, spec.scopes, spec.key);
  return { key: spec.key, memberId, personId, authIdentityId: auth.id, email: spec.email, scopes };
}

// ---------------------------------------------------------------------------
// Commitment store (same stores as apps/os-api CommitmentStoreAdapter; that adapter lives in an app
// and is not importable from a package, so the fixture composes the same three stores here).
// ---------------------------------------------------------------------------
function buildCommitmentStore(prisma: Prisma): OsCommitmentStore {
  const workforce = new PrismaOsWorkforceStore(prisma);
  const parties = new PrismaOsPartyStore(prisma);
  const compose = (commitments: PrismaOsCommitmentStore): OsCommitmentStore => {
    const store = {
      runInTransaction: <T>(fn: (scoped: OsCommitmentStore) => Promise<T>): Promise<T> =>
        commitments.runInTransaction(async (scoped) => fn(compose(scoped as unknown as PrismaOsCommitmentStore))),
      getMemberInOrg: async (organizationId: string, memberId: string) => {
        const member = await workforce.getMemberInOrg(organizationId, memberId);
        return member
          ? { id: member.id, organizationId: member.organizationId, accessStatus: member.accessStatus }
          : null;
      },
      listRoleAssignmentsForMember: async (memberId: string, organizationId?: string) =>
        (await workforce.listRoleAssignmentsForMember(memberId, organizationId)).map((r) => ({
          roleKey: r.roleKey,
          effectiveAt: r.effectiveAt,
          endedAt: r.endedAt,
        })),
      listDelegationsForDelegate: async (memberId: string, organizationId?: string) =>
        (await workforce.listDelegationsForDelegate(memberId, organizationId)).map((d) => ({
          delegatorMemberId: d.delegatorMemberId,
          organizationId: d.organizationId,
          delegator: d.delegator,
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
        })),
      partyExistsInOrg: async (organizationId: string, partyId: string) =>
        (await parties.getPartyInOrg(organizationId, partyId)) !== null,
      insertCommitment: (record: never) => commitments.insertCommitment(record),
      getCommitmentInOrg: (organizationId: string, id: string) => commitments.getCommitmentInOrg(organizationId, id),
      updateCommitment: (id: string, patch: never) => commitments.updateCommitment(id, patch),
      updateOpenCommitment: (organizationId: string, id: string, owner: string, patch: never) =>
        commitments.updateOpenCommitment(organizationId, id, owner, patch),
      insertCommitmentChange: (change: never) => commitments.insertCommitmentChange(change),
      admitCommitmentNotice: (notice: never) => commitments.admitCommitmentNotice(notice),
      resolveCommitmentNotices: (organizationId: string, id: string, options?: never) =>
        commitments.resolveCommitmentNotices(organizationId, id, options),
      listCommitmentsForParty: (organizationId: string, partyId: string) =>
        commitments.listCommitmentsByParty(organizationId, partyId),
      listCommitmentsForOwner: async (organizationId: string, owner: string, lifecycle?: string) => {
        const rows = await commitments.listCommitmentsByOwner(organizationId, owner);
        return lifecycle ? rows.filter((r) => r.lifecycle === lifecycle) : rows;
      },
      listCommitmentsInOrg: async (organizationId: string, lifecycle?: string) => {
        const rows = await commitments.listCommitmentsByOrg(organizationId);
        return lifecycle ? rows.filter((r) => r.lifecycle === lifecycle) : rows;
      },
      appendEventAndAudit: (event: never, outbox: never, audit: never) =>
        workforce.appendEventAndAudit(event, outbox, audit),
      findIdempotency: (organizationId: string, key: string) => workforce.findIdempotency(organizationId, key),
      saveIdempotency: (record: never) => workforce.saveIdempotency(record),
    };
    return store as unknown as OsCommitmentStore;
  };
  return compose(new PrismaOsCommitmentStore(prisma));
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
type CustomerIds = {
  key: EvaluationCustomerKey;
  spec: EvaluationCustomerSpec;
  partyId: string;
  contactId: string | null;
  locationId: string | null;
  opportunityId: string | null;
  quoteId: string | null;
  quoteNumber: string | null;
  quoteStatus: string | null;
  orderId: string | null;
  orderNumber: string | null;
  conversationId: string | null;
  commercialAccountId: string | null;
};

type Services = {
  organizationId: string;
  prisma: Prisma;
  reviewer: Actor;
  jefe: Actor;
  advisor: Actor;
  party: PartyCommandService;
  location: LocationCommandService;
  commercial: CommercialCommandService;
  work: WorkCommandService;
  commitment: CommitmentCommandService;
};

async function ensureCustomer(s: Services, spec: EvaluationCustomerSpec): Promise<CustomerIds> {
  const { prisma, organizationId } = s;
  const session = ctx(organizationId, s.reviewer);

  let party = await prisma.osParty.findFirst({ where: { organizationId, displayName: spec.displayName } });
  if (!party) {
    await s.party.execute('CreateParty', session, {
      partyKind: 'organization',
      displayName: spec.displayName,
      initialRoleKey: 'customer',
      createCommercialAccount: true,
      contact: { givenName: spec.contactGivenName, familyName: spec.contactFamilyName },
      phone: { country: 'BO', number: spec.phone },
      city: spec.city,
      department: spec.department,
      addressReference: spec.addressReference,
    });
    party = await prisma.osParty.findFirst({ where: { organizationId, displayName: spec.displayName } });
    if (!party) throw new Error(`EVALUATION_PARTY_NOT_CREATED:${spec.key}`);
    mark('created', 'party');
  } else {
    mark('reused', 'party');
  }

  // Contact: created inline by CreateParty; UpdateContact sets the title once.
  const contact = await prisma.osContact.findFirst({
    where: { organizationId, organizationPartyId: party.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!contact) throw new Error(`EVALUATION_CONTACT_MISSING:${spec.key}`);
  if (!contact.title) {
    await s.party.execute('UpdateContact', ctx(organizationId, s.reviewer), {
      organizationPartyId: party.id,
      contactId: contact.id,
      givenName: contact.givenName,
      familyName: contact.familyName,
      title: spec.contactTitle,
    });
    mark('created', 'contact.title');
  } else {
    mark('reused', 'contact');
  }

  // Location with coordinates (map data only — no claim that Mapbox works).
  let location = await prisma.osLocation.findFirst({
    where: { organizationId, partyId: party.id, label: spec.location.label, status: 'active' },
  });
  if (!location) {
    const created = await s.location.execute('CreateLocation', ctx(organizationId, s.reviewer), {
      partyId: party.id,
      label: spec.location.label,
      addressText: spec.location.addressText,
      latitude: spec.location.latitude,
      longitude: spec.location.longitude,
    });
    location = await prisma.osLocation.findUnique({ where: { id: String(created.data.locationId) } });
    mark('created', 'location');
  } else {
    mark('reused', 'location');
  }

  const account = await prisma.osCommercialAccount.findFirst({ where: { organizationId, partyId: party.id } });

  return {
    key: spec.key,
    spec,
    partyId: party.id,
    contactId: contact.id,
    locationId: location?.id ?? null,
    opportunityId: null,
    quoteId: null,
    quoteNumber: null,
    quoteStatus: null,
    orderId: null,
    orderNumber: null,
    conversationId: null,
    commercialAccountId: account?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// T04 quote path
// ---------------------------------------------------------------------------

/** Requests approval (reviewer = quote owner) and/or approves (separate Jefatura member). */
async function ensureQuoteApproval(
  s: Services,
  quoteId: string,
  want: 'pending' | 'approved',
  note: string,
): Promise<void> {
  const { prisma, organizationId } = s;
  if (s.jefe.memberId === s.reviewer.memberId) throw new Error('EVALUATION_APPROVER_MUST_DIFFER_FROM_REVIEWER');

  const requests = await prisma.osApprovalRequest.findMany({
    where: { organizationId, subjectType: 'quote', subjectId: quoteId },
    orderBy: { createdAt: 'asc' },
  });
  if (requests.some((r) => r.status === 'approved')) {
    mark('reused', 'approval.approved');
    return;
  }
  let pending = requests.find((r) => r.status === 'pending');
  if (!pending) {
    const requested = await s.work.execute('RequestApproval', ctx(organizationId, s.reviewer), {
      approverMemberId: s.jefe.memberId,
      subjectType: 'quote',
      subjectId: quoteId,
      context: { note },
    });
    mark('created', 'approval.requested');
    pending = await prisma.osApprovalRequest.findUniqueOrThrow({
      where: { id: String(requested.data.approvalRequestId) },
    });
  } else {
    mark('reused', 'approval.pending');
  }
  if (want === 'approved') {
    await s.work.execute('Approve', ctx(organizationId, s.jefe), {
      approvalRequestId: pending.id,
      reason: `${EVALUACION_PREFIX}Aprobación de ejemplo por Jefatura Comercial — Evaluación`,
    });
    mark('created', 'approval.approved');
  }
}

async function ensureOpportunityAndQuote(s: Services, ids: CustomerIds): Promise<void> {
  const { prisma, organizationId, reviewer } = s;
  const { spec } = ids;
  const line = spec.quote.line;

  let opportunity = await prisma.osOpportunity.findFirst({
    where: { organizationId, partyId: ids.partyId, title: spec.opportunity.title },
  });
  if (!opportunity) {
    const created = await s.commercial.execute('CreateOpportunity', ctx(organizationId, reviewer), {
      partyId: ids.partyId,
      title: spec.opportunity.title,
      stage: spec.opportunity.stage,
      expectedValueCentavos: line.unitPriceCentavos * line.quantity,
      sourceMetadata: { evaluation: true, label: EVALUACION_LABEL, customerKey: spec.key, story: spec.story },
    });
    opportunity = await prisma.osOpportunity.findUniqueOrThrow({ where: { id: String(created.data.opportunityId) } });
    mark('created', 'opportunity');
  } else {
    mark('reused', 'opportunity');
  }
  ids.opportunityId = opportunity.id;

  let quote = await prisma.osQuote.findFirst({
    where: { organizationId, partyId: ids.partyId, opportunityId: opportunity.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!quote) {
    const created = await s.commercial.execute('CreateQuote', ctx(organizationId, reviewer), {
      partyId: ids.partyId,
      opportunityId: opportunity.id,
      currency: 'BOB',
      notes: spec.quote.notes,
    });
    quote = await prisma.osQuote.findUniqueOrThrow({ where: { id: String(created.data.quoteId) } });
    mark('created', 'quote');
  } else {
    mark('reused', 'quote');
  }
  const quoteId = quote.id;

  const lineCount = await prisma.osQuoteLine.count({ where: { organizationId, quoteId } });
  if (lineCount === 0) {
    await s.commercial.execute('AddQuoteLine', ctx(organizationId, reviewer), {
      quoteId,
      description: line.description,
      quantity: line.quantity,
      unitLabel: line.unitLabel,
      unitPriceCentavos: line.unitPriceCentavos,
    });
    mark('created', 'quoteLine');
  } else {
    mark('reused', 'quoteLine');
  }

  const target = spec.quote.targetState;
  const status = async () =>
    (await prisma.osQuote.findUniqueOrThrow({ where: { id: quoteId } })).status;

  if (target === 'pending_approval') {
    await ensureQuoteApproval(s, quoteId, 'pending', `${EVALUACION_PREFIX}Solicitud de aprobación de precio — ejemplo`);
  }
  if (target === 'issued' || target === 'accepted_order') {
    if ((await status()) === 'draft') {
      await ensureQuoteApproval(s, quoteId, 'approved', `${EVALUACION_PREFIX}Solicitud de aprobación de precio — ejemplo`);
      await s.commercial.execute('SubmitQuote', ctx(organizationId, reviewer), { quoteId });
      mark('created', 'quote.issued');
    } else {
      mark('reused', 'quote.issued');
    }
  }
  if (target === 'accepted_order') {
    const current = await prisma.osQuote.findUniqueOrThrow({ where: { id: quoteId } });
    if (current.status === 'submitted') {
      await s.commercial.execute('RecordQuoteCustomerAcceptance', ctx(organizationId, reviewer), {
        quoteId,
        channel: 'llamada',
        acceptedOn: new Date().toISOString().slice(0, 10),
        evidence: `${EVALUACION_PREFIX}Aceptación de ejemplo registrada por llamada (dato sintético de evaluación)`,
        expectedRevision: current.revisionNumber,
      });
      mark('created', 'quote.accepted');
    } else {
      mark('reused', 'quote.accepted');
    }
    let order = await prisma.osOrder.findFirst({ where: { organizationId, quoteId } });
    if (!order) {
      const created = await s.commercial.execute('CreateOrder', ctx(organizationId, reviewer), { quoteId });
      order = await prisma.osOrder.findUniqueOrThrow({ where: { id: String(created.data.orderId) } });
      mark('created', 'order');
    } else {
      mark('reused', 'order');
    }
    ids.orderId = order.id;
    ids.orderNumber = order.orderNumber;
  }

  const final = await prisma.osQuote.findUniqueOrThrow({ where: { id: quoteId } });
  ids.quoteId = final.id;
  ids.quoteNumber = final.quoteNumber;
  ids.quoteStatus = final.status;
}

// ---------------------------------------------------------------------------
// Coverage (Jefatura grants the covering advisor commercial.work on one customer)
// ---------------------------------------------------------------------------
async function ensureCoverage(s: Services, ids: CustomerIds): Promise<string> {
  const { prisma, organizationId } = s;
  const now = new Date();
  const existing = await prisma.osCustomerCoverageGrant.findFirst({
    where: {
      organizationId,
      customerPartyId: ids.partyId,
      actingAdvisorMemberId: s.advisor.memberId,
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) {
    mark('reused', 'coverageGrant');
    return existing.id;
  }
  if (!ids.commercialAccountId) throw new Error('EVALUATION_COVERAGE_ACCOUNT_MISSING');
  const endsAt = new Date(now.getTime() + 29 * 86_400_000);
  const granted = await s.commercial.execute('GrantCustomerCoverage', ctx(organizationId, s.jefe), {
    commercialAccountId: ids.commercialAccountId,
    actingAdvisorMemberId: s.advisor.memberId,
    coveredActions: ['commercial.work'],
    endsAt: endsAt.toISOString(),
    note: `${EVALUACION_PREFIX}Cobertura de ejemplo para evaluación`,
  });
  mark('created', 'coverageGrant');
  return String(granted.data.grantId);
}

// ---------------------------------------------------------------------------
// Conversations (admit path: recordManualCustomerConversation, then prisma create/update)
// ---------------------------------------------------------------------------
async function ensureConversation(s: Services, ids: CustomerIds): Promise<string> {
  const { prisma, organizationId, reviewer } = s;
  const { spec } = ids;
  assertConversationPhrase(spec.conversation.summary);
  assertConversationPhrase(spec.conversation.pastedEvidence);

  const id = evaluationConversationNaturalKey(spec.key);
  const admitted = recordManualCustomerConversation({
    id,
    organizationId,
    customerId: ids.partyId,
    customerLabel: spec.displayName,
    contactLabel: `${spec.contactGivenName} ${spec.contactFamilyName}`.trim(),
    channel: spec.conversation.channel,
    occurredAt: '2026-11-16T15:00:00.000Z',
    enteredByMemberId: reviewer.memberId,
    enteredByLabel: `${EVALUACION_PREFIX}Carga de ejemplo`,
    summary: spec.conversation.summary,
    pastedEvidence: spec.conversation.pastedEvidence,
    reason: spec.conversation.reason,
    opportunityId: ids.opportunityId,
    quoteId: ids.quoteId,
    orderId: ids.orderId,
    customerQuestion: spec.conversation.customerQuestion,
    commitmentCandidate: null,
    possibleRequestedDate: null,
    nextAction: null,
  });
  if (!admitted.ok) throw new Error(`EVALUATION_CONVERSATION_ADMIT_FAILED:${spec.key}:${admitted.reason}`);
  const record = admitted.record;

  const existing = await prisma.osCustomerConversation.findUnique({ where: { id } });
  if (existing) {
    await prisma.osCustomerConversation.update({
      where: { id },
      data: {
        opportunityId: record.opportunityId,
        quoteId: record.quoteId,
        orderId: record.orderId,
        summary: record.summary,
        pastedEvidence: record.pastedEvidence,
        reason: record.reason,
        customerQuestion: record.customerQuestion,
        customerLabel: record.customerLabel,
        contactLabel: record.contactLabel,
      },
    });
    mark('reused', 'conversation');
    return id;
  }
  await prisma.osCustomerConversation.create({
    data: {
      id: record.id,
      organizationId: record.organizationId,
      customerId: record.customerId,
      customerLabel: record.customerLabel,
      contactLabel: record.contactLabel,
      channel: record.channel,
      occurredAt: new Date(record.occurredAt),
      enteredByMemberId: record.enteredByMemberId,
      enteredByLabel: record.enteredByLabel,
      summary: record.summary,
      pastedEvidence: record.pastedEvidence,
      reason: record.reason,
      opportunityId: record.opportunityId,
      quoteId: record.quoteId,
      orderId: record.orderId,
      customerQuestion: record.customerQuestion,
      commitmentCandidate: record.commitmentCandidate,
      possibleRequestedDate: null,
      nextAction: record.nextAction,
      source: record.source,
      provenance: record.provenance,
      advisorNumberStatus: record.advisorNumberStatus,
      createdAt: new Date(),
    },
  });
  mark('created', 'conversation');
  return id;
}

// ---------------------------------------------------------------------------
// Commitments (CreateEmployeeCommitment)
// ---------------------------------------------------------------------------
async function ensureCommitments(s: Services, byKey: Map<EvaluationCustomerKey, CustomerIds>): Promise<string[]> {
  const { prisma, organizationId, reviewer } = s;
  const out: string[] = [];
  for (const spec of EVALUATION_COMMITMENTS) {
    const customer = byKey.get(spec.customerKey);
    if (!customer) throw new Error(`EVALUATION_COMMITMENT_CUSTOMER_MISSING:${spec.customerKey}`);
    const live = await prisma.osCommitment.findMany({
      where: { organizationId, text: spec.text, lifecycle: { not: 'cancelled' } },
      orderBy: { createdAt: 'asc' },
    });
    const [oldest, ...twins] = live;
    if (oldest) {
      mark('reused', 'commitment');
      out.push(oldest.id);
      // Repair: a concurrent run can leave a twin. Keep the oldest, cancel the rest through the command.
      for (const twin of twins) {
        if (twin.lifecycle !== 'open') continue;
        await s.commitment.execute('CancelCommitment', ctx(organizationId, reviewer), {
          commitmentId: twin.id,
          reason: `${EVALUACION_PREFIX}Duplicado de una ejecución simultánea del fixture`,
        });
        mark('created', 'commitment.duplicateCancelled');
      }
      continue;
    }
    const dueAt = new Date(Date.now() + spec.dueInDays * 86_400_000).toISOString();
    const created = await s.commitment.execute('CreateEmployeeCommitment', ctx(organizationId, reviewer), {
      text: spec.text,
      ownerMemberId: reviewer.memberId,
      partyId: customer.partyId,
      dueAt,
      relatedSubjectType: customer.quoteId ? 'quote' : 'party',
      relatedSubjectId: customer.quoteId ?? customer.partyId,
    });
    out.push(String(created.data.commitmentId));
    mark('created', 'commitment');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Payment report (command-equivalent write: RecordPaymentReport is an HTTP controller in os-api)
// ---------------------------------------------------------------------------
async function ensurePaymentReport(s: Services, ids: CustomerIds): Promise<string | null> {
  const { prisma, organizationId, reviewer } = s;
  const key = `payment-report:${EVALUATION_PAYMENT_REPORT.idempotencyKey}`;
  const existing = await prisma.osReportedOperationalFact.findFirst({
    where: { organizationId, kind: 'payment', idempotencyKey: key },
  });
  if (existing) {
    mark('reused', 'paymentReport');
    return existing.id;
  }
  const now = new Date();
  const factId = createId();
  const row = buildReportedOperationalFactRow(
    {
      id: factId,
      organizationId,
      kind: 'payment',
      subjectType: ids.orderId ? 'order' : 'party',
      subjectId: ids.orderId ?? ids.partyId,
      reportedAt: now.toISOString(),
      reportedByLabel: `${EVALUACION_PREFIX}Carga de ejemplo`,
      reportedByMemberId: reviewer.memberId,
      note: EVALUATION_PAYMENT_REPORT.note,
      idempotencyKey: key,
      payload: {
        amountCentavos: EVALUATION_PAYMENT_REPORT.totalCentavos,
        currency: 'BOB',
        tenders: [{ method: EVALUATION_PAYMENT_REPORT.method, amountCentavos: EVALUATION_PAYMENT_REPORT.totalCentavos }],
      },
    },
    now.toISOString(),
  );
  await prisma.$transaction(async (tx) => {
    await tx.osReportedOperationalFact.create({
      data: {
        id: row.id,
        organizationId: row.organization_id,
        kind: row.kind,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        reportedAt: new Date(row.reported_at),
        reportedByMemberId: row.reported_by_member_id,
        reportedByLabel: row.reported_by_label,
        source: row.source,
        confirmation: 'pending',
        activity: 'active',
        sourceReference: null,
        note: row.note,
        payloadJson: row.payload_json as never,
        correctsFactId: null,
        idempotencyKey: row.idempotency_key,
        createdAt: new Date(row.created_at),
        customerPartyId: ids.partyId,
        intendedOrderId: ids.orderId,
        paidOn: new Date(`${EVALUATION_PAYMENT_REPORT.paidOn}T00:00:00.000Z`),
      },
    });
    await tx.osPaymentTender.createMany({
      data: [
        {
          id: createId(),
          organizationId,
          factId,
          seq: 1,
          method: EVALUATION_PAYMENT_REPORT.method,
          amountCentavos: BigInt(EVALUATION_PAYMENT_REPORT.totalCentavos),
          reference: EVALUATION_PAYMENT_REPORT.reference,
          referenceNormalized: normalizePaymentReference(EVALUATION_PAYMENT_REPORT.reference),
          cashRecipientMemberId: null,
          cashRecipientLabel: null,
          cashRecipientUnresolvedReason: null,
          verification: 'pending',
        },
      ],
    });
  });
  mark('created', 'paymentReport');
  return factId;
}

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------
async function collectCounts(
  prisma: Prisma,
  organizationId: string,
  memberIds: { reviewer: string; jefe: string; advisor: string },
): Promise<Record<string, unknown>> {
  const parties = await prisma.osParty.findMany({
    where: { organizationId, displayName: { startsWith: EVALUACION_PREFIX } },
    select: { id: true },
  });
  const partyIds = parties.map((p) => p.id);
  const quotesByStatus = await prisma.osQuote.groupBy({
    by: ['status'],
    where: { organizationId, partyId: { in: partyIds } },
    _count: { _all: true },
  });
  const approvalsByStatus = await prisma.osApprovalRequest.groupBy({
    by: ['status'],
    where: { organizationId, subjectType: 'quote' },
    _count: { _all: true },
  });
  const now = new Date();
  const [
    contacts,
    locations,
    locationsWithCoords,
    opportunities,
    quotes,
    quoteLines,
    orders,
    coverageActive,
    conversations,
    commitments,
    paymentReports,
    paymentTenders,
    approvalsDecidedByReviewer,
    partiesOrgTotal,
  ] = await Promise.all([
    prisma.osContact.count({ where: { organizationId, organizationPartyId: { in: partyIds } } }),
    prisma.osLocation.count({ where: { organizationId, partyId: { in: partyIds } } }),
    prisma.osLocation.count({
      where: { organizationId, partyId: { in: partyIds }, latitude: { not: null }, longitude: { not: null } },
    }),
    prisma.osOpportunity.count({ where: { organizationId, partyId: { in: partyIds } } }),
    prisma.osQuote.count({ where: { organizationId, partyId: { in: partyIds } } }),
    prisma.osQuoteLine.count({ where: { organizationId, quote: { partyId: { in: partyIds } } } }),
    prisma.osOrder.count({ where: { organizationId, partyId: { in: partyIds } } }),
    prisma.osCustomerCoverageGrant.count({
      where: {
        organizationId,
        customerPartyId: { in: partyIds },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    }),
    prisma.osCustomerConversation.count({
      where: { organizationId, id: { startsWith: 'evaluation-conversation:' } },
    }),
    prisma.osCommitment.count({
      where: { organizationId, text: { startsWith: EVALUACION_PREFIX }, lifecycle: { not: 'cancelled' } },
    }),
    prisma.osReportedOperationalFact.count({
      where: { organizationId, kind: 'payment', idempotencyKey: { startsWith: 'payment-report:evaluation-fixture:' } },
    }),
    prisma.osPaymentTender.count({
      where: { organizationId, fact: { idempotencyKey: { startsWith: 'payment-report:evaluation-fixture:' } } },
    }),
    prisma.osApprovalRequest.count({
      where: { organizationId, decisionByMemberId: memberIds.reviewer },
    }),
    prisma.osParty.count({ where: { organizationId } }),
  ]);
  const scopes = async (memberId: string) =>
    (
      await prisma.osRoleAssignment.findMany({
        where: { organizationId, memberId, endedAt: null },
        select: { roleKey: true },
      })
    )
      .map((r) => r.roleKey)
      .sort();
  return {
    parties: partyIds.length,
    partiesInOrgTotal: partiesOrgTotal,
    contacts,
    locations,
    locationsWithCoordinates: locationsWithCoords,
    opportunities,
    quotes,
    quotesByStatus: Object.fromEntries(quotesByStatus.map((r) => [r.status, r._count._all])),
    quoteLines,
    orders,
    quoteApprovalsByStatus: Object.fromEntries(approvalsByStatus.map((r) => [r.status, r._count._all])),
    approvalsDecidedByReviewer,
    coverageGrantsActive: coverageActive,
    conversations,
    commitments,
    paymentReports,
    paymentTenders,
    reviewerScopes: await scopes(memberIds.reviewer),
    jefeScopes: await scopes(memberIds.jefe),
    advisorScopes: await scopes(memberIds.advisor),
  };
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------
type RunEntry = {
  at: string;
  created: Record<string, number>;
  reused: Record<string, number>;
  totals: Record<string, unknown>;
};

function sumValues(map: Record<string, number>): number {
  return Object.values(map).reduce((a, b) => a + b, 0);
}

function renderMarkdown(receipt: {
  runs: RunEntry[];
  blockers: string[];
  catalog: ReturnType<typeof evaluationCatalogMeta>;
}): string {
  const lines: string[] = [];
  lines.push('# Receipt — Evaluation fixture seed (EVALUACIÓN)');
  lines.push('');
  lines.push(
    `Org slug \`${EVALUATION_ORG_SLUG}\` · database host marker \`${EVALUATION_DB_HOST_MARKER}\`. Counts only: no ids, passwords, URLs or keys.`,
  );
  lines.push('');
  lines.push(
    'Tool: `packages/os-database/src/evaluation-fixture/seed.ts` (`pnpm --filter @isalwa/os-database run fixture:evaluation`, needs `EVALUATION_FIXTURE_CONFIRM=1`). ' +
      'Same command services as owner-demo; it does not restore the old demo mode or fake company ids. All rows are labelled EVALUACIÓN. ' +
      'No catalog products or real prices are invented: every quote line is a free-text example with a symbolic price (BOB 1.00 per unit, "no es precio de catálogo"). ' +
      'The map data is latitude/longitude only; nothing here claims Mapbox works.',
  );
  lines.push('');
  lines.push('## T04 quote path (one quote per state)');
  lines.push('');
  lines.push(
    'draft → `RequestApproval` (shared reviewer, quote owner) → `Approve` (separate Jefatura — Evaluación member) → `SubmitQuote` → `RecordQuoteCustomerAcceptance` → `CreateOrder`. ' +
      'The shared reviewer never holds `commercial.price.approve` and never decides an approval (`approvalsDecidedByReviewer` = 0).',
  );
  lines.push('');
  lines.push('## Totals per run (EVALUACIÓN-labelled rows)');
  lines.push('');
  const totalKeys = Object.keys(receipt.runs[receipt.runs.length - 1]?.totals ?? {}).filter(
    (k) => typeof receipt.runs[0]?.totals[k] === 'number',
  );
  lines.push(`| Entity | ${receipt.runs.map((_, i) => `Run ${i + 1}`).join(' | ')} |`);
  lines.push(`|---|${receipt.runs.map(() => '---:').join('|')}|`);
  for (const key of totalKeys) {
    lines.push(`| ${key} | ${receipt.runs.map((r) => String(r.totals[key])).join(' | ')} |`);
  }
  lines.push('');
  lines.push('## Created vs reused per run');
  lines.push('');
  lines.push('| Run | Created (sum) | Reused (sum) |');
  lines.push('|---|---:|---:|');
  receipt.runs.forEach((r, i) => lines.push(`| ${i + 1} | ${sumValues(r.created)} | ${sumValues(r.reused)} |`));
  lines.push('');
  const latest = receipt.runs[receipt.runs.length - 1];
  if (latest) {
    lines.push('### Quotes by status / approvals by status (latest run)');
    lines.push('');
    lines.push(`- quotes: \`${JSON.stringify(latest.totals.quotesByStatus)}\``);
    lines.push(`- quote approvals: \`${JSON.stringify(latest.totals.quoteApprovalsByStatus)}\``);
    lines.push('');
    lines.push('### Member scopes (latest run)');
    lines.push('');
    lines.push(`- Shared reviewer (\`${SHARED_REVIEWER_EMAIL}\`): \`${JSON.stringify(latest.totals.reviewerScopes)}\``);
    lines.push(`- Jefatura Comercial — Evaluación: \`${JSON.stringify(latest.totals.jefeScopes)}\``);
    lines.push(`- Asesor Cobertura — Evaluación: \`${JSON.stringify(latest.totals.advisorScopes)}\``);
    lines.push('');
  }
  lines.push('## Blockers / notes');
  lines.push('');
  if (receipt.blockers.length === 0) lines.push('- None in the latest run.');
  else for (const b of receipt.blockers) lines.push(`- ${b}`);
  lines.push('');
  lines.push(
    '- Payments: one `payment` report (pending tender, transfer) is written with the same rows `RecordPaymentReport` writes (that command is an HTTP controller in os-api, not a service). It is not verified: the fixture never holds `payments.confirm`.',
  );
  lines.push('- Conversations carry the exact phrase "Evaluación — conversación de ejemplo, sin conexión a Meta/WhatsApp"; no provider is connected.');
  lines.push('');
  return lines.join('\n');
}

function writeReceipts(run: RunEntry, extra: Record<string, unknown>): void {
  mkdirSync(SECRETS_DIR, { recursive: true });
  let runs: RunEntry[] = [];
  if (existsSync(RECEIPT_JSON)) {
    try {
      const prior = JSON.parse(readFileSync(RECEIPT_JSON, 'utf8')) as { runs?: RunEntry[] };
      runs = prior.runs ?? [];
    } catch {
      runs = [];
    }
  }
  runs.push(run);
  const catalog = evaluationCatalogMeta();
  const receipt = {
    purpose: 'evaluation-fixture-seed',
    organizationSlug: EVALUATION_ORG_SLUG,
    databaseHostMarker: EVALUATION_DB_HOST_MARKER,
    proof: evaluationFixtureProof(),
    catalog,
    ...extra,
    blockers,
    runs,
    secretsIncluded: false,
  };
  writeFileSync(RECEIPT_JSON, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  log(`EVALUATION_RECEIPT_JSON ${RECEIPT_JSON}`);
  try {
    mkdirSync(dirname(RECEIPT_MD), { recursive: true });
    writeFileSync(RECEIPT_MD, renderMarkdown({ runs, blockers, catalog }));
    log(`EVALUATION_RECEIPT_MD ${RECEIPT_MD}`);
  } catch (err) {
    log(`EVALUATION_RECEIPT_MD_SKIP ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// One run at a time on this machine: two simultaneous runs race on natural keys.
// ---------------------------------------------------------------------------
const RUN_LOCK = join(tmpdir(), 'isalwa-evaluation-fixture.lock');

function acquireRunLock(): void {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(RUN_LOCK, String(process.pid), { flag: 'wx' });
      return;
    } catch {
      let holder = 0;
      try {
        holder = Number(readFileSync(RUN_LOCK, 'utf8'));
        if (holder > 0) process.kill(holder, 0);
      } catch {
        rmSync(RUN_LOCK, { force: true }); // stale lock: the holder is gone
        continue;
      }
      throw new Error('EVALUATION_FIXTURE_ALREADY_RUNNING');
    }
  }
  throw new Error('EVALUATION_FIXTURE_ALREADY_RUNNING');
}

function releaseRunLock(): void {
  try {
    if (Number(readFileSync(RUN_LOCK, 'utf8')) === process.pid) rmSync(RUN_LOCK, { force: true });
  } catch {
    // already gone
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  assertEvaluationConfirm(process.env[EVALUATION_FIXTURE_CONFIRM_ENV]);
  acquireRunLock();
  assertNoLegacyDemoEnv(process.env);
  assertEvaluationCatalogValid();
  assertEvaluationDatabaseUrl(process.env.OS_DATABASE_URL);

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const migrationRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  assertMigrationCount(Number(migrationRows[0]?.count ?? -1));

  const org = await prisma.osOrganization.findUnique({ where: { slug: EVALUATION_ORG_SLUG } });
  if (!org) throw new Error('EVALUATION_ORG_MISSING');
  assertEvaluationOrgSlug(org.slug);
  assertEvaluationOrgIdNotLegacyDemo(org.id);
  const organizationId = org.id;
  log(`EVALUATION_ORG slug=${org.slug} status=${org.status}`);

  const reviewer = await ensureSharedReviewer(prisma, organizationId);
  const jefe = await ensureSyntheticMember(prisma, organizationId, {
    key: 'jefe',
    email: JEFE_EVAL_EMAIL,
    givenName: JEFE_EVAL_GIVEN_NAME,
    familyName: JEFE_EVAL_FAMILY_NAME,
    scopes: JEFE_EVAL_SCOPES,
  });
  const advisor = await ensureSyntheticMember(prisma, organizationId, {
    key: 'advisor',
    email: ADVISOR_EVAL_EMAIL,
    givenName: ADVISOR_EVAL_GIVEN_NAME,
    familyName: ADVISOR_EVAL_FAMILY_NAME,
    scopes: ADVISOR_EVAL_SCOPES,
  });
  if (new Set([reviewer.memberId, jefe.memberId, advisor.memberId]).size !== 3) {
    throw new Error('EVALUATION_MEMBERS_NOT_DISTINCT');
  }
  log(`EVALUATION_REVIEWER_SCOPES ${reviewer.scopes.join(',')}`);

  const services: Services = {
    organizationId,
    prisma,
    reviewer,
    jefe,
    advisor,
    party: new PartyCommandService(new PrismaOsPartyStore(prisma)),
    location: new LocationCommandService(new PrismaOsPartyStore(prisma)),
    commercial: new CommercialCommandService(new PrismaOsCommercialStore(prisma)),
    work: new WorkCommandService(new PrismaOsWorkStore(prisma)),
    commitment: new CommitmentCommandService(buildCommitmentStore(prisma)),
  };

  const customers = new Map<EvaluationCustomerKey, CustomerIds>();
  for (const spec of EVALUATION_CUSTOMERS) {
    const ids = await ensureCustomer(services, spec);
    await ensureOpportunityAndQuote(services, ids);
    log(`CUSTOMER key=${spec.key} quote=${ids.quoteStatus} order=${ids.orderNumber ?? 'none'}`);
    customers.set(spec.key, ids);
  }

  const coverageCustomer = customers.get(EVALUATION_COVERAGE_CUSTOMER_KEY);
  if (!coverageCustomer) throw new Error('EVALUATION_COVERAGE_CUSTOMER_MISSING');
  const coverageGrantId = await ensureCoverage(services, coverageCustomer);

  for (const ids of customers.values()) {
    ids.conversationId = await ensureConversation(services, ids);
  }
  const commitmentIds = await ensureCommitments(services, customers);

  let paymentReportId: string | null = null;
  const paymentCustomer = customers.get(EVALUATION_PAYMENT_CUSTOMER_KEY);
  try {
    if (!paymentCustomer) throw new Error('payment customer missing');
    paymentReportId = await ensurePaymentReport(services, paymentCustomer);
  } catch (err) {
    blockers.push(
      `Payment report not seeded: ${err instanceof Error ? err.message : String(err)} (continued without it).`,
    );
  }

  const totals = await collectCounts(prisma, organizationId, {
    reviewer: reviewer.memberId,
    jefe: jefe.memberId,
    advisor: advisor.memberId,
  });
  assertReviewerScopesExact(totals.reviewerScopes as string[]);
  if (totals.approvalsDecidedByReviewer !== 0) throw new Error('EVALUATION_REVIEWER_DECIDED_AN_APPROVAL');

  writeReceipts(
    {
      at: new Date().toISOString(),
      created: { ...stats.created },
      reused: { ...stats.reused },
      totals,
    },
    {
      members: {
        reviewer: { email: reviewer.email, scopes: reviewer.scopes },
        jefe: { email: jefe.email, scopes: jefe.scopes },
        advisor: { email: advisor.email, scopes: advisor.scopes },
      },
      customers: [...customers.values()].map((c) => ({
        key: c.key,
        partyId: c.partyId,
        opportunityId: c.opportunityId,
        quoteId: c.quoteId,
        quoteStatus: c.quoteStatus,
        orderId: c.orderId,
        conversationId: c.conversationId,
      })),
      coverageGrantId,
      commitmentIds,
      paymentReportId,
    },
  );

  log(
    JSON.stringify({
      ok: true,
      created: sumValues(stats.created),
      reused: sumValues(stats.reused),
      totals: {
        parties: totals.parties,
        quotes: totals.quotes,
        quotesByStatus: totals.quotesByStatus,
        orders: totals.orders,
        conversations: totals.conversations,
        commitments: totals.commitments,
        coverageGrantsActive: totals.coverageGrantsActive,
        paymentReports: totals.paymentReports,
      },
      blockers,
    }),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(async () => {
    releaseRunLock();
    await getOsPrisma()?.$disconnect();
  });
