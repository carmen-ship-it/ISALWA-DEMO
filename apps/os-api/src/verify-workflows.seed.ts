/**
 * One-shot disposable seed for Allocate / Coordinación / C4 browser+API verification.
 * Run: OS_DATABASE_URL=... OS_AUTH_MODE=dev pnpm exec tsx src/verify-workflows.seed.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import {
  COORDINATION_DECISION_CAPABILITY,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
} from '@isalwa/os-contracts';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';

const OUT =
  process.env.VERIFY_OUT_DIR ??
  '/Users/carmen/projects/isalwa-recovery-20261124/receipts/deliverables/verify-20261124';

async function seedSeat(store: any, orgId: string, label: string, roleKeys: string[]) {
  const seeded = await store.seedAdminMember(orgId, `${label}-${createId()}@verify.bo`, label, 'VF');
  const prisma = getOsPrisma()!;
  await prisma.osRoleAssignment.deleteMany({
    where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
  });
  for (const roleKey of roleKeys) {
    await prisma.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: orgId,
        memberId: seeded.member.id,
        roleKey,
        effectiveAt: new Date('2020-01-01'),
      },
    });
  }
  return {
    organizationId: orgId,
    memberId: seeded.member.id,
    personId: seeded.person.id,
    authIdentityId: seeded.auth.id,
    displayLabel: label,
  };
}

function headers(seat: {
  organizationId: string;
  memberId: string;
  personId: string;
  authIdentityId: string;
}) {
  return {
    'content-type': 'application/json',
    'x-os-organization-id': seat.organizationId,
    'x-os-member-id': seat.memberId,
    'x-os-person-id': seat.personId,
    'x-os-auth-identity-id': seat.authIdentityId,
    'idempotency-key': createId(),
  };
}

function encodeDevSession(session: {
  organizationId: string;
  memberId: string;
  personId: string;
  authIdentityId: string;
  displayLabel?: string;
}) {
  return Buffer.from(
    JSON.stringify({
      organizationId: session.organizationId,
      memberId: session.memberId,
      personId: session.personId,
      authIdentityId: session.authIdentityId,
      displayLabel: session.displayLabel ?? 'Sesión de desarrollo',
    }),
    'utf8',
  ).toString('base64url');
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  await app.init();
  await app.listen(0);
  const addr = app.getHttpServer().address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const store = app.get(OS_STORE);
  const prisma = getOsPrisma()!;

  const org = await store.seedOrganization('Verify Org', `verify-${createId().slice(-8)}`);
  const orgId = org.id as string;

  const warehouse = await seedSeat(store, orgId, 'Almacen', [
    WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
    WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  ]);
  const coordinator = await seedSeat(store, orgId, 'Coordinacion', [COORDINATION_DECISION_CAPABILITY]);
  const unauthorized = await seedSeat(store, orgId, 'SinGrant', [COMMERCIAL_TEAM_READ_SCOPE]);
  const owner = await seedSeat(store, orgId, 'Owner', [
    'commercial.customer.create',
    'commercial.customer.edit',
    'sales_rep',
  ]);
  // Independent grantor: reassignment scopes, NOT the account owner.
  const grantor = await seedSeat(store, orgId, 'Grantor', [
    'commercial.account.reassign',
    'commercial.assignment.org',
    'commercial.org.read',
    'commercial.customer.edit',
  ]);
  const recipient = await seedSeat(store, orgId, 'Recipient', ['sales_rep']);

  const productId = createId();
  const orderId = createId();
  const orderLineId = createId();
  const partyId = createId();
  const quoteId = createId();
  const quoteLineId = createId();

  await prisma.osParty.create({
    data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: 'Cliente Verify' },
  });
  await prisma.osQuote.create({
    data: {
      id: quoteId,
      organizationId: orgId,
      partyId,
      ownerMemberId: warehouse.memberId,
      quoteNumber: `Q-VF-${createId().slice(-6)}`,
      status: 'accepted',
    },
  });
  await prisma.osQuoteLine.create({
    data: {
      id: quoteLineId,
      organizationId: orgId,
      quoteId,
      lineNumber: 1,
      description: 'Vidrio',
      quantity: 10,
      unitPriceCentavos: 100n,
      lineTotalCentavos: 1000n,
    },
  });
  await prisma.osOrder.create({
    data: {
      id: orderId,
      organizationId: orgId,
      partyId,
      quoteId,
      ownerMemberId: warehouse.memberId,
      orderNumber: `P-VF-${createId().slice(-6)}`,
      subtotalCentavos: 1000n,
      totalCentavos: 1000n,
      status: 'open',
    },
  });
  await prisma.osOrderLine.create({
    data: {
      id: orderLineId,
      organizationId: orgId,
      orderId,
      quoteId,
      quoteLineId,
      lineNumber: 1,
      descriptionSnapshot: 'Vidrio',
      quantity: 10,
      unitPriceCentavosSnapshot: 100n,
      lineTotalCentavos: 1000n,
      provenance: 'quote_conversion_snapshot',
      productRefSnapshot: productId,
      copiedAt: new Date(),
    },
  });

  const receive = await fetch(`${baseUrl}/v1/commands/ReceiveFinishedGoods`, {
    method: 'POST',
    headers: headers(warehouse),
    body: JSON.stringify({
      productId,
      quantity: '5',
      contextOrderId: orderId,
      contextOrderLineId: orderLineId,
    }),
  });
  const receiveText = await receive.text();
  if (!(receive.status === 200 || receive.status === 201)) throw new Error(`receive ${receiveText}`);

  const allocate = await fetch(`${baseUrl}/v1/commands/AllocateFinishedGoods`, {
    method: 'POST',
    headers: headers(warehouse),
    body: JSON.stringify({ productId, quantity: '2', orderLineId }),
  });
  const allocateText = await allocate.text();
  if (!(allocate.status === 200 || allocate.status === 201)) throw new Error(`allocate ${allocateText}`);
  const allocateBody = JSON.parse(allocateText);
  const allocationId = allocateBody.data?.allocationId ?? allocateBody.allocationId;

  // Duplicate allocate same idempotency should be safe — separate key for negative qty
  const badQty = await fetch(`${baseUrl}/v1/commands/AllocateFinishedGoods`, {
    method: 'POST',
    headers: headers(warehouse),
    body: JSON.stringify({ productId, quantity: '0', orderLineId }),
  });
  const unauthorizedAlloc = await fetch(`${baseUrl}/v1/commands/AllocateFinishedGoods`, {
    method: 'POST',
    headers: headers(unauthorized),
    body: JSON.stringify({ productId, quantity: '1', orderLineId }),
  });

  const desk = await fetch(`${baseUrl}/v1/warehouse/finished-goods-desk`, { headers: headers(warehouse) });
  const deskBody = await desk.json();

  const coord = await fetch(`${baseUrl}/v1/coordination/decisions`, {
    method: 'POST',
    headers: headers(coordinator),
    body: JSON.stringify({
      decision: 'Acuerdo verify entre áreas',
      ownerLabel: 'Almacen',
      dueAt: '2026-12-15',
      notes: 'Registro durable',
      actorLabel: 'Coordinacion',
    }),
  });
  const coordText = await coord.text();
  if (!(coord.status === 200 || coord.status === 201)) throw new Error(`coord ${coordText}`);
  const decisionId = JSON.parse(coordText).decision.id as string;

  const resolve = await fetch(`${baseUrl}/v1/coordination/decisions/${decisionId}/resolve`, {
    method: 'POST',
    headers: headers(coordinator),
    body: JSON.stringify({ decision: 'Cerrado verify', actorLabel: 'Coordinacion' }),
  });
  const resolveText = await resolve.text();
  if (!(resolve.status === 200 || resolve.status === 201)) throw new Error(`resolve ${resolveText}`);

  const unauthorizedCoord = await fetch(`${baseUrl}/v1/coordination/decisions`, {
    method: 'POST',
    headers: headers(unauthorized),
    body: JSON.stringify({ decision: 'no', actorLabel: 'x' }),
  });

  const partyCreate = await fetch(`${baseUrl}/v1/commands/CreateParty`, {
    method: 'POST',
    headers: headers(owner),
    body: JSON.stringify({
      partyKind: 'organization',
      displayName: 'Cliente C4 Verify',
      contact: { givenName: 'Luis', familyName: 'C4' },
      phone: { country: 'BO', number: `7${String(Date.now()).slice(-7)}` },
    }),
  });
  const partyCreateText = await partyCreate.text();
  let coverage: Record<string, unknown> = { createPartyStatus: partyCreate.status };
  if (partyCreate.status === 200 || partyCreate.status === 201) {
    const created = JSON.parse(partyCreateText);
    const c4PartyId = created.data?.partyId ?? created.partyId;
    const detail = await fetch(`${baseUrl}/v1/parties/${c4PartyId}`, { headers: headers(grantor) });
    const detailBody = await detail.json();
    const commercialAccountId =
      detailBody.commercialAccountId ?? detailBody.account?.id ?? detailBody.commercialAccount?.id ?? null;
    coverage = { ...coverage, c4PartyId, commercialAccountId, detailStatus: detail.status };
    if (commercialAccountId) {
      const endsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
      // Active window (starts now) so recipient sees coverage immediately.
      const denied = await fetch(`${baseUrl}/v1/commands/GrantCustomerCoverage`, {
        method: 'POST',
        headers: headers(unauthorized),
        body: JSON.stringify({
          commercialAccountId,
          actingAdvisorMemberId: recipient.memberId,
          coveredActions: ['commercial.work'],
          endsAt,
        }),
      });
      const ownerDenied = await fetch(`${baseUrl}/v1/commands/GrantCustomerCoverage`, {
        method: 'POST',
        headers: headers(owner),
        body: JSON.stringify({
          commercialAccountId,
          actingAdvisorMemberId: recipient.memberId,
          coveredActions: ['commercial.work'],
          endsAt,
        }),
      });
      const ok = await fetch(`${baseUrl}/v1/commands/GrantCustomerCoverage`, {
        method: 'POST',
        headers: headers(grantor),
        body: JSON.stringify({
          commercialAccountId,
          actingAdvisorMemberId: recipient.memberId,
          coveredActions: ['commercial.work'],
          endsAt,
        }),
      });
      const okText = await ok.text();
      const okBody = okText ? JSON.parse(okText) : {};
      coverage = {
        ...coverage,
        deniedStatus: denied.status,
        ownerDeniedStatus: ownerDenied.status,
        okStatus: ok.status,
        grantId: okBody.data?.grantId ?? okBody.grantId ?? null,
        endsAt,
        okBodySlice: okText.slice(0, 300),
      };
    }
  }

  const persistedAlloc = await prisma.osOrderAllocation.findUnique({ where: { id: allocationId } });
  const persistedDecisions = await prisma.osCoordinationDecision.findMany({
    where: { organizationId: orgId },
    orderBy: { occurredAt: 'asc' },
  });
  const persistedGrant = coverage.grantId
    ? await prisma.osCustomerCoverageGrant.findUnique({ where: { id: String(coverage.grantId) } })
    : null;

  const fixtures = {
    database: 'isalwa_v1_repairs_verify_20261124_disposable',
    organizationId: orgId,
    cookieName: 'os_dev_session',
    productId,
    orderId,
    orderLineId,
    partyId,
    allocationId,
    decisionId,
    allocateBadQtyStatus: badQty.status,
    allocateUnauthorizedStatus: unauthorizedAlloc.status,
    coordinationUnauthorizedStatus: unauthorizedCoord.status,
    deskSeesAllocation: Boolean(deskBody.allocations?.some((r: { id: string }) => r.id === allocationId)),
    persistedAllocation: Boolean(persistedAlloc),
    persistedAllocationQty: persistedAlloc?.quantity ?? null,
    persistedDecisionCount: persistedDecisions.length,
    persistedGrant: Boolean(persistedGrant),
    persistedGrantStartsAt: persistedGrant?.startsAt?.toISOString?.() ?? null,
    persistedGrantEndsAt: persistedGrant?.endsAt?.toISOString?.() ?? null,
    coverage,
    seats: {
      warehouse: { ...warehouse, cookie: encodeDevSession(warehouse) },
      coordinator: { ...coordinator, cookie: encodeDevSession(coordinator) },
      owner: { ...owner, cookie: encodeDevSession(owner) },
      grantor: { ...grantor, cookie: encodeDevSession(grantor) },
      recipient: { ...recipient, cookie: encodeDevSession(recipient) },
      unauthorized: { ...unauthorized, cookie: encodeDevSession(unauthorized) },
    },
  };
  writeFileSync(`${OUT}/fixtures.json`, JSON.stringify(fixtures, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        organizationId: orgId,
        allocationId,
        decisionId,
        deskSeesAllocation: fixtures.deskSeesAllocation,
        persistedAllocation: fixtures.persistedAllocation,
        persistedDecisionCount: fixtures.persistedDecisionCount,
        persistedGrant: fixtures.persistedGrant,
        allocateUnauthorizedStatus: fixtures.allocateUnauthorizedStatus,
        coordinationUnauthorizedStatus: fixtures.coordinationUnauthorizedStatus,
        coverageDeniedStatus: coverage.deniedStatus ?? null,
        coverageOkStatus: coverage.okStatus ?? null,
        grantId: coverage.grantId ?? null,
      },
      null,
      2,
    ),
  );
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
