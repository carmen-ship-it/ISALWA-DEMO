/**
 * Idempotent SYNTH journey customer — DEMO TALLER SAN LORENZO.
 *
 * Smallest reviewable insert: one party, one contact, one location, plus the
 * commercial-account owner pointer required for w2.asesor. No opportunity,
 * quote, Pedido, work, production, warehouse ingreso, Compras, nota, salida,
 * or entrega.
 *
 * Demo identity uses the existing `DEMO ` prefix only. Does not rewrite the
 * five-client seed and does not replace last-seed-ids.json.
 *
 * Dry-run (default, no writes):
 *   corepack pnpm --filter @isalwa/os-database run fixture:owner-demo:journey-customer
 *
 * Apply (staging SYNTH only, after guards):
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo:journey-customer -- --apply
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService, LocationCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { getOsPrisma } from '../client';
import { PrismaOsPartyStore } from '../prisma-party-store';
import { PrismaOsCommercialStore } from '../prisma-commercial-store';
import {
  STAGING_FIXTURE_CONFIRM_VALUE,
  requireEnvFrom,
} from '../staging-wave2-role-fixtures-guards';
import {
  OWNER_DEMO_REAL_ORG,
  OWNER_DEMO_REAL_SEVEN,
  OWNER_DEMO_SYNTH_ORG,
  assertOwnerDemoConfirm,
  realSevenMutationProof,
} from './guards';
import {
  JOURNEY_CUSTOMER,
  JOURNEY_CUSTOMER_INTENDED_INSERTS,
  JOURNEY_CUSTOMER_OWNER_EMAIL,
  JOURNEY_CUSTOMER_PARTY_ACTOR_EMAILS,
  PROTECTED_FIVE_DEMO_PARTY_IDS,
  assertJourneyCustomerIdentity,
  assertNoForbiddenEngineeringLabels,
  assertPipelineCountsZero,
  assertProtectedFiveUnchanged,
  assertRealSevenUnchanged,
  assertStagingSynthEnvironment,
  decideJourneyCustomerAction,
  demoModeVisibility,
  intendedInsertPlan,
  matchingJourneyParty,
  resolveExactlyOneActiveOwner,
  rowIdentifiesProtectedRealName,
  type JourneyExistingParty,
  type JourneyOwnerCandidate,
  type JourneyPipelineCounts,
} from './journey-customer';

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function ctx(
  orgId: string,
  memberId: string,
  personId: string,
  authId: string,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: memberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: new Date(),
  };
}

function loadStagingDatabaseUrl(): string {
  if (process.env.OS_DATABASE_URL?.trim()) return process.env.OS_DATABASE_URL.trim();
  const secretPath = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging.external-database-url');
  if (!existsSync(secretPath)) {
    throw new Error('JOURNEY_CUSTOMER_DATABASE_URL_MISSING');
  }
  const value = readFileSync(secretPath, 'utf8').trim();
  if (!value) throw new Error('JOURNEY_CUSTOMER_DATABASE_URL_EMPTY');
  process.env.OS_DATABASE_URL = value;
  return value;
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/`;
  } catch {
    return '(unparseable-url)';
  }
}

type PrismaClient = NonNullable<ReturnType<typeof getOsPrisma>>;

async function resolveMembersByEmail(
  prisma: PrismaClient,
  orgId: string,
  email: string,
): Promise<JourneyOwnerCandidate[]> {
  const auths = await prisma.osAuthIdentity.findMany({
    where: { email: { equals: email, mode: 'insensitive' }, status: 'active' },
    select: { id: true, personId: true, email: true },
  });
  const out: JourneyOwnerCandidate[] = [];
  for (const auth of auths) {
    const members = await prisma.osOrganizationMember.findMany({
      where: { organizationId: orgId, personId: auth.personId, accessStatus: 'active' },
      select: { id: true, personId: true, accessStatus: true, organizationId: true },
    });
    for (const member of members) {
      out.push({
        memberId: member.id,
        personId: member.personId,
        authIdentityId: auth.id,
        email: auth.email,
        accessStatus: member.accessStatus,
        organizationId: member.organizationId,
      });
    }
  }
  return out;
}

async function resolvePartyActor(
  prisma: PrismaClient,
  orgId: string,
): Promise<JourneyOwnerCandidate> {
  for (const email of JOURNEY_CUSTOMER_PARTY_ACTOR_EMAILS) {
    const matches = await resolveMembersByEmail(prisma, orgId, email);
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) {
      throw new Error(`JOURNEY_CUSTOMER_PARTY_ACTOR_AMBIGUOUS:${email}:${matches.length}`);
    }
  }
  throw new Error('JOURNEY_CUSTOMER_PARTY_ACTOR_NOT_FOUND');
}

async function loadProtectedFive(
  prisma: PrismaClient,
): Promise<Array<{ id: string; displayName: string }>> {
  const rows = await prisma.osParty.findMany({
    where: { organizationId: OWNER_DEMO_SYNTH_ORG, id: { in: [...PROTECTED_FIVE_DEMO_PARTY_IDS] } },
    select: { id: true, displayName: true },
    orderBy: { id: 'asc' },
  });
  if (rows.length !== PROTECTED_FIVE_DEMO_PARTY_IDS.length) {
    throw new Error(`JOURNEY_CUSTOMER_PROTECTED_FIVE_MISSING:${rows.length}`);
  }
  return rows;
}

async function loadRealSeven(
  prisma: PrismaClient,
): Promise<Array<{ id: string; displayName: string }>> {
  const rows = await prisma.osParty.findMany({
    where: { organizationId: OWNER_DEMO_REAL_ORG },
    select: { id: true, displayName: true },
  });
  const identified: Array<{ id: string; displayName: string }> = [];
  for (const name of OWNER_DEMO_REAL_SEVEN) {
    const hit = rows.find((row) => rowIdentifiesProtectedRealName(row.displayName, name));
    if (!hit) {
      throw new Error(`JOURNEY_CUSTOMER_REAL_SEVEN_NOT_IDENTIFIABLE:${name}`);
    }
    identified.push(hit);
  }
  return identified;
}

async function countByParty(
  prisma: PrismaClient,
  partyId: string,
): Promise<JourneyPipelineCounts> {
  const orgId = OWNER_DEMO_SYNTH_ORG;
  const orders = await prisma.osOrder.findMany({
    where: { organizationId: orgId, partyId },
    select: { id: true },
  });
  const orderIds = orders.map((row) => row.id);
  const orderFilter = orderIds.length > 0 ? { orderId: { in: orderIds } } : null;
  const [
    opportunity,
    quote,
    work_item,
    production,
    finished_goods_receipt,
    purchase_request,
    delivery_note,
    warehouse_exit,
    delivery,
    customer_conversation,
  ] = await Promise.all([
    prisma.osOpportunity.count({ where: { organizationId: orgId, partyId } }),
    prisma.osQuote.count({ where: { organizationId: orgId, partyId } }),
    prisma.osWorkItem.count({
      where: {
        organizationId: orgId,
        OR: [
          { subjectId: partyId },
          ...(orderIds.length > 0 ? [{ subjectId: { in: orderIds } }] : []),
        ],
      },
    }),
    prisma.osReportedOperationalFact.count({
      where: { organizationId: orgId, subjectId: partyId },
    }),
    prisma.osFinishedGoodsReceipt.count({
      where: { organizationId: orgId, contextPartyId: partyId },
    }),
    orderFilter
      ? prisma.osPurchaseRequest.count({ where: { organizationId: orgId, ...orderFilter } })
      : Promise.resolve(0),
    prisma.osDeliveryNote.count({ where: { organizationId: orgId, partyId } }),
    orderFilter
      ? prisma.osWarehouseExit.count({ where: { organizationId: orgId, ...orderFilter } })
      : Promise.resolve(0),
    orderFilter
      ? prisma.osDelivery.count({ where: { organizationId: orgId, ...orderFilter } })
      : Promise.resolve(0),
    prisma.osCustomerConversation.count({ where: { organizationId: orgId, customerId: partyId } }),
  ]);
  return {
    opportunity,
    quote,
    order: orders.length,
    work_item,
    production,
    finished_goods_receipt,
    purchase_request,
    delivery_note,
    warehouse_exit,
    delivery,
    customer_conversation,
  };
}

async function loadExistingJourneyParty(
  prisma: PrismaClient,
): Promise<JourneyExistingParty | null> {
  const rows = await prisma.osParty.findMany({
    where: {
      organizationId: OWNER_DEMO_SYNTH_ORG,
      OR: [
        { displayName: JOURNEY_CUSTOMER.displayName },
        { legalName: JOURNEY_CUSTOMER.legalName },
      ],
    },
    select: { id: true, organizationId: true, displayName: true, legalName: true, status: true },
  });
  if (rows.length === 0) return null;
  if (rows.length !== 1) {
    throw new Error(`JOURNEY_CUSTOMER_IDENTITY_AMBIGUOUS:${rows.length}`);
  }
  const party = rows[0]!;
  const [contacts, locations, account] = await Promise.all([
    prisma.osContact.findMany({
      where: { organizationId: OWNER_DEMO_SYNTH_ORG, organizationPartyId: party.id },
      select: { givenName: true, familyName: true, phone: true },
    }),
    prisma.osLocation.findMany({
      where: { organizationId: OWNER_DEMO_SYNTH_ORG, partyId: party.id, status: 'active' },
      select: { label: true, addressText: true },
    }),
    prisma.osCommercialAccount.findFirst({
      where: { organizationId: OWNER_DEMO_SYNTH_ORG, partyId: party.id },
      select: { ownerMemberId: true },
    }),
  ]);
  const pipelineCounts = await countByParty(prisma, party.id);
  const contact = contacts[0] ?? null;
  const location = locations[0] ?? null;
  return matchingJourneyParty({
    id: party.id,
    organizationId: party.organizationId,
    displayName: party.displayName,
    legalName: party.legalName,
    status: party.status,
    ownerMemberId: account?.ownerMemberId ?? null,
    contact,
    location,
    extraContacts: Math.max(0, contacts.length - (contact ? 1 : 0)),
    extraLocations: Math.max(0, locations.length - (location ? 1 : 0)),
    pipelineCounts,
  });
}

function writeJourneyReceipt(payload: Record<string, unknown>): void {
  const secret = join(homedir(), '.isalwa-secrets', 'isalwa-os-journey-customer.json');
  mkdirSync(dirname(secret), { mode: 0o700, recursive: true });
  writeFileSync(secret, JSON.stringify(payload, null, 2));
  chmodSync(secret, 0o600);
  log(`JOURNEY_CUSTOMER_RECEIPT ${secret}`);
}

async function readBack(
  prisma: PrismaClient,
  partyId: string,
): Promise<Record<string, unknown>> {
  const party = await prisma.osParty.findFirst({
    where: { id: partyId, organizationId: OWNER_DEMO_SYNTH_ORG },
    select: { id: true, displayName: true, legalName: true, status: true, partyKind: true },
  });
  if (!party) throw new Error('JOURNEY_CUSTOMER_READBACK_MISSING_PARTY');
  const role = await prisma.osPartyRoleAssignment.findFirst({
    where: { organizationId: OWNER_DEMO_SYNTH_ORG, partyId, endedAt: null },
    select: { roleKey: true },
    orderBy: { effectiveAt: 'desc' },
  });
  const contact = await prisma.osContact.findFirst({
    where: { organizationId: OWNER_DEMO_SYNTH_ORG, organizationPartyId: partyId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, givenName: true, familyName: true, phone: true, email: true, title: true },
  });
  const location = await prisma.osLocation.findFirst({
    where: { organizationId: OWNER_DEMO_SYNTH_ORG, partyId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, label: true, addressText: true, latitude: true, longitude: true },
  });
  const account = await prisma.osCommercialAccount.findFirst({
    where: { organizationId: OWNER_DEMO_SYNTH_ORG, partyId },
    select: { id: true, ownerMemberId: true, status: true },
  });
  const pipeline = await countByParty(prisma, partyId);
  const visibility = demoModeVisibility(party.displayName);
  const storedStrings = [
    party.displayName,
    party.legalName ?? '',
    contact?.givenName ?? '',
    contact?.familyName ?? '',
    contact?.phone ?? '',
    contact?.email ?? '',
    contact?.title ?? '',
    location?.label ?? '',
    location?.addressText ?? '',
  ];
  assertNoForbiddenEngineeringLabels(storedStrings);
  return {
    party,
    relationship: role?.roleKey ?? null,
    contact,
    location,
    commercialAccount: account,
    pipeline,
    notes: '',
    demoVisible: visibility.demo,
    realVisible: visibility.real,
  };
}

export async function runJourneyCustomerCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  assertJourneyCustomerIdentity();
  const apply = argv.includes('--apply');
  const plan = intendedInsertPlan();
  log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'dry-run',
        organizationId: OWNER_DEMO_SYNTH_ORG,
        intendedInserts: [...JOURNEY_CUSTOMER_INTENDED_INSERTS],
        intendedPipelineRecords: 0,
        plan,
        REAL_SEVEN_MUTATED: realSevenMutationProof().realSevenNamesTouched ? 'YES' : 'NO',
      },
      null,
      2,
    ),
  );

  if (!apply && argv.includes('--source-only')) {
    log('JOURNEY_CUSTOMER_DRY_RUN_SOURCE_ONLY');
    return;
  }

  if (apply) {
    assertOwnerDemoConfirm(process.env.STAGING_FIXTURE_CONFIRM);
  }

  const databaseUrl = loadStagingDatabaseUrl();
  requireEnvFrom(process.env, 'OS_DATABASE_URL');
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('JOURNEY_CUSTOMER_PRISMA_UNAVAILABLE');

  const dbRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  const databaseName = dbRows[0]?.name ?? '';
  assertStagingSynthEnvironment({
    databaseName,
    databaseUrl,
    organizationId: OWNER_DEMO_SYNTH_ORG,
  });
  log(`JOURNEY_CUSTOMER_ENV database=${databaseName} host=${redactUrl(databaseUrl)}`);

  const org = await prisma.osOrganization.findUnique({
    where: { id: OWNER_DEMO_SYNTH_ORG },
    select: { id: true },
  });
  if (!org) throw new Error('JOURNEY_CUSTOMER_SYNTH_ORG_MISSING');

  const fiveBefore = await loadProtectedFive(prisma);
  const realBefore = await loadRealSeven(prisma);
  const ownerMatches = await resolveMembersByEmail(
    prisma,
    OWNER_DEMO_SYNTH_ORG,
    JOURNEY_CUSTOMER_OWNER_EMAIL,
  );
  const owner = resolveExactlyOneActiveOwner(
    OWNER_DEMO_SYNTH_ORG,
    JOURNEY_CUSTOMER_OWNER_EMAIL,
    ownerMatches,
  );
  log(`JOURNEY_CUSTOMER_OWNER memberId=${owner.memberId} email=${owner.email}`);

  const existing = await loadExistingJourneyParty(prisma);
  const decision = decideJourneyCustomerAction(existing, owner.memberId);
  if (existing && decision === 'refuse') {
    throw new Error('JOURNEY_CUSTOMER_EXISTING_IDENTITY_AMBIGUOUS');
  }
  log(`JOURNEY_CUSTOMER_DECISION ${decision} existingPartyId=${existing?.id ?? 'none'}`);

  if (!apply) {
    log('JOURNEY_CUSTOMER_DRY_RUN_NO_WRITES');
    return;
  }

  if (process.env.STAGING_FIXTURE_CONFIRM?.trim() !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM=1 required for owner-demo seed');
  }

  let partyId = existing?.id ?? null;
  let created = false;
  if (decision === 'insert') {
    const partyActor = await resolvePartyActor(prisma, OWNER_DEMO_SYNTH_ORG);
    const partySession = ctx(
      OWNER_DEMO_SYNTH_ORG,
      partyActor.memberId,
      partyActor.personId,
      partyActor.authIdentityId,
    );
    const partyStore = new PrismaOsPartyStore(prisma);
    const commercialStore = new PrismaOsCommercialStore(prisma);
    const partySvc = new PartyCommandService(partyStore);
    const locationSvc = new LocationCommandService(partyStore);
    const commercialSvc = new CommercialCommandService(commercialStore);

    const createdParty = await partySvc.execute('CreateParty', partySession, {
      displayName: JOURNEY_CUSTOMER.displayName,
      partyKind: 'organization',
      legalName: JOURNEY_CUSTOMER.legalName,
      initialRoleKey: JOURNEY_CUSTOMER.relationship,
      createCommercialAccount: true,
    });
    partyId = String(createdParty.data.partyId);

    await partySvc.execute('UpdateContact', partySession, {
      organizationPartyId: partyId,
      givenName: JOURNEY_CUSTOMER.contact.givenName,
      familyName: JOURNEY_CUSTOMER.contact.familyName,
      phone: JOURNEY_CUSTOMER.contact.phone,
    });

    await locationSvc.execute('CreateLocation', partySession, {
      partyId,
      label: JOURNEY_CUSTOMER.location.label,
      addressText: JOURNEY_CUSTOMER.location.addressText,
    });

    const account = await commercialStore.getCommercialAccountForParty(OWNER_DEMO_SYNTH_ORG, partyId);
    if (!account) throw new Error('JOURNEY_CUSTOMER_COMMERCIAL_ACCOUNT_MISSING');
    if (account.ownerMemberId !== owner.memberId) {
      await commercialSvc.execute('ReassignCommercialAccountOwner', partySession, {
        commercialAccountId: account.id,
        ownerMemberId: owner.memberId,
      });
    }
    created = true;
    log(`JOURNEY_CUSTOMER_CREATED partyId=${partyId}`);
  } else {
    log(`JOURNEY_CUSTOMER_REUSED partyId=${partyId}`);
  }
  if (!partyId) throw new Error('JOURNEY_CUSTOMER_PARTY_ID_MISSING');

  const read = await readBack(prisma, partyId);
  const pipeline = read.pipeline as JourneyPipelineCounts;
  assertPipelineCountsZero(pipeline);

  const fiveAfter = await loadProtectedFive(prisma);
  const realAfter = await loadRealSeven(prisma);
  assertProtectedFiveUnchanged(
    fiveBefore.map((row) => row.id),
    fiveAfter.map((row) => row.id),
  );
  assertRealSevenUnchanged(realBefore, realAfter);

  const contact = read.contact as { id: string } | null;
  const location = read.location as { id: string } | null;
  const account = read.commercialAccount as { id: string; ownerMemberId: string | null } | null;
  const receipt = {
    organizationId: OWNER_DEMO_SYNTH_ORG,
    REAL_SEVEN_MUTATED: 'NO',
    EXISTING_DEMO_RECORDS_MUTATED: 'NO',
    created,
    partyId,
    contactId: contact?.id ?? null,
    locationId: location?.id ?? null,
    ownerMemberId: account?.ownerMemberId ?? owner.memberId,
    commercialAccountId: account?.id ?? null,
    protectedFiveDemoPartyIds: [...PROTECTED_FIVE_DEMO_PARTY_IDS],
    displayName: JOURNEY_CUSTOMER.displayName,
    notes: '',
    pipeline,
    demoVisible: true,
    realVisible: false,
  };
  writeJourneyReceipt(receipt);
  log(JSON.stringify({ ok: true, ...receipt, read }, null, 2));
}

const invokedDirectly =
  /seed-journey-customer\.(ts|js)$/.test(process.argv[1] ?? '') &&
  !(process.argv[1] ?? '').includes('.test.');
if (invokedDirectly) {
  runJourneyCustomerCli().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
