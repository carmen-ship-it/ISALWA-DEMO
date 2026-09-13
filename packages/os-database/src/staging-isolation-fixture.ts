/**
 * Staging-only synthetic Tenant B fixture for hosted cross-tenant isolation tests.
 *
 * Creates a second organization + party (+ optional quote) with NO Supabase login user.
 * Not a public bootstrap. Operator CLI only.
 *
 * Required: OS_DATABASE_URL (staging)
 * Writes IDs to ~/.isalwa-secrets/isalwa-os-staging-isolation-fixture.json (mode 600)
 */
import { mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';
import { PrismaOsPartyStore } from './prisma-party-store';
import { PrismaOsCommercialStore } from './prisma-commercial-store';

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

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

async function main(): Promise<void> {
  requireEnv('OS_DATABASE_URL');
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const secretsDir = join(homedir(), '.isalwa-secrets');
  mkdirSync(secretsDir, { recursive: true });
  const fixturePath = join(secretsDir, 'isalwa-os-staging-isolation-fixture.json');

  if (existsSync(fixturePath) && process.env.STAGING_ISOLATION_FORCE !== '1') {
    const existing = JSON.parse(readFileSync(fixturePath, 'utf8')) as { organizationId?: string };
    if (existing.organizationId) {
      const still = await prisma.osOrganization.findUnique({
        where: { id: existing.organizationId },
      });
      if (still) {
        log(`FIXTURE_EXISTS path=${fixturePath} organizationId=${existing.organizationId}`);
        log(JSON.stringify({ ok: true, reused: true, ...existing }));
        return;
      }
    }
  }

  // Reuse an incomplete prior Tenant B org if present (failed mid-run).
  const priorB = await prisma.osOrganization.findFirst({
    where: { legalName: { contains: 'ISOLATION Tenant B' } },
    orderBy: { createdAt: 'desc' },
  });
  if (priorB && process.env.STAGING_ISOLATION_FORCE !== '1') {
    const party = await prisma.osParty.findFirst({
      where: { organizationId: priorB.id },
      orderBy: { createdAt: 'asc' },
    });
    const quote = await prisma.osQuote.findFirst({
      where: { organizationId: priorB.id },
      orderBy: { createdAt: 'asc' },
    });
    const opp = await prisma.osOpportunity.findFirst({
      where: { organizationId: priorB.id },
      orderBy: { createdAt: 'asc' },
    });
    const member = await prisma.osOrganizationMember.findFirst({
      where: { organizationId: priorB.id },
      orderBy: { createdAt: 'asc' },
    });
    if (party && quote && opp && member) {
      const auth = await prisma.osAuthIdentity.findFirst({
        where: { personId: member.personId },
      });
      const tenantA = await prisma.osOrganization.findFirst({
        where: { legalName: { contains: 'ISALWA Staging' } },
        orderBy: { createdAt: 'asc' },
      });
      const fixture = {
        purpose: 'hosted-cross-tenant-isolation',
        createdAt: new Date().toISOString(),
        tenantAOrganizationId: tenantA?.id ?? null,
        organizationId: priorB.id,
        memberId: member.id,
        personId: member.personId,
        authIdentityId: auth?.id ?? null,
        partyId: party.id,
        opportunityId: opp.id,
        quoteId: quote.id,
        reusedPrior: true,
      };
      writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), { mode: 0o600 });
      chmodSync(fixturePath, 0o600);
      log(`FIXTURE_RECOVERED path=${fixturePath}`);
      log(JSON.stringify({ ok: true, reused: true, ...fixture }));
      return;
    }
  }

  const workforceStore = new PrismaOsWorkforceStore(prisma);
  const partyStore = new PrismaOsPartyStore(prisma);
  const commercialStore = new PrismaOsCommercialStore(prisma);
  const partySvc = new PartyCommandService(partyStore);
  const commercialSvc = new CommercialCommandService(commercialStore);

  const org = await workforceStore.seedOrganization(
    'ISOLATION Tenant B (synthetic)',
    `iso-b-${createId().slice(0, 8)}`,
  );
  log(`ORG_B_CREATED id=${org.id}`);

  const personId = randomUUID();
  const memberId = randomUUID();
  const authId = randomUUID();
  await workforceStore.insertPerson({
    id: personId,
    givenName: 'Isolation',
    familyName: 'Bot',
    version: 0,
  });
  await workforceStore.insertMember({
    id: memberId,
    organizationId: org.id,
    personId,
    employmentStatus: 'active',
    accessStatus: 'active',
    employmentStartedAt: new Date(),
    employmentEndedAt: null,
    version: 0,
  });
  await workforceStore.insertAuthIdentity({
    id: authId,
    personId,
    provider: 'local-dev',
    providerSubject: `isolation-b-${createId().slice(0, 8)}`,
    email: `isolation.b.${createId().slice(0, 6)}@isalwa.demo`,
    status: 'active',
    invitedAt: null,
    activatedAt: new Date(),
    revokedAt: null,
  });
  await workforceStore.insertRoleAssignment({
    id: randomUUID(),
    organizationId: org.id,
    memberId,
    roleKey: 'master_data.admin',
    effectiveAt: new Date('2020-01-01'),
    endedAt: null,
  });

  const session = ctx(org.id, memberId, personId, authId);
  const party = await partySvc.execute('CreateParty', session, {
    displayName: 'Isolation Customer B S.R.L.',
    partyKind: 'organization',
    legalName: 'Isolation Customer B S.R.L.',
    initialRoleKey: 'customer',
    createCommercialAccount: true,
  });
  const partyId = String(party.data.partyId);
  log(`PARTY_B_CREATED partyId=${partyId}`);

  const opp = await commercialSvc.execute('CreateOpportunity', session, {
    partyId,
    title: 'Isolation opp B — do not use in UAT',
    stage: 'propuesta',
    expectedValueCentavos: 10000,
  });
  const opportunityId = String(opp.data.opportunityId);
  const quote = await commercialSvc.execute('CreateQuote', session, {
    partyId,
    opportunityId,
    currency: 'BOB',
    notes: 'isolation fixture',
  });
  const quoteId = String(quote.data.quoteId);

  const tenantA = await prisma.osOrganization.findFirst({
    where: { legalName: { contains: 'ISALWA Staging' } },
    orderBy: { createdAt: 'asc' },
  });

  const fixture = {
    purpose: 'hosted-cross-tenant-isolation',
    createdAt: new Date().toISOString(),
    tenantAOrganizationId: tenantA?.id ?? null,
    organizationId: org.id,
    memberId,
    personId,
    authIdentityId: authId,
    partyId,
    opportunityId,
    quoteId,
  };
  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), { mode: 0o600 });
  chmodSync(fixturePath, 0o600);
  log(`FIXTURE_WRITTEN path=${fixturePath}`);
  log(JSON.stringify({ ok: true, reused: false, ...fixture }));
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
