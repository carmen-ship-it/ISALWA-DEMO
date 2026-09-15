import { elapsedAge } from '@/lib/time/elapsed';

export const UNRECOGNIZED_STATUS_LABEL = 'Estado no reconocido';

export function formatOpportunityStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Abierta';
    case 'won':
      return 'Ganada';
    case 'lost':
      return 'Perdida';
    case 'cancelled':
      return 'Cancelada';
    default:
      return UNRECOGNIZED_STATUS_LABEL;
  }
}

export function formatQuoteStatus(status: string): string {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'submitted':
      return 'Enviada';
    case 'accepted':
      return 'Aceptada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return UNRECOGNIZED_STATUS_LABEL;
  }
}

export function formatOrderStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Registrado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return UNRECOGNIZED_STATUS_LABEL;
  }
}

/** Free-text stage as entered. Underscores become spaces. Not a pipeline taxonomy. */
export function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ');
}

export function presentStage(stage: string): string {
  const shown = formatStage(stage).trim();
  return shown.length > 0 ? shown : 'Sin etapa';
}

/** Status label when the record kind is known. Ambiguous values stay unrecognized. */
export function formatRecordStatus(status: string, entityType: string): string {
  const kind = entityType.toLowerCase();
  if (kind.includes('quote')) return formatQuoteStatus(status);
  if (kind.includes('order')) return formatOrderStatus(status);
  if (kind.includes('opportunity')) return formatOpportunityStatus(status);

  const recognized = [
    formatQuoteStatus(status),
    formatOrderStatus(status),
    formatOpportunityStatus(status),
  ].filter((label) => label !== UNRECOGNIZED_STATUS_LABEL);
  const unique = [...new Set(recognized)];
  return unique.length === 1 ? unique[0] : UNRECOGNIZED_STATUS_LABEL;
}

export function statusTone(
  status: string,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'won' || status === 'accepted' || status === 'open') return 'success';
  if (status === 'submitted') return 'info';
  if (status === 'lost' || status === 'cancelled') return 'danger';
  if (status === 'draft') return 'neutral';
  return 'neutral';
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

/**
 * Human age for list rows. Falls back to the exact timestamp when the age is under a minute.
 * Detail pages should keep formatTimestamp.
 */
export function formatListAge(iso: string | null, asOf = new Date()): string | null {
  if (!iso) return null;
  const age = elapsedAge(iso, asOf);
  if (age) return age.phrase;
  return formatTimestamp(iso);
}
