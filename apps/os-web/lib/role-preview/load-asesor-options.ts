import type { OsApiClient } from '@/lib/api/os-api-client';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';

/** Distinct commercial owners for Vista de evaluación · Asesor picker (SYNTH/REAL). */
export async function loadEvaluationAsesorOptions(
  client: OsApiClient,
): Promise<Array<{ memberId: string; label: string }>> {
  try {
    const [open, submitted] = await Promise.all([
      client.listOpportunities({ visibility: 'org', status: 'open', limit: 100 }),
      client.listQuotes({ visibility: 'org', status: 'submitted', limit: 100 }),
    ]);
    const ids = [
      ...new Set([
        ...open.items.map((i) => i.ownerMemberId),
        ...submitted.items.map((i) => i.ownerMemberId),
      ]),
    ].filter(Boolean);
    if (ids.length === 0) return [];
    const labels = await resolveMemberLabels(client, ids);
    return ids.map((memberId) => ({
      memberId,
      label: memberLabel(labels, memberId),
    }));
  } catch {
    return [];
  }
}
