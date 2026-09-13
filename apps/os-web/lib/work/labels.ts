import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  AttentionType,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';

export function formatWorkStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'En curso';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
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
      return status;
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
      return status;
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
      return priority;
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
      return 'Trabajo reasignado';
    case 'overdue_work':
      return 'Trabajo vencido';
    case 'pending_approval':
      return 'Aprobación pendiente';
    default:
      return 'Necesita atención';
  }
}

export function formatAttentionReason(item: AttentionItemReadModel): string {
  switch (item.reasonCode) {
    case 'work.open.owned': {
      const title =
        typeof item.reasonDetail.title === 'string' ? item.reasonDetail.title : null;
      return title ? `Trabajo asignado: ${title}` : 'Tiene un trabajo asignado';
    }
    case 'work.reassigned.to_you':
      return 'Un trabajo fue reasignado a usted';
    case 'work.open.overdue':
      return 'Un trabajo asignado ya venció';
    case 'approval.pending.for_you':
      return 'Espera su decisión de aprobación';
    default:
      return 'Requiere su revisión';
  }
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
