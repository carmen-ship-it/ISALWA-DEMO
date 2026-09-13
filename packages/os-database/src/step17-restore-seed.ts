/**
 * Step 17 — Known OS data seed for backup/restore drill (LOCAL/TEST only).
 * Writes marker JSON to STEP17_MARKER_PATH for post-restore verification.
 */
import { writeFileSync } from 'node:fs';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort, WorkforceCommandService } from '@isalwa/os-workforce';
import { PartyCommandService } from '@isalwa/os-party';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';
import { PrismaOsPartyStore } from './prisma-party-store';

const markerPath = process.env.STEP17_MARKER_PATH ?? '.step17-evidence/seed-marker.json';

function ctx(
  orgId: string,
  actorMemberId: string,
  personId: string,
  authId: string,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: new Date('2026-08-24T12:00:00Z'),
  };
}

async function main() {
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL required');

  const workforceStore = new PrismaOsWorkforceStore(prisma);
  const partyStore = new PrismaOsPartyStore(prisma);
  const workforceSvc = new WorkforceCommandService(workforceStore, new LocalAuthProviderPort());
  const partySvc = new PartyCommandService(partyStore);

  await workforceStore.truncateAll();

  const org = await workforceStore.seedOrganization('STEP17 Restore Test S.R.L.', `step17-${createId().slice(0, 8)}`);
  const admin = await workforceStore.seedScopedAdminMember(
    org.id,
    `step17-admin-${createId().slice(0, 6)}@isalwa.bo`,
    'Step17',
    'Admin',
    'master_data.admin',
  );
  const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);

  await workforceSvc.execute('InviteMember', session, {
    email: `step17-member-${createId().slice(0, 6)}@isalwa.bo`,
    givenName: 'María',
    familyName: 'Quispe',
    roleKey: 'sales_rep',
  });

  const party = await partySvc.execute('CreateParty', session, {
    displayName: 'Cliente Step17 S.A.',
    partyKind: 'organization',
    legalName: 'Cliente Step17 S.A.',
    fiscalIdentity: { nit: '987654321', razonSocial: 'Cliente Step17 S.A.' },
    initialRoleKey: 'customer',
    createCommercialAccount: true,
  });

  const marker = {
    seededAt: new Date().toISOString(),
    organizationId: org.id,
    adminMemberId: admin.member.id,
    partyId: party.data.partyId,
    counts: {
      organizations: 1,
      businessEvents: await workforceStore.countBusinessEvents(org.id),
      outbox: await workforceStore.countOutbox(org.id),
      auditLogs: await workforceStore.countAuditLogs(org.id),
      parties: await prisma.osParty.count({ where: { organizationId: org.id } }),
    },
  };

  writeFileSync(markerPath, JSON.stringify(marker, null, 2));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, markerPath, marker }));
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
