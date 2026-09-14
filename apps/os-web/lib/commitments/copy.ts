import type { CommitmentError, CommitmentState } from '@isalwa/os-contracts';

export const COMMITMENT_COPY = {
  kicker: 'Operación',
  title: 'Compromisos',
  record: 'Registrar compromiso',
  text: 'Qué se comprometió',
  due: 'Fecha',
  dueHint: 'Opcional. El día es el de Bolivia.',
  placeholder: 'Confirmar despacho mañana',
  notStored:
    'Estos compromisos no están guardados. Todavía no hay un registro en la empresa.',
  notSaved: 'No se guardó. Todavía no hay un registro de compromisos.',
  empty: 'Sin compromisos para mostrar.',
  ownerNote: 'Quedará a nombre de quien lo registra.',
  suggestion: 'Posible compromiso detectado',
  suggestionBoundary: 'Una sugerencia no es un compromiso hasta que una persona lo confirma.',
} as const;

const STATE_LABELS: Record<CommitmentState, string> = {
  pending: 'Pendiente',
  due_today: 'Vence hoy',
  overdue: 'Vencido',
  fulfilled: 'Cumplido',
  cancelled: 'Cancelado',
};

export function commitmentStateLabel(state: CommitmentState): string {
  return STATE_LABELS[state];
}

export function commitmentErrorCopy(reason: CommitmentError): string {
  switch (reason) {
    case 'text_required':
      return 'Escriba el compromiso.';
    case 'invalid_due':
      return 'La fecha no es válida.';
    case 'owner_required':
    case 'actor_required':
      return 'No se pudo identificar al responsable.';
    case 'organization_required':
      return 'No se encontró la empresa.';
    case 'id_required':
    case 'invalid_time':
      return 'No se pudo preparar el compromiso.';
    case 'subject_incomplete':
      return 'El asunto vinculado está incompleto.';
    case 'already_fulfilled':
      return 'Este compromiso ya está cumplido.';
    case 'already_cancelled':
      return 'Este compromiso ya está cancelado.';
  }
}
