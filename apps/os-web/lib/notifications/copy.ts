import type { NotificationKind, NotificationReadState } from '@isalwa/os-contracts';

export const NOTIFICATION_COPY = {
  kicker: 'Interno',
  title: 'Avisos',
  drawerTitle: 'Notificaciones',
  bellLabel: 'Notificaciones',
  sectionNew: 'Nuevas',
  sectionEarlier: 'Anteriores',
  ctaReview: 'Revisar',
  readDoesNotCompleteWork:
    'Marcar como leído no completa el trabajo relacionado. Complete el trabajo desde su registro.',
  unread: 'Sin leer',
  read: 'Leído',
  resolved: 'Resuelto',
  resolvedWhy: 'La condición de origen ya no está.',
  notStored: 'Estos avisos no están guardados. No se envían por correo ni al teléfono.',
  inProductOnly: 'Canal actual: solo dentro de ISALWA. Sin correo, push ni WhatsApp.',
  notMarkedRead: 'No se guardó como leído. Los avisos todavía no quedan registrados.',
  empty: 'Sin avisos para mostrar. Los avisos internos todavía no se guardan.',
  markRead: 'Marcar como leído',
} as const;

const KIND_LABELS: Record<NotificationKind, string> = {
  approval_assigned: 'Aprobación asignada',
  approval_decided: 'Aprobación decidida',
  work_due: 'Trabajo para hoy',
  work_overdue: 'Trabajo vencido',
  customer_attention: 'Atención de cliente',
  commitment_due: 'Compromiso para hoy',
  commitment_overdue: 'Compromiso vencido',
  responsibility_changed: 'Responsable cambiado',
  data_issue_review: 'Dato por revisar',
};

export function notificationKindLabel(kind: NotificationKind): string {
  return KIND_LABELS[kind];
}

export function notificationReadLabel(state: NotificationReadState): string {
  return state === 'unread' ? NOTIFICATION_COPY.unread : NOTIFICATION_COPY.read;
}

export function unreadCountLabel(count: number): string {
  if (count === 1) return '1 sin leer';
  return `${count} sin leer`;
}
