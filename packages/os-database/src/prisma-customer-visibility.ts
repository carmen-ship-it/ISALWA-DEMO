import {
  COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE,
  type CustomerCoverageGrant, coverageActionsFromStored
} from '@isalwa/os-contracts';
import type { CustomerVisibilityFacts, CustomerVisibilityLookup } from '@isalwa/os-query';
import type { OsPrismaClient } from './client';

/** Source tables only (parties, role assignments, accounts, coverage). No read models. */
export class PrismaCustomerVisibilityLookup implements CustomerVisibilityLookup {
  constructor(private readonly prisma: OsPrismaClient) {}

  async partyIdForCommercialAccount(organizationId: string, commercialAccountId: string): Promise<string | null> {
    const account = await this.prisma.osCommercialAccount.findFirst({
      where: { id: commercialAccountId, organizationId },
      select: { partyId: true },
    });
    return account?.partyId ?? null;
  }

  async getCustomerFacts(
    organizationId: string,
    partyId: string,
    asOf: Date,
  ): Promise<CustomerVisibilityFacts | null> {
    const [facts] = await this.listCustomerFacts(organizationId, [partyId], asOf);
    return facts ?? null;
  }

  async listCustomerFacts(
    organizationId: string,
    partyIds: readonly string[],
    asOf: Date,
  ): Promise<CustomerVisibilityFacts[]> {
    const ids = [...new Set(partyIds.filter(Boolean))];
    if (ids.length === 0) return [];
    const parties = await this.prisma.osParty.findMany({
      where: { organizationId, id: { in: ids } },
      select: { id: true, organizationId: true },
    });
    if (parties.length === 0) return [];
    const found = parties.map((party) => party.id);
    const [roles, accounts] = await Promise.all([
      this.prisma.osPartyRoleAssignment.findMany({
        where: {
          organizationId,
          partyId: { in: found },
          effectiveAt: { lte: asOf },
          OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
        },
        select: { partyId: true, roleKey: true },
      }),
      this.prisma.osCommercialAccount.findMany({
        where: { organizationId, partyId: { in: found } },
        select: { partyId: true, ownerMemberId: true },
      }),
    ]);
    const rolesByParty = new Map<string, string[]>();
    for (const role of roles) {
      const list = rolesByParty.get(role.partyId) ?? [];
      list.push(role.roleKey);
      rolesByParty.set(role.partyId, list);
    }
    const accountByParty = new Map(accounts.map((account) => [account.partyId, account]));
    return parties.map((party) => {
      const account = accountByParty.get(party.id);
      return {
        organizationId: party.organizationId,
        partyId: party.id,
        hasCommercialAccount: !!account,
        accountOwnerMemberId: account?.ownerMemberId ?? null,
        activeRoleKeys: rolesByParty.get(party.id) ?? [],
      };
    });
  }

  async listPartyIdsOwnedBy(
    organizationId: string,
    ownerMemberIds: readonly string[],
  ): Promise<string[]> {
    const owners = [...new Set(ownerMemberIds.filter(Boolean))];
    if (owners.length === 0) return [];
    const rows = await this.prisma.osCommercialAccount.findMany({
      where: { organizationId, ownerMemberId: { in: owners } },
      select: { partyId: true },
    });
    return rows.map((row) => row.partyId);
  }

  async listActiveCoverageForAdvisor(
    organizationId: string,
    advisorMemberId: string,
    asOf: Date,
  ): Promise<CustomerCoverageGrant[]> {
    const rows = await this.prisma.osCustomerCoverageGrant.findMany({
      where: {
        organizationId,
        actingAdvisorMemberId: advisorMemberId,
        grantType: COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE,
        revokedAt: null,
        startsAt: { lte: asOf },
        OR: [{ endsAt: null }, { endsAt: { gt: asOf } }],
      },
    });
    return rows.map((row) => ({
      grantType: COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE,
      organizationId: row.organizationId,
      customerPartyId: row.customerPartyId,
      primaryOwnerMemberId: row.primaryOwnerMemberId,
      actingAdvisorMemberId: row.actingAdvisorMemberId,
      coveredActions: coverageActionsFromStored(row.coveredActions),
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      revokedAt: row.revokedAt,
    }));
  }
}
