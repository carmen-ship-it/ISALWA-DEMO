import { createEmployeeCommitment, type CommitmentRecord, type CommitmentResult } from '@isalwa/os-contracts';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Midnight in America/La_Paz, stored as UTC. Matches the existing Bolivia offset. */
export function dueDateInputToIso(value: string | null | undefined): string | null | 'invalid' {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(trimmed)) return trimmed;

  const match = DATE_ONLY.exec(trimmed);
  if (!match) return 'invalid';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return 'invalid';
  }
  return `${match[1]}-${match[2]}-${match[3]}T04:00:00.000Z`;
}

export function buildCommitmentDraft(input: {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  text: string;
  dueDate?: string | null;
  partyId?: string | null;
  createdAt: string;
}): CommitmentResult {
  const dueAt = dueDateInputToIso(input.dueDate);
  if (dueAt === 'invalid') return { ok: false, reason: 'invalid_due' };
  return createEmployeeCommitment({
    id: input.id,
    organizationId: input.organizationId,
    ownerMemberId: input.ownerMemberId,
    createdByMemberId: input.createdByMemberId,
    text: input.text,
    dueAt,
    partyId: input.partyId,
    createdAt: input.createdAt,
  });
}

export function isSavedCommitment(_record: CommitmentRecord): false {
  return false;
}
