import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  AttentionType,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import { elapsedAge } from '@/lib/time/elapsed';

export function formatWorkStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'En curso';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Estado de trabajo';
  }
}

export function formatApprovalStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobado';
    case 'rejected':
      return 'Rechazado';
    default:
      return 'Estado de aprobación';
  }
}

export function formatWorkApprovalStatus(status: WorkSummaryReadModel['approvalStatus']): string {
  switch (status) {
    case 'none':
      return 'Sin aprobación';
    case 'pending':
      return 'Aprobación pendiente';
    case 'approved':
      return 'Aprobado';
    case 'rejected':
      return 'Rechazado';
    default:
      return 'Estado de aprobación';
  }
}

export function formatPriority(priority: string): string {
  switch (priority) {
    case 'low':
      return 'Baja';
    case 'normal':
      return 'Normal';
    case 'high':
      return 'Alta';
    case 'urgent':
      return 'Urgente';
    default:
      return 'Prioridad registrada';
  }
}

export function formatSubjectType(subjectType: string | null): string | null {
  if (!subjectType) return null;
  switch (subjectType) {
    case 'party':
      return 'Cliente';
    case 'organization_member':
      return 'Miembro del equipo';
    case 'commercial_account':
      return 'Cuenta comercial';
    case 'work_item':
      return 'Trabajo relacionado';
    case 'quote':
      return 'Cotización';
    case 'order':
      return 'Pedido';
    default:
      return 'Asunto';
  }
}

export function formatDueDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatAttentionType(type: AttentionType): string {
  switch (type) {
    case 'open_work_assigned':
      return 'Trabajo pendiente';
    case 'reassigned_work':
      return 'Reasignado a usted';
    case 'overdue_work':
      return 'Vencido';
    case 'pending_approval':
      return 'Aprobación pendiente';
    default:
      return 'Pendiente';
  }
}

export function attentionStatusTone(
  type: AttentionType,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (type) {
    case 'overdue_work':
      return 'danger';
    case 'open_work_assigned':
      return 'info';
    case 'reassigned_work':
    case 'pending_approval':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function formatAttentionReason(item: AttentionItemReadModel): string {
  switch (item.reasonCode) {
    case 'work.open.owned':
      return 'Trabajo asignado';
    case 'work.reassigned.to_you':
      return 'Reasignado a usted';
    case 'work.open.overdue':
      return 'Vencido';
    case 'approval.pending.for_you':
      return 'Aprobación pendiente';
    default:
      return 'Pendiente';
  }
}

/**
 * Elapsed time after a stored due instant. Does not classify overdue and does
 * not invent a reminder threshold.
 */
export function elapsedSinceStoredDue(iso: string, asOf = new Date()): string | null {
  return elapsedAge(iso, asOf)?.compact ?? null;
}

/** Shows the due date already stored on an overdue item. Does not classify overdue. */
export function attentionDueLabel(item: AttentionItemReadModel, asOf = new Date()): string | null {
  if (item.attentionType !== 'overdue_work') return null;
  const dueAt = item.reasonDetail.dueAt;
  if (typeof dueAt !== 'string') return null;
  const stored = `Venció: ${formatDueDate(dueAt)}`;
  const elapsed = elapsedSinceStoredDue(dueAt, asOf);
  return elapsed ? `${stored} · ${elapsed}` : stored;
}

/**
 * Employee due fact from a stored date. Does not treat a past date as overdue
 * unless the item is already an overdue attention type.
 */
export function attentionStoredDueLabel(item: AttentionItemReadModel): string | null {
  const overdue = attentionDueLabel(item);
  if (overdue) return overdue;
  if (!Object.prototype.hasOwnProperty.call(item.reasonDetail, 'dueAt')) return null;
  const dueAt = item.reasonDetail.dueAt;
  if (typeof dueAt !== 'string' || dueAt.trim() === '') return 'Sin fecha';
  const formatted = formatDueDate(dueAt);
  if (formatted === 'Sin fecha') return 'Sin fecha';
  return `Vence: ${formatted}`;
}

export function attentionHeadline(item: AttentionItemReadModel): string {
  const detailTitle =
    typeof item.reasonDetail.title === 'string' ? item.reasonDetail.title : null;
  if (detailTitle) return detailTitle;
  return formatAttentionType(item.attentionType);
}

export function approvalSubjectLabel(approval: ApprovalSummaryReadModel): string {
  const subject = formatSubjectType(approval.subjectType);
  if (approval.workItemId) {
    return subject ? `${subject} · trabajo vinculado` : 'Solicitud de aprobación';
  }
  return subject ?? 'Solicitud de aprobación';
}

export function isWorkOverdue(work: WorkSummaryReadModel, asOf = new Date()): boolean {
  if (work.status !== 'open' || !work.dueAt) return false;
  return new Date(work.dueAt) < asOf;
}

export function statusToneForWork(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'open':
      return 'info';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function statusToneForApproval(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function priorityTone(priority: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (priority) {
    case 'urgent':
      return 'danger';
    case 'high':
      return 'warning';
    case 'normal':
      return 'info';
    default:
      return 'neutral';
  }
}
