import type { CommitmentError, CommitmentState } from '@isalwa/os-contracts';

export const COMMITMENT_COPY = {
  kicker: 'Operación',
  title: 'Compromisos',
  record: 'Registrar compromiso',
  text: 'Qué se comprometió',
  due: 'Fecha',
  dueHint: 'Opcional. El día es el de Bolivia.',
  placeholder: 'Confirmar despacho mañana',
  empty: 'Sin compromisos pendientes.',
  emptyDescription: 'Los compromisos registrados con este cliente aparecerán aquí.',
  sectionHint:
    'Promesas registradas con este cliente: quién prometió, qué, para cuándo y si se cumplió. Un compromiso del cliente no confirma un pago.',
  ownerNote: 'Quedará a nombre de quien lo registra.',
  create: 'Crear compromiso',
  createNote: 'La persona responsable recibe un aviso dentro de ISALWA.',
  responsible: 'Responsable',
  responsiblePlaceholder: 'Buscar persona activa (mín. 2 letras)',
  responsibleRequired: 'Elija al responsable de la lista.',
  assignToMe: 'Asignarme a mí',
  customer: 'Cliente',
  customerHint: 'Opcional. Sin cliente, el compromiso es interno del equipo.',
  dueTime: 'Hora',
  dueTimeHint: 'Hora de Bolivia. Si no indica hora, vence a las 12:00.',
  dueDateRequiredForTime: 'Indique también el día.',
  source: 'Origen',
  openFromCustomer: 'Para registrar uno ligado a un cliente, también puede abrirlo desde la ficha del cliente.',
  originEmployee: 'Promesa del equipo',
  originCustomer: 'Reportado por el cliente',
  originHint: 'Si el cliente lo dijo, márquelo así. No confirma un pago.',
  promisedBy: 'Prometió',
  promisedTo: 'A',
  followUpOwner: 'Seguimiento',
  recordedBy: 'Registró',
  fulfilledBy: 'Cumplió',
  suggestion: 'Posible compromiso detectado',
  suggestionBoundary: 'Una sugerencia no es un compromiso hasta que una persona lo confirma.',
  saved: 'Compromiso registrado.',
  saveFailed: 'No se pudo guardar el compromiso.',
  fulfill: 'Marcar cumplido',
  fulfilled: 'Compromiso marcado como cumplido.',
  fulfillFailed: 'No se pudo marcar como cumplido.',
  reschedule: 'Cambiar fecha',
  rescheduled: 'Fecha cambiada. La anterior queda en el historial.',
  newDate: 'Nueva fecha',
  reassign: 'Reasignar',
  reassigned: 'Compromiso reasignado.',
  newResponsible: 'Nuevo responsable',
  cancel: 'Cancelar compromiso',
  cancelled: 'Compromiso cancelado. El motivo queda en el historial.',
  reason: 'Motivo',
  reasonHint: 'Queda guardado con quién lo hizo y cuándo.',
  reasonRequired: 'Escriba el motivo (mínimo 3 letras).',
  back: 'Volver',
  working: 'Guardando…',
  actionFailed: 'No se pudo guardar el cambio.',
  history: 'Historial',
  historyEmpty: 'Sin cambios registrados.',
  historyRescheduled: 'Cambió la fecha',
  historyReassigned: 'Reasignó',
  historyCancelled: 'Canceló',
  historyFulfilled: 'Marcó como cumplido',
  previousDue: 'Antes',
  previousResponsible: 'Antes responsable',
  noActiveOwner: 'Sin responsable activo',
  queueTitle: 'Esperan responsable',
  queueKicker: 'Continuidad',
  queueDescription:
    'Compromisos abiertos cuyo responsable ya no tiene acceso. Asígnelos a una persona activa para que no queden sin dueño.',
  openDetail: 'Ver detalle',
  detailKicker: 'Compromiso',
  notFound: 'No se encontró el compromiso o no tiene acceso a él.',
  customerReportedLabel: 'Reportado por cliente',
  customerPromisor: 'Cliente',
  sessionExpired: 'La sesión expiró. Inicia sesión nuevamente.',
  paymentBoundary: 'No confirma un pago.',
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
