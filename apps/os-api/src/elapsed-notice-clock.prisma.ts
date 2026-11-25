import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import type { ElapsedNoticeRow, ElapsedNoticeStore } from '@isalwa/os-query';

export function createPrismaElapsedNoticeStore(): ElapsedNoticeStore {
  return {
    async listOpenCommitments() {
      const prisma = getOsPrisma();
      if (!prisma) return [];
      return prisma.osCommitment.findMany({
        where: { lifecycle: 'open' },
        select: {
          id: true,
          organizationId: true,
          ownerMemberId: true,
          partyId: true,
          text: true,
          lifecycle: true,
          dueAt: true,
        },
      });
    },
    async listWaitingCustomerConversations() {
      const prisma = getOsPrisma();
      if (!prisma) return [];
      return prisma.osCustomerConversation.findMany({
        where: { attentionState: 'waiting_customer' },
        select: {
          id: true,
          organizationId: true,
          customerId: true,
          assignedMemberId: true,
          attentionState: true,
          attentionStateChangedAt: true,
          nextStepCommitmentId: true,
          summary: true,
        },
      });
    },
    async listUnclaimedConversations() {
      const prisma = getOsPrisma();
      if (!prisma) return [];
      return prisma.osCustomerConversation.findMany({
        where: { attentionState: 'new', assignedMemberId: null },
        select: {
          id: true,
          organizationId: true,
          customerId: true,
          assignedMemberId: true,
          attentionState: true,
          attentionStateChangedAt: true,
          nextStepCommitmentId: true,
          summary: true,
        },
      });
    },
    async listManagerMemberId(organizationId, memberId, asOf) {
      const prisma = getOsPrisma();
      if (!prisma) return null;
      if (memberId) {
        const direct = await prisma.osManagerAssignment.findFirst({
          where: {
            organizationId,
            memberId,
            effectiveAt: { lte: asOf },
            OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
          },
          select: { managerMemberId: true },
        });
        if (direct?.managerMemberId) return direct.managerMemberId;
      }
      const any = await prisma.osManagerAssignment.findFirst({
        where: {
          organizationId,
          effectiveAt: { lte: asOf },
          OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
        },
        select: { managerMemberId: true },
        orderBy: { effectiveAt: 'asc' },
      });
      return any?.managerMemberId ?? null;
    },
    async insertNotices(rows: ElapsedNoticeRow[]) {
      const prisma = getOsPrisma();
      if (!prisma || rows.length === 0) return 0;
      const result = await prisma.osInternalNotification.createMany({
        data: rows.map((row) => ({
          id: createId(),
          organizationId: row.organizationId,
          recipientMemberId: row.recipientMemberId,
          kind: row.kind,
          dedupKey: row.dedupKey,
          title: row.title,
          body: row.body,
          sourceRecordType: row.sourceRecordType,
          sourceRecordId: row.sourceRecordId,
          partyId: row.partyId,
          channel: 'internal',
        })),
        skipDuplicates: true,
      });
      return result.count;
    },
  };
}
