/**
 * Soft AI usage ledger for pilot cost circuit breaker.
 * HARD USD CAP IS NOT GUARANTEED — provider billing may be delayed.
 * Enforces a conservative request/estimate ceiling derived from AI_MONTHLY_BUDGET_USD.
 */

export type AiUsageRecord = {
  organizationId: string;
  memberId: string;
  feature: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd: number;
  at: number;
  success: boolean;
};

export type AiUsageLedgerConfig = {
  monthlyBudgetUsd: number;
  estimatedCostPerRequestUsd: number;
};

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class AiUsageLedger {
  private readonly byOrgMonth = new Map<string, { count: number; estimatedUsd: number }>();
  private readonly recent: AiUsageRecord[] = [];

  constructor(private readonly config: AiUsageLedgerConfig) {}

  private key(organizationId: string): string {
    return `${organizationId}:${monthKey()}`;
  }

  assertUnderBudget(organizationId: string): void {
    const row = this.byOrgMonth.get(this.key(organizationId));
    const estimated = row?.estimatedUsd ?? 0;
    if (estimated >= this.config.monthlyBudgetUsd) {
      throw new Error('AI_BUDGET_EXCEEDED');
    }
  }

  record(input: Omit<AiUsageRecord, 'at' | 'estimatedCostUsd'> & { estimatedCostUsd?: number }): void {
    const estimatedCostUsd =
      input.estimatedCostUsd ?? this.config.estimatedCostPerRequestUsd;
    const key = this.key(input.organizationId);
    const row = this.byOrgMonth.get(key) ?? { count: 0, estimatedUsd: 0 };
    row.count += 1;
    row.estimatedUsd += estimatedCostUsd;
    this.byOrgMonth.set(key, row);
    this.recent.push({
      ...input,
      estimatedCostUsd,
      at: Date.now(),
    });
    if (this.recent.length > 500) this.recent.shift();
  }

  orgMonthSnapshot(organizationId: string): { count: number; estimatedUsd: number } {
    return this.byOrgMonth.get(this.key(organizationId)) ?? { count: 0, estimatedUsd: 0 };
  }

  reset(): void {
    this.byOrgMonth.clear();
    this.recent.length = 0;
  }
}
