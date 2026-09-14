import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsProjectionStore, PrismaOsWorkforceStore } from './index';
import { createId } from '@isalwa/ts-utils';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('attention clock prisma', () => {
  const orgIds: string[] = [];

  after(async () => {
    const prisma = getOsPrisma();
    if (!prisma || orgIds.length === 0) return;
    await prisma.osAttentionReadModel.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.osWorkReadModel.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.osProjectionFreshness.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.osDepartment.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.osOrganization.deleteMany({ where: { id: { in: orgIds } } });
  });

  it('refreshes past-due open work without a business event, once, per tenant', async () => {
    const prisma = getOsPrisma();
    assert.ok(prisma);
    const workforceStore = new PrismaOsWorkforceStore(prisma);
    const projectionStore = new PrismaOsProjectionStore(prisma);
    const stamp = Date.now();
    const org = await workforceStore.seedOrganization('Clock Org', `clk-${stamp}`);
    const other = await workforceStore.seedOrganization('Clock Other', `clk-b-${stamp}`);
    orgIds.push(org.id, other.id);

    const dueAt = new Date('2026-09-13T15:00:00.000Z');
    const asOf = new Date('2026-09-13T16:00:00.000Z');
    const ownerId = createId();
    const pastId = createId();

    await prisma.osWorkReadModel.create({
      data: {
        workItemId: pastId,
        organizationId: org.id,
        title: 'Past follow-up',
        status: 'open',
        priority: 'normal',
        ownerMemberId: ownerId,
        createdByMemberId: ownerId,
        dueAt,
        approvalStatus: 'none',
      },
    });
    await prisma.osWorkReadModel.create({
      data: {
        workItemId: createId(),
        organizationId: other.id,
        title: 'Future follow-up',
        status: 'open',
        priority: 'normal',
        ownerMemberId: ownerId,
        createdByMemberId: ownerId,
        dueAt: new Date('2026-09-20T15:00:00.000Z'),
        approvalStatus: 'none',
      },
    });

    const before = await projectionStore.listOrganizationIdsNeedingOverdueRefresh(
      new Date('2026-09-13T14:00:00.000Z'),
    );
    assert.equal(before.includes(org.id), false);

    const crossed = await projectionStore.listOrganizationIdsNeedingOverdueRefresh(asOf);
    assert.equal(crossed.includes(org.id), true);
    assert.equal(crossed.includes(other.id), false);

    await projectionStore.rebuildAttentionForOrganization(org.id, asOf);

    const overdue = await prisma.osAttentionReadModel.findMany({
      where: { organizationId: org.id, attentionType: 'overdue_work' },
    });
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0]?.attentionKey, `work:overdue:${pastId}`);
    assert.equal(overdue[0]?.memberId, ownerId);

    const otherAttention = await prisma.osAttentionReadModel.count({
      where: { organizationId: other.id },
    });
    assert.equal(otherAttention, 0);

    const again = await projectionStore.listOrganizationIdsNeedingOverdueRefresh(asOf);
    assert.equal(again.includes(org.id), false);
    assert.equal(
      await prisma.osAttentionReadModel.count({
        where: { organizationId: org.id, attentionType: 'overdue_work' },
      }),
      1,
    );

    await prisma.osWorkReadModel.update({
      where: { workItemId: pastId },
      data: { status: 'completed', completedAt: asOf },
    });
    const stale = await projectionStore.listOrganizationIdsNeedingOverdueRefresh(
      new Date('2026-09-13T17:00:00.000Z'),
    );
    assert.equal(stale.includes(org.id), true);
    await projectionStore.rebuildAttentionForOrganization(org.id, new Date('2026-09-13T17:00:00.000Z'));
    assert.equal(
      await prisma.osAttentionReadModel.count({
        where: { organizationId: org.id, attentionType: 'overdue_work' },
      }),
      0,
    );
  });
});
