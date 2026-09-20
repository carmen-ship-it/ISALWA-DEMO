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

/**
 * Display-only labels for stored stage tokens that are not already human Spanish.
 * Does not define a pipeline and does not change the stored value.
 */
const STORED_STAGE_LABELS: Record<string, string> = {
  calificacion: 'Calificación',
  negociacion: 'Negociación',
  propuesta: 'Propuesta',
};

/**
 * Human stage text. A stored status token `open` uses the existing status label
 * for that entity (opportunity Abierta, order Registrado). Known raw tokens use
 * the Spanish label above. Other free-text stages stay as entered.
 */
export function presentStage(stage: string, entityType?: string): string {
  const raw = stage.trim();
  if (raw === 'open') {
    const kind = (entityType ?? 'opportunity').toLowerCase();
    if (kind.includes('order') || kind.includes('pedido')) return formatOrderStatus('open');
    return formatOpportunityStatus('open');
  }
  const known = STORED_STAGE_LABELS[raw.toLowerCase()];
  if (known) return known;
  const shown = formatStage(raw).trim();
  return shown.length > 0 ? shown : 'Sin etapa';
}

/**
 * Value sent to ChangeOpportunityStage. If the person left the human label
 * untouched, keep the stored token. A different typed value is stored as entered.
 */
export function stageCommandValue(submitted: string, stored: string): string {
  const typed = submitted.trim();
  const canonical = stored.trim();
  if (canonical && typed === presentStage(canonical)) return canonical;
  return typed;
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

/**
 * Presentation-only StatusPill tone for commercial record statuses.
 * Must stay aligned with statusToneFromLabel / StatusPill semantic tones.
 * Never maps Abierta/open to success green.
 */
export type CommercialStatusTone =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'muted'
  | 'neutral';

export function statusTone(status: string): CommercialStatusTone {
  switch (status) {
    case 'draft':
      return 'draft'; // Borrador → Sky
    case 'open':
      return 'open'; // Abierta / Registrado → Soft teal
    case 'submitted':
      return 'in_progress'; // Enviada / en curso → Sky
    case 'won':
    case 'accepted':
      return 'approved'; // Ganada / Aceptada → Green
    case 'lost':
      return 'cancelled'; // Perdida → muted (not success)
    case 'cancelled':
      return 'cancelled';
    default:
      return 'neutral';
  }
}

export function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
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
