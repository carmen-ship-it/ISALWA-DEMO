import type { ListMembersQuery, MemberSummaryReadModel } from '@isalwa/os-contracts';
import type { DirectReportLookup } from '../leadership/direct-reports';

export type MemberDirectoryRow = MemberSummaryReadModel;

export interface MemberQueryStorePort extends DirectReportLookup {
  listMembers(
    organizationId: string,
    query: ListMembersQuery,
    asOf: Date,
  ): Promise<{ items: MemberDirectoryRow[]; hasMore: boolean }>;

  getMemberSummary(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberDirectoryRow | null>;

  listCapabilityStateOverrides(
    organizationId: string,
  ): Promise<Array<{ capabilityKey: string; state: string; updatedAt: Date }>>;
}
