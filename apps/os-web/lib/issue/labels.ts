/**
 * Issue domain labels — Spanish-first copy for UI surfaces.
 */

import type { IssueStatus, IssueJournalType, IssueRelationType, IssueReferenceType } from './types';
import type { StatusPillProps } from '@isalwa/ui';

type StatusPillTone = NonNullable<StatusPillProps['tone']>;

// ─────────────────────────────────────────────────────────────────────────────
// Status labels
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<IssueStatus, string> = {
  reported: 'Reportado',
  triaged: 'Clasificado',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  reopened: 'Reabierto',
};

export function formatIssueStatus(status: IssueStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusToneForIssue(status: IssueStatus): StatusPillTone {
  switch (status) {
    case 'reported':
      return 'warning';
    case 'triaged':
      return 'info';
    case 'in_progress':
      return 'info';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'neutral';
    case 'reopened':
      return 'warning';
    default:
      return 'neutral';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Journal type labels
// ─────────────────────────────────────────────────────────────────────────────

const JOURNAL_TYPE_LABELS: Record<IssueJournalType, string> = {
  observation: 'Observación',
  attempt: 'Intento',
  evidence_reference: 'Referencia a evidencia',
  possible_cause: 'Causa posible',
};

export function formatJournalType(type: IssueJournalType): string {
  return JOURNAL_TYPE_LABELS[type] ?? type;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relation type labels
// ─────────────────────────────────────────────────────────────────────────────

const RELATION_TYPE_LABELS: Record<IssueRelationType, string> = {
  related: 'Relacionado',
  previous_occurrence: 'Ocurrencia anterior',
  recurrence_of: 'Recurrencia de',
};

export function formatRelationType(type: IssueRelationType): string {
  return RELATION_TYPE_LABELS[type] ?? type;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference type labels
// ─────────────────────────────────────────────────────────────────────────────

const REFERENCE_TYPE_LABELS: Record<IssueReferenceType, string> = {
  party: 'Cliente',
  commercial_account: 'Cuenta comercial',
  opportunity: 'Oportunidad',
  quote: 'Cotización',
  order: 'Pedido',
  product: 'Producto',
  delivery: 'Entrega',
  work_item: 'Trabajo',
  approval_request: 'Aprobación',
  commitment: 'Compromiso',
};

export function formatReferenceType(type: IssueReferenceType): string {
  return REFERENCE_TYPE_LABELS[type] ?? type;
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy constants
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_COPY = {
  // Report form
  reportTitle: 'Reportar problema',
  reportAction: 'Reportar problema',
  descriptionLabel: '¿Qué ocurrió?',
  descriptionPlaceholder: 'Describa el problema con suficiente detalle para que otro pueda investigar.',
  contextLabel: 'Relacionado con',
  reportedByLabel: 'Reportado por',
  dateLabel: 'Fecha',
  submitLabel: 'Reportar problema',
  submitPending: 'Reportando…',
  submitSuccess: 'Problema reportado. Pronto será revisado.',

  // List
  listTitle: 'Incidencias',
  listKicker: 'Problemas',
  listDescription: 'Problemas reportados y su estado de resolución.',
  tabOpen: 'Abiertas',
  tabAssigned: 'Asignadas a mí',
  tabReported: 'Reportadas por mí',
  tabResolved: 'Resueltas',
  emptyOpen: 'No hay incidencias abiertas.',
  emptyAssigned: 'No tiene incidencias asignadas.',
  emptyReported: 'No ha reportado incidencias.',
  emptyResolved: 'No hay incidencias resueltas.',

  // Detail
  detailKicker: 'Incidencia',
  whatHappened: 'Qué ocurrió',
  reporter: 'Reportó',
  owner: 'Responsable',
  cause: 'Causa confirmada',
  possibleCauses: 'Causas posibles',
  resolution: 'Resolución',
  outcome: 'Resultado',
  history: 'Antecedentes',
  investigation: 'Investigación',
  linkedWork: 'Trabajo vinculado',
  relatedIssues: 'Incidencias relacionadas',
  noOwner: 'Sin asignar',
  noCause: 'No confirmada',
  noResolution: 'Pendiente',
  noOutcome: 'No registrado',

  // Errors
  descriptionRequired: 'Describa qué ocurrió.',
  sessionExpired: 'Su sesión venció. Vuelva a iniciar sesión.',
  commandFailed: 'No se pudo reportar el problema. Intente de nuevo.',

  // Empty panel for Cliente 360
  cliente360Empty: 'Todavía no hay incidencias registradas para este cliente.',
  cliente360EmptyHint: 'Cuando se reporte un problema relacionado con este cliente, aparecerá aquí.',
} as const;
