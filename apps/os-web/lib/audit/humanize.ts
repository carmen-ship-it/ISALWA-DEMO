/** Human labels for audit and business-event reads — never raw keys as primary copy. */

const EVENT_TYPE_LABELS: Record<string, string> = {
  'party.created': 'Cliente creado',
  'party.updated': 'Cliente actualizado',
  'party.deactivated': 'Cliente desactivado',
  'party.reactivated': 'Cliente reactivado',
  'party.merged': 'Clientes fusionados',
  'contact.updated': 'Contacto actualizado',
  'lead.created': 'Prospecto registrado',
  'lead.resolved': 'Prospecto resuelto',
  'location.created': 'Ubicación registrada',
  'location.updated': 'Ubicación actualizada',
  'work_item.created': 'Trabajo creado',
  'work_item.updated': 'Trabajo actualizado',
  'work_item.completed': 'Trabajo completado',
  'approval.requested': 'Aprobación solicitada',
  'approval.approved': 'Aprobación concedida',
  'approval.rejected': 'Aprobación rechazada',
  'approval.escalated': 'Escalado a Gerencia',
  'member.role.changed': 'Rol principal asignado',
  'member.additional_role.granted': 'Permiso adicional otorgado',
  'member.additional_role.ended': 'Permiso adicional finalizado',
  'member.manager.changed': 'Responsable directo cambiado',
  'member.suspended': 'Acceso suspendido',
  'member.activated': 'Acceso activado',
  'member.terminated': 'Acceso finalizado',
  'delegation.granted': 'Delegación otorgada',
  'delegation.revoked': 'Delegación revocada',
  'opportunity.created': 'Oportunidad creada',
  'opportunity.created_from_conversation': 'Oportunidad creada desde conversación',
  'opportunity.updated': 'Oportunidad actualizada',
  'quote.created': 'Cotización creada',
  'quote.updated': 'Cotización actualizada',
  'quote.submitted': 'Cotización presentada',
  'quote.send_recorded': 'Cotización registrada como enviada',
  'order.created': 'Pedido creado',
  'order.updated': 'Pedido actualizado',
  'issue.reported': 'Incidencia reportada',
  'issue.created_from_conversation': 'Incidencia creada desde conversación',
  'issue.updated': 'Incidencia actualizada',
  'commitment.created': 'Compromiso registrado',
  'commitment.created_from_conversation': 'Compromiso creado desde conversación',
  'commitment.updated': 'Compromiso actualizado',
  'work_item.created_from_conversation': 'Seguimiento creado desde conversación',
  'follow_up.created_from_conversation': 'Seguimiento creado desde conversación',
  'conversation.recorded': 'Conversación registrada',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  party: 'Cliente',
  contact: 'Contacto',
  lead: 'Prospecto',
  location: 'Ubicación',
  work_item: 'Trabajo',
  approval_request: 'Aprobación',
  member: 'Persona',
  delegation: 'Delegación',
  opportunity: 'Oportunidad',
  quote: 'Cotización',
  order: 'Pedido',
  issue: 'Incidencia',
  commitment: 'Compromiso',
  conversation: 'Conversación',
  organization: 'Organización',
};

/** Provenance copy when a business record was created from a conversation. */
export const CONVERSATION_ORIGIN_COPY = {
  origen: 'Origen: Conversación',
  verConversacion: 'Ver conversación',
} as const;

export function humanizeConversationOriginEvent(
  kind: 'opportunity' | 'issue' | 'follow_up' | 'commitment',
): string {
  switch (kind) {
    case 'opportunity':
      return 'Oportunidad creada desde conversación';
    case 'issue':
      return 'Incidencia creada desde conversación';
    case 'follow_up':
      return 'Seguimiento creado desde conversación';
    case 'commitment':
      return 'Compromiso creado desde conversación';
  }
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'party.created': 'Cliente creado',
  'party.updated': 'Cliente actualizado',
  'party.deactivated': 'Cliente desactivado',
  'party.reactivated': 'Cliente reactivado',
  'party.merged': 'Clientes fusionados',
  'contact.updated': 'Contacto actualizado',
  'approval.requested': 'Aprobación solicitada',
  'approval.approved': 'Aprobación concedida',
  'approval.rejected': 'Aprobación rechazada',
  'approval.escalated': 'Escalado a Gerencia',
  'member.role.changed': 'Rol asignado',
  'member.suspended': 'Acceso suspendido',
  'member.activated': 'Acceso activado',
  'member.terminated': 'Acceso finalizado',
};

function titleCaseFromKey(key: string): string {
  return key
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeBusinessEventType(eventType: string): string {
  const trimmed = eventType.trim();
  return EVENT_TYPE_LABELS[trimmed] ?? titleCaseFromKey(trimmed);
}

export function humanizeResourceType(resourceType: string): string {
  const trimmed = resourceType.trim();
  return RESOURCE_TYPE_LABELS[trimmed] ?? titleCaseFromKey(trimmed);
}

export function humanizeAuditAction(action: string, resourceType?: string): string {
  const trimmed = action.trim();
  if (AUDIT_ACTION_LABELS[trimmed]) return AUDIT_ACTION_LABELS[trimmed];
  if (EVENT_TYPE_LABELS[trimmed]) return EVENT_TYPE_LABELS[trimmed];
  if (resourceType) {
    const composite = `${resourceType}.${trimmed}`;
    if (AUDIT_ACTION_LABELS[composite]) return AUDIT_ACTION_LABELS[composite];
  }
  return titleCaseFromKey(trimmed);
}

export function entitySummaryLabel(entityType: string, entityId: string): string {
  const typeLabel = humanizeResourceType(entityType);
  const shortId = entityId.length > 8 ? `${entityId.slice(0, 8)}…` : entityId;
  return `${typeLabel} · ${shortId}`;
}

export const AUDIT_READ_BOUNDARY =
  'Lectura acotada en pantalla. No hay exportación masiva ni edición desde aquí.';

export const MEMORY_CHANGES_BOUNDARY =
  'Ventana de cambios recientes en la organización. No sustituye el registro de auditoría completo.';
