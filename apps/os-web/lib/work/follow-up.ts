import {
  CreateWorkItemPayloadSchema,
  CompleteWorkPayloadSchema,
  CancelWorkItemPayloadSchema,
  type WorkSubjectType,
} from '@isalwa/os-contracts';
import type { WorkListResponse } from '@/lib/work/types';
import { formatDueDate } from '@/lib/work/labels';

/** Employee-facing words. Command names stay in code, never in these labels. */
export const FOLLOW_UP_COPY = {
  action: 'Registrar seguimiento',
  section: 'Seguimiento',
  nextAction: 'Próxima acción',
  detail: 'Detalle',
  due: 'Fecha',
  pending: 'Pendiente',
  complete: 'Completar',
  markComplete: 'Marcar como completado',
  cancel: 'Cancelar',
  markCancel: 'Cancelar seguimiento',
  cancelReason: 'Motivo (opcional)',
  cancelled: 'Seguimiento cancelado.',
  placeholder: 'Llamar al cliente para confirmar cantidades',
  ownerNote: 'Quedará a su nombre.',
  dueHint: 'Opcional',
  success: 'Seguimiento registrado.',
  completed: 'Seguimiento completado.',
  emptyTitle: 'Sin seguimiento pendiente',
  emptyDescription: 'Registre la próxima acción para este cliente. Aparecerá aquí como pendiente.',
  titleRequired: 'Escriba la próxima acción.',
  dueInvalid: 'La fecha no es válida.',
  identityMissing: 'No se pudo identificar su usuario. Vuelva a iniciar sesión para registrar el seguimiento.',
  customerMissing: 'No se encontró este cliente.',
  historyNote: 'Completar o cancelar conserva el registro. No elimina el historial.',
} as const;

export const FOLLOW_UP_SUBJECT_TYPES = ['party', 'commercial_account'] as const satisfies readonly WorkSubjectType[];

export type FollowUpSubjectType = (typeof FOLLOW_UP_SUBJECT_TYPES)[number];

const BLOCKED_SUBJECT_TYPES = ['opportunity', 'quote', 'organization_member', 'work_item'] as const;

/** Bolivia has no DST. Wall-clock input is interpreted as America/La_Paz, then stored as UTC. */
const LA_PAZ_OFFSET_HOURS = 4;

export function isFollowUpSubjectType(value: string): value is FollowUpSubjectType {
  return (FOLLOW_UP_SUBJECT_TYPES as readonly string[]).includes(value);
}

export function resolveFollowUpSubject(input: {
  partyId: string;
  commercialAccountId?: string | null;
}): { subjectType: FollowUpSubjectType; subjectId: string } | null {
  const partyId = input.partyId.trim();
  if (!partyId) return null;
  const accountId = input.commercialAccountId?.trim();
  if (accountId) {
    return { subjectType: 'commercial_account', subjectId: accountId };
  }
  return { subjectType: 'party', subjectId: partyId };
}

/**
 * Convert an employee datetime-local value to the existing dueAt contract (UTC Z).
 * Empty means omitted. Already-zoned ISO strings pass through if the contract accepts them.
 */
export function dueAtInputToIso(value: string | null | undefined): string | null | 'invalid' {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(trimmed)) {
    return trimmed.endsWith('Z') && trimmed.includes('.') ? trimmed : trimmed.replace(/Z$/, '.000Z');
  }

  const wall = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!wall) return 'invalid';

  const year = Number(wall[1]);
  const month = Number(wall[2]);
  const day = Number(wall[3]);
  const hour = Number(wall[4]);
  const minute = Number(wall[5]);
  const second = Number(wall[6] ?? '0');
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return 'invalid';
  }

  const utc = Date.UTC(year, month - 1, day, hour + LA_PAZ_OFFSET_HOURS, minute, second);
  if (Number.isNaN(utc)) return 'invalid';
  return new Date(utc).toISOString();
}

export type CreateFollowUpInput = {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  ownerMemberId: string;
  subjectType: string;
  subjectId: string;
};

export type CreateFollowUpBuildResult =
  | { ok: true; payload: Record<string, unknown>; command: 'CreateWorkItem' }
  | { ok: false; error: string };

/** Bind ownership to the authenticated member. A caller-supplied owner is ignored. */
export function bindFollowUpOwner(currentMemberId: string, _requestedOwnerId?: string | null): string | null {
  const owner = currentMemberId.trim();
  return owner || null;
}

export function buildCreateFollowUpPayload(input: CreateFollowUpInput): CreateFollowUpBuildResult {
  const title = input.title.trim();
  if (!title) return { ok: false, error: FOLLOW_UP_COPY.titleRequired };

  const ownerMemberId = bindFollowUpOwner(input.ownerMemberId);
  if (!ownerMemberId) return { ok: false, error: FOLLOW_UP_COPY.identityMissing };

  if (!isFollowUpSubjectType(input.subjectType)) {
    return { ok: false, error: 'El seguimiento solo puede vincularse al cliente o a su cuenta comercial.' };
  }
  const subjectId = input.subjectId.trim();
  if (!subjectId) return { ok: false, error: FOLLOW_UP_COPY.customerMissing };

  const due = dueAtInputToIso(input.dueAt);
  if (due === 'invalid') return { ok: false, error: FOLLOW_UP_COPY.dueInvalid };

  const payload: Record<string, unknown> = {
    title,
    ownerMemberId,
    subjectType: input.subjectType,
    subjectId,
  };

  const description = input.description?.trim();
  if (description) payload.description = description;
  if (due) payload.dueAt = due;

  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: FOLLOW_UP_COPY.dueInvalid };

  return { ok: true, payload: parsed.data as Record<string, unknown>, command: 'CreateWorkItem' };
}

export function buildCompleteWorkPayload(workItemId: string):
  | { ok: true; payload: { workItemId: string }; command: 'CompleteWork' }
  | { ok: false; error: string } {
  const id = workItemId.trim();
  if (!id) return { ok: false, error: 'No se encontró el seguimiento.' };
  const parsed = CompleteWorkPayloadSchema.safeParse({ workItemId: id });
  if (!parsed.success) return { ok: false, error: 'No se encontró el seguimiento.' };
  return { ok: true, payload: parsed.data, command: 'CompleteWork' };
}

export function buildCancelWorkPayload(
  workItemId: string,
  reason?: string | null,
):
  | { ok: true; payload: { workItemId: string; reason?: string }; command: 'CancelWorkItem' }
  | { ok: false; error: string } {
  const id = workItemId.trim();
  if (!id) return { ok: false, error: 'No se encontró el seguimiento.' };
  const payload: { workItemId: string; reason?: string } = { workItemId: id };
  const trimmed = reason?.trim();
  if (trimmed) payload.reason = trimmed;
  const parsed = CancelWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'No se encontró el seguimiento.' };
  return { ok: true, payload: parsed.data, command: 'CancelWorkItem' };
}

export function followUpStatusLabel(status: string): string {
  if (status === 'open') return FOLLOW_UP_COPY.pending;
  if (status === 'completed') return 'Completado';
  if (status === 'cancelled') return 'Cancelado';
  return FOLLOW_UP_COPY.pending;
}

export function presentClientFollowUp(work: {
  title: string;
  status: string;
  dueAt: string | null;
}): { title: string; statusLabel: string; dueLabel: string; dueCaption: string } {
  return {
    title: work.title,
    statusLabel: followUpStatusLabel(work.status),
    dueCaption: FOLLOW_UP_COPY.due,
    dueLabel: formatDueDate(work.dueAt),
  };
}

export function mergeRelatedWork(
  partyWork: WorkListResponse,
  accountWork: WorkListResponse | null,
): WorkListResponse {
  if (!accountWork) return partyWork;
  const seen = new Set(partyWork.items.map((item) => item.workItemId));
  const extra = accountWork.items.filter((item) => !seen.has(item.workItemId));
  const stale = Boolean(partyWork.freshness?.isStale || accountWork.freshness?.isStale);
  const freshness = stale
    ? partyWork.freshness?.isStale
      ? partyWork.freshness
      : accountWork.freshness
    : partyWork.freshness;
  return {
    items: [...partyWork.items, ...extra].slice(0, 5),
    meta: partyWork.meta,
    freshness,
  };
}

export function isBlockedFollowUpSubject(value: string): boolean {
  return (BLOCKED_SUBJECT_TYPES as readonly string[]).includes(value);
}
