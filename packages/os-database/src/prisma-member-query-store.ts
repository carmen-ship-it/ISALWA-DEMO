import type { ListMembersQuery, MemberSummaryReadModel } from '@isalwa/os-contracts';
import type { MemberQueryStorePort } from '@isalwa/os-query';
import type { OsPrismaClient } from './client';

function isAssignmentActive(effectiveAt: Date, endedAt: Date | null, asOf: Date): boolean {
  return effectiveAt <= asOf && (endedAt === null || endedAt > asOf);
}

function decodeMemberCursor(cursor?: string): { familyName: string; memberId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      familyName: string;
      memberId: string;
    };
    if (!parsed.familyName || !parsed.memberId) return null;
    return parsed;
  } catch {
    return null;
  }
}

type MemberWithRelations = Awaited<
  ReturnType<OsPrismaClient['osOrganizationMember']['findMany']>
>[number] & {
  person: { givenName: string; familyName: string };
  roleAssignments: Array<{ roleKey: string; effectiveAt: Date; endedAt: Date | null }>;
  departmentAssignments: Array<{
    departmentId: string;
    effectiveAt: Date;
    endedAt: Date | null;
    department: { name: string };
  }>;
  managerAssignments: Array<{
    managerMemberId: string;
    effectiveAt: Date;
    endedAt: Date | null;
  }>;
  delegationsGranted: Array<{ expiresAt: Date; revokedAt: Date | null; startsAt: Date }>;
  delegationsReceived: Array<{ expiresAt: Date; revokedAt: Date | null; startsAt: Date }>;
};

export class PrismaMemberQueryStore implements MemberQueryStorePort {
  constructor(private readonly prisma: OsPrismaClient) {}

  private async activeEmailForPerson(personId: string): Promise<string | null> {
    const auth = await this.prisma.osAuthIdentity.findFirst({
      where: { personId, status: 'active' },
      orderBy: { activatedAt: 'desc' },
    });
    return auth?.email ?? null;
  }

  private mapMemberRow(
    row: MemberWithRelations,
    asOf: Date,
    email: string | null,
  ): MemberSummaryReadModel {
    const roleKeys = row.roleAssignments
      .filter((r) => isAssignmentActive(r.effectiveAt, r.endedAt, asOf))
      .map((r) => r.roleKey);

    const dept = row.departmentAssignments
      .filter((d) => isAssignmentActive(d.effectiveAt, d.endedAt, asOf))
      .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0];

    const manager = row.managerAssignments
      .filter((m) => isAssignmentActive(m.effectiveAt, m.endedAt, asOf))
      .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0];

    const activeDelegations = [...row.delegationsGranted, ...row.delegationsReceived].filter(
      (d) => !d.revokedAt && d.startsAt <= asOf && d.expiresAt > asOf,
    );

    const givenName = row.person.givenName;
    const familyName = row.person.familyName;
    const displayName = [givenName, familyName].filter(Boolean).join(' ').trim() || 'Miembro';

    return {
      memberId: row.id,
      organizationId: row.organizationId,
      personId: row.personId,
      givenName,
      familyName,
      displayName,
      email,
      accessStatus: row.accessStatus,
      employmentStatus: row.employmentStatus,
      employmentStartedAt: row.employmentStartedAt?.toISOString() ?? null,
      employmentEndedAt: row.employmentEndedAt?.toISOString() ?? null,
      roleKeys,
      departmentId: dept?.departmentId ?? null,
      departmentName: dept?.department.name ?? null,
      managerMemberId: manager?.managerMemberId ?? null,
      activeDelegationCount: activeDelegations.length,
    };
  }

  async getMemberSummary(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberSummaryReadModel | null> {
    const row = await this.prisma.osOrganizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: {
        person: true,
        roleAssignments: true,
        departmentAssignments: { include: { department: true } },
        managerAssignments: true,
        delegationsGranted: true,
        delegationsReceived: true,
      },
    });
    if (!row) return null;
    const email = await this.activeEmailForPerson(row.personId);
    return this.mapMemberRow(row as MemberWithRelations, asOf, email);
  }

  async listMembers(
    organizationId: string,
    query: ListMembersQuery,
    asOf: Date,
  ): Promise<{ items: MemberSummaryReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeMemberCursor(query.cursor);

    const rows = await this.prisma.osOrganizationMember.findMany({
      where: {
        organizationId,
        ...(query.accessStatus ? { accessStatus: query.accessStatus } : {}),
        ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      },
      include: {
        person: true,
        roleAssignments: true,
        departmentAssignments: { include: { department: true } },
        managerAssignments: true,
        delegationsGranted: true,
        delegationsReceived: true,
      },
      orderBy: [{ person: { familyName: 'asc' } }, { id: 'asc' }],
    });

    const personIds = [...new Set(rows.map((r) => r.personId))];
    const authRows = await this.prisma.osAuthIdentity.findMany({
      where: { personId: { in: personIds }, status: 'active' },
    });
    const emailByPerson = new Map<string, string>();
    for (const auth of authRows) {
      if (!emailByPerson.has(auth.personId)) {
        emailByPerson.set(auth.personId, auth.email);
      }
    }

    let mapped = rows.map((row) =>
      this.mapMemberRow(row as MemberWithRelations, asOf, emailByPerson.get(row.personId) ?? null),
    );

    if (query.departmentId) {
      mapped = mapped.filter((m) => m.departmentId === query.departmentId);
    }

    if (query.q) {
      const needle = query.q.toLowerCase();
      mapped = mapped.filter(
        (m) =>
          m.displayName.toLowerCase().includes(needle) ||
          (m.email?.toLowerCase().includes(needle) ?? false),
      );
    }

    if (cursor) {
      mapped = mapped.filter((m) => {
        if (m.familyName > cursor.familyName) return true;
        if (m.familyName < cursor.familyName) return false;
        return m.memberId > cursor.memberId;
      });
    }

    const hasMore = mapped.length > limit;
    const items = hasMore ? mapped.slice(0, limit) : mapped;
    return { items, hasMore };
  }

  async listCapabilityStateOverrides(
    organizationId: string,
  ): Promise<Array<{ capabilityKey: string; state: string; updatedAt: Date }>> {
    const rows = await this.prisma.osCapabilityState.findMany({ where: { organizationId } });
    return rows.map((row) => ({
      capabilityKey: row.capabilityKey,
      state: row.state,
      updatedAt: row.updatedAt,
    }));
  }
}
