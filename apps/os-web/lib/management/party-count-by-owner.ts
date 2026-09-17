import type { OpportunitySummaryReadModel, QuoteSummaryReadModel } from '@isalwa/os-contracts';

export function partyCountByOwner(
  opportunities: readonly OpportunitySummaryReadModel[],
  quotes: readonly QuoteSummaryReadModel[],
): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  const touch = (memberId: string, partyId: string) => {
    let set = sets.get(memberId);
    if (!set) {
      set = new Set();
      sets.set(memberId, set);
    }
    set.add(partyId);
  };
  for (const row of opportunities) touch(row.ownerMemberId, row.partyId);
  for (const row of quotes) touch(row.ownerMemberId, row.partyId);
  const out = new Map<string, number>();
  for (const [memberId, set] of sets) out.set(memberId, set.size);
  return out;
}
