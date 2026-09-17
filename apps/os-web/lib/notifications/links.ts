import type { NotificationSource, NotificationSourceType } from '@isalwa/os-contracts';

const LINK_LABELS: Record<NotificationSourceType, string> = {
  work_item: 'Ver trabajo',
  approval_request: 'Revisar',
  party: 'Ver cliente',
  organization_member: 'Ver miembro',
  quote: 'Ver cotización',
  order: 'Ver pedido',
  opportunity: 'Ver oportunidad',
  commitment: 'Ver cliente',
};

/** Only routes that already exist. A missing route is not a card. */
export function notificationRecordHref(source: NotificationSource): string | null {
  const id = source.recordId.trim();
  if (!id) return null;
  const partyId = source.partyId?.trim() ?? '';
  switch (source.recordType) {
    case 'work_item':
      return `/trabajo/${encodeURIComponent(id)}`;
    case 'approval_request':
      return `/aprobaciones/${encodeURIComponent(id)}`;
    case 'party':
      return `/clientes/${encodeURIComponent(id)}`;
    case 'organization_member':
      return `/administracion/equipo/${encodeURIComponent(id)}`;
    case 'quote':
      return partyId
        ? `/clientes/${encodeURIComponent(partyId)}/cotizaciones/${encodeURIComponent(id)}`
        : null;
    case 'order':
      return partyId
        ? `/clientes/${encodeURIComponent(partyId)}/pedidos/${encodeURIComponent(id)}`
        : null;
    case 'opportunity':
      return partyId
        ? `/clientes/${encodeURIComponent(partyId)}/oportunidades/${encodeURIComponent(id)}`
        : null;
    case 'commitment':
      return partyId ? `/clientes/${encodeURIComponent(partyId)}` : null;
    default:
      return null;
  }
}

export function notificationLinkLabel(recordType: NotificationSourceType): string {
  return LINK_LABELS[recordType];
}
