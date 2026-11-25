import type { CoordinationDecisionRecord } from '@isalwa/os-contracts';

/**
 * Process-local Coordinación ledger. Tenant-scoped. No sample rows.
 * Hosted Prisma write remains UNPROVEN — do not invent OsCoordinationDecision claims.
 */
class CoordinationRepository {
  private readonly rows: CoordinationDecisionRecord[] = [];

  decisions(organizationId: string): readonly CoordinationDecisionRecord[] {
    const org = organizationId.trim();
    if (!org) return [];
    return this.rows
      .filter((row) => row.organizationId === org)
      .map((row) => ({ ...row }));
  }

  replaceOrganization(organizationId: string, decisions: readonly CoordinationDecisionRecord[]) {
    const org = organizationId.trim();
    if (!org) return;
    const kept = this.rows.filter((row) => row.organizationId !== org);
    this.rows.length = 0;
    this.rows.push(
      ...kept,
      ...decisions
        .filter((row) => row.organizationId === org)
        .map((row) => ({ ...row })),
    );
  }
}

export const coordinationRepository = new CoordinationRepository();
