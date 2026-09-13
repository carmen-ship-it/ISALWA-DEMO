import type { MemberSummaryReadModel } from '@isalwa/os-contracts';
import { memberDisplayName } from './labels';

/** Build display labels from directory rows — avoids N+1 GET /members/:id on admin list. */
export function buildDirectoryLabelMap(items: MemberSummaryReadModel[]): Map<string, string> {
  return new Map(
    items.map((item) => [
      item.memberId,
      memberDisplayName(item.displayName, item.givenName, item.familyName),
    ]),
  );
}

export function directoryMemberLabel(
  map: Map<string, string>,
  memberId: string | null | undefined,
): string {
  if (!memberId) return '—';
  return map.get(memberId) ?? 'Otro miembro';
}
