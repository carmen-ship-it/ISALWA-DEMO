import type { PartyTimelineEntryReadModel, PartyTimelineFacts } from '@isalwa/os-contracts';
import { formatRecordStatus, formatStage, presentStage, formatOpportunityStatus } from './labels';
import { formatOptionalCentavos } from './money';
import { quoteManualSendHistoryLabel } from './quote-manual-send';
import { CONTACT_PHONE_REASON_LABELS, CONTACT_PHONE_VERIFICATION_LABELS } from '@/lib/party/contact-phone';
import { CONTACT_RELATION_END_LABELS, FOLLOWUP_PREFERENCE_LABELS } from '@/lib/party/customer-self-service';

const EVENT_LABELS: Record<string, string> = {
  'party.created': 'Cliente registrado',
  'party.updated': 'Datos del cliente actualizados',
  'party.deactivated': 'Cliente desactivado',
  'party.reactivated': 'Cliente reactivado',
  'party.role.assigned': 'Relación comercial asignada',
  'party.role.ended': 'Relación comercial finalizada',
  'party.fiscal_identity.changed': 'Datos fiscales actualizados',
  'party.duplicate.suggested': 'Posible duplicado detectado',
  'party.merge.requested': 'Fusión solicitada',
  'party.merged': 'Registro fusionado',
  'party.merge.rejected': 'Fusión rechazada',
  'contact.updated': 'Contacto actualizado',
  'contact.phone.changed': 'Teléfono de contacto cambiado',
  'contact.phone.retired': 'Teléfono de contacto retirado',
  'contact.endpoint.changed': 'Número de contacto cambiado',
  'contact.endpoint.retired': 'Número de contacto retirado',
  'contact.identity_review.resolved': 'Identidad del número revisada',
  'contact.relation.ended': 'Relación del contacto finalizada',
  'contact.followup_preference.changed': 'Preferencia de seguimiento actualizada',
  'opportunity.created': 'Oportunidad creada',
  'opportunity.updated': 'Oportunidad actualizada',
  'opportunity.stage_changed': 'Etapa de oportunidad cambiada',
  'opportunity.closed': 'Oportunidad cerrada',
  'opportunity.owner_assigned': 'Responsable de oportunidad asignado',
  'quote.created': 'Cotización creada',
  'quote.updated': 'Cotización actualizada',
  'quote.line_added': 'Línea agregada a cotización',
  'quote.line_updated': 'Línea de cotización actualizada',
  'quote.line_removed': 'Línea eliminada de cotización',
  'quote.submitted': 'Cotización presentada',
  'quote.send_recorded': 'Cotización registrada como enviada',
  'quote.cancelled': 'Cotización cancelada',
  'order.created': 'Pedido creado',
  'order.cancelled': 'Pedido cancelado',
  'delivery_note.created': 'Nota de entrega creada',
  'delivery_note.corrected': 'Nota de entrega corregida',
  'warehouse_exit.recorded': 'Salida registrada',
  'customer_delivery.recorded': 'Entrega registrada',
  'commercial_account.owner_reassigned': 'Responsable comercial cambiado',
  'finished_goods.received': 'Ingreso a almacén de productos terminados',
  'finished_goods.corrected': 'Corrección de ingreso a almacén',
  'work.created': 'Trabajo creado',
  'task.reassigned': 'Trabajo reasignado',
  'work.completed': 'Trabajo completado',
  'work.cancelled': 'Trabajo cancelado',
  'approval.requested': 'Aprobación solicitada',
  'approval.approved': 'Aprobación concedida',
  'approval.rejected': 'Aprobación rechazada',
  'approval.escalated': 'Escalado a Gerencia',
};

/** Employee-facing Historial scope — update when backend timeline domains change. */
export const HISTORIAL_SCOPE_COPY =
  'Actividad del cliente, comercial, producción/almacén postventa, trabajo y aprobaciones relacionadas.';

/** Add Spanish labels here when new timeline event types ship — unknown types use fallback. */
export function timelineEventLabel(
  eventType: string,
  facts?: PartyTimelineFacts | null,
): string {
  if (eventType === 'quote.send_recorded') {
    return quoteManualSendHistoryLabel(
      typeof facts?.channel === 'string' ? facts.channel : null,
    );
  }
  return EVENT_LABELS[eventType] ?? 'Actividad registrada';
}

/** Internal fact keys never shown to employees (IDs, association metadata). */
const HIDDEN_FACT_KEYS = new Set([
  'workItemId',
  'ownerMemberId',
  'newOwnerMemberId',
  'previousOwnerMemberId',
  'approverMemberId',
  'requestedByMemberId',
  'decisionByMemberId',
  'approvalRequestId',
  'subjectType',
  'subjectId',
  'partyId',
  'opportunityId',
  'quoteId',
  'orderId',
  'contactId',
  'organizationPartyId',
  'productId',
  'orderLineId',
  'allocatesToOrder',
  'postsStock',
  'roleAssignmentId',
  'partyIdA',
  'partyIdB',
  'targetPartyId',
  'survivorPartyId',
  'quoteLineId',
  'correlationId',
  'decision',
  'decidedAt',
  'deliveryNoteId',
  'correctsNoteId',
  'warehouseExitId',
  'deliveryId',
  'numberingPolicy',
]);

function factLine(
  key: string,
  value: string | number | boolean | null,
  entityType: string,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  switch (key) {
    case 'displayName':
      return `Nombre: ${value}`;
    case 'title':
      return `Título: ${value}`;
    case 'quoteNumber':
      return `Cotización: ${value}`;
    case 'orderNumber':
      return `Pedido: ${value}`;
    case 'internalDocumentRef':
      return `Documento: ${value}`;
    case 'receivedBy':
      return `Recibido por: ${value}`;
    case 'quantity':
      return `Cantidad: ${value}`;
    case 'note':
      return `Nota: ${value}`;
    case 'stage':
      return `Etapa: ${presentStage(String(value))}`;
    case 'status':
      return `Estado: ${formatRecordStatus(String(value), entityType)}`;
    case 'outcome': {
      const outcome = String(value);
      if (outcome === 'won' || outcome === 'lost' || outcome === 'cancelled') {
        return `Resultado: ${formatOpportunityStatus(outcome)}`;
      }
      return `Resultado: ${formatStage(outcome).trim()}`;
    }
    case 'roleKey':
      return `Relación: ${value}`;
    case 'nit':
      return `NIT: ${value}`;
    case 'razonSocial':
      return `Razón social: ${value}`;
    case 'givenName':
    case 'familyName':
      return null;
    case 'totalCentavos': {
      const money = formatOptionalCentavos(String(value));
      return money ? `Total: ${money}` : null;
    }
    case 'reason':
      return `Motivo: ${value}`;
    default:
      if (HIDDEN_FACT_KEYS.has(key)) return null;
      return null;
  }
}

const PARTY_CHANGE_KIND_LABELS: Record<string, string> = {
  update: 'Actualización',
  correction: 'Corrección',
  typo: 'Error de escritura',
};

function factText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '—';
}

/** Field history line for a customer edit; entries recorded before T03 carry only the new values. */
export function partyUpdateSummary(facts: PartyTimelineFacts): string {
  if (typeof facts.changedFields !== 'string') {
    return [typeof facts.displayName === 'string' ? `Nombre: ${facts.displayName}` : null, 'Cambio anterior sin detalle']
      .filter(Boolean)
      .join(' · ');
  }
  const fields = facts.changedFields.split(',').filter(Boolean);
  const parts: string[] = [];
  if (fields.includes('displayName')) parts.push(`Nombre: ${factText(facts.previousDisplayName)} → ${factText(facts.displayName)}`);
  if (fields.includes('legalName')) parts.push(`Razón social: ${factText(facts.previousLegalName)} → ${factText(facts.legalName)}`);
  if (fields.length === 0) parts.push('Sin cambios de valor');
  const kind = typeof facts.changeKind === 'string' ? PARTY_CHANGE_KIND_LABELS[facts.changeKind] : undefined;
  if (kind) parts.push(kind);
  if (typeof facts.reason === 'string' && facts.reason) parts.push(`Motivo: ${facts.reason}`);
  if (typeof facts.version === 'number') parts.push(`Versión ${facts.version}`);
  return parts.join(' · ');
}

const CONTACT_CHANNEL_LABELS: Record<string, string> = { phone: 'Teléfono', whatsapp: 'WhatsApp' };

function isContactNumberEvent(eventType: string): boolean {
  return eventType.startsWith('contact.phone.') || eventType.startsWith('contact.endpoint.');
}

function contactChannelLabel(facts: PartyTimelineFacts): string {
  const channel = typeof facts.channel === 'string' ? CONTACT_CHANNEL_LABELS[facts.channel] : undefined;
  if (!channel) return 'Número';
  return facts.whatsappFollows === true ? `${channel} y WhatsApp` : channel;
}

const IDENTITY_DECISION_LABELS: Record<string, string> = {
  confirmed: 'identidad confirmada, número en uso',
  rejected: 'identidad rechazada, número retirado',
};

/** T03 C7 line: the decision and how it was verified; never the number or an earlier customer. */
export function identityReviewSummary(facts: PartyTimelineFacts): string {
  const decision = typeof facts.decision === 'string' ? IDENTITY_DECISION_LABELS[facts.decision] : undefined;
  const parts = [`${contactChannelLabel({ channel: facts.channel })}: ${decision ?? 'revisión de identidad'}`];
  const method = typeof facts.verificationMethod === 'string' ? CONTACT_PHONE_VERIFICATION_LABELS[facts.verificationMethod] : undefined;
  if (method) parts.push(`Verificación: ${method}`);
  if (typeof facts.note === 'string' && facts.note) parts.push(`Nota: ${facts.note}`);
  return parts.join(' · ');
}

/** Number history line: masked numbers only, with the A2 §58 reason and verification wording. */
export function contactPhoneSummary(eventType: string, facts: PartyTimelineFacts): string {
  let parts: string[];
  if (eventType === 'contact.phone.retired') {
    parts = [`Número retirado: ${factText(facts.retiredPhoneMasked)}`];
  } else if (eventType === 'contact.endpoint.retired') {
    parts = [`${contactChannelLabel(facts)} retirado: ${factText(facts.retiredMasked)}`];
  } else if (eventType === 'contact.endpoint.changed') {
    parts = [`${contactChannelLabel(facts)}: ${factText(facts.previousMasked)} → ${factText(facts.numberMasked)}`];
  } else {
    parts = [`Número: ${factText(facts.previousPhoneMasked)} → ${factText(facts.phoneMasked)}`];
  }
  const reason = typeof facts.reason === 'string' ? CONTACT_PHONE_REASON_LABELS[facts.reason] : undefined;
  if (reason) parts.push(`Motivo: ${reason}${typeof facts.reasonNote === 'string' && facts.reasonNote ? ` (${facts.reasonNote})` : ''}`);
  const method = typeof facts.verificationMethod === 'string' ? CONTACT_PHONE_VERIFICATION_LABELS[facts.verificationMethod] : undefined;
  if (method) parts.push(`Verificación: ${method}`);
  return parts.join(' · ');
}

const SUMMARY_FIELD_LABELS: Record<string, string> = { displayName: 'Nombre', legalName: 'Razón social' };

/** C2 summary entry: what changed, never the values, names or reason text. */
export function restrictedEntrySummary(entry: PartyTimelineEntryReadModel): string {
  const facts = entry.facts;
  const parts: string[] = [];
  if (entry.eventType === 'party.updated' && typeof facts.changedFields === 'string') {
    const fields = facts.changedFields.split(',').filter(Boolean).map((f) => SUMMARY_FIELD_LABELS[f] ?? f);
    parts.push(fields.length > 0 ? `Cambió: ${fields.join(', ')}` : 'Datos del cliente actualizados');
  } else if (isContactNumberEvent(entry.eventType)) {
    parts.push(entry.eventType.endsWith('.retired') ? 'Número de contacto retirado' : 'Número de contacto cambiado');
    const reason = typeof facts.reason === 'string' ? CONTACT_PHONE_REASON_LABELS[facts.reason] : undefined;
    if (reason) parts.push(`Motivo: ${reason}`);
  } else {
    parts.push(timelineEventLabel(entry.eventType, facts));
  }
  if (typeof facts.version === 'number') parts.push(`Versión ${facts.version}`);
  parts.push('Detalle visible para quien puede editar este cliente');
  return parts.join(' · ');
}

export function contactRelationEndedSummary(facts: PartyTimelineFacts): string {
  const reason = typeof facts.reason === 'string' ? CONTACT_RELATION_END_LABELS[facts.reason] : undefined;
  const parts = ['Relación finalizada'];
  if (typeof facts.endedOn === 'string' && facts.endedOn) parts.push(facts.endedOn);
  if (reason) parts.push(reason);
  if (typeof facts.reasonNote === 'string' && facts.reasonNote) parts.push(facts.reasonNote);
  return parts.join(' · ');
}

export function timelineEntrySummary(entry: PartyTimelineEntryReadModel): string {
  if (entry.detail === 'summary') return restrictedEntrySummary(entry);
  if (entry.eventType === 'contact.relation.ended') return contactRelationEndedSummary(entry.facts);
  if (entry.eventType === 'contact.followup_preference.changed') {
    const to = typeof entry.facts.to === 'string' ? FOLLOWUP_PREFERENCE_LABELS[entry.facts.to] : undefined;
    return to ? `Seguimiento: ${to}` : 'Preferencia de seguimiento actualizada';
  }
  if (entry.eventType === 'party.updated') return partyUpdateSummary(entry.facts);
  if (isContactNumberEvent(entry.eventType)) {
    return contactPhoneSummary(entry.eventType, entry.facts);
  }
  if (entry.eventType === 'contact.identity_review.resolved') return identityReviewSummary(entry.facts);
  if (entry.eventType === 'quote.send_recorded') {
    const parts = [timelineEventLabel(entry.eventType, entry.facts)];
    if (typeof entry.facts.quoteNumber === 'string' && entry.facts.quoteNumber) {
      parts.push(`Cotización: ${entry.facts.quoteNumber}`);
    }
    if (typeof entry.facts.note === 'string' && entry.facts.note) {
      parts.push(`Nota: ${entry.facts.note}`);
    }
    return parts.join(' · ');
  }

  const entityType = entry.primaryEntityType || entry.eventType.split('.')[0] || '';
  const parts: string[] = [];
  const nameFact =
    typeof entry.facts.displayName === 'string'
      ? entry.facts.displayName
      : typeof entry.facts.title === 'string'
        ? entry.facts.title
        : typeof entry.facts.quoteNumber === 'string'
          ? entry.facts.quoteNumber
          : typeof entry.facts.orderNumber === 'string'
            ? entry.facts.orderNumber
            : null;
  if (nameFact) parts.push(nameFact);

  for (const [key, value] of Object.entries(entry.facts as PartyTimelineFacts)) {
    if (['displayName', 'title', 'quoteNumber', 'orderNumber'].includes(key)) continue;
    if (HIDDEN_FACT_KEYS.has(key)) continue;
    const line = factLine(key, value, entityType);
    if (line) parts.push(line);
  }
  return parts.join(' · ') || timelineEventLabel(entry.eventType, entry.facts);
}

/** Timeline entries must never expose raw payload — only allowlisted facts. */
export function assertNoRawPayload(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return true;
  return !('payload' in entry);
}

export function assertNoContextSnapshot(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return true;
  const facts = 'facts' in entry ? (entry as { facts: unknown }).facts : null;
  if (typeof facts === 'object' && facts !== null && 'contextSnapshot' in facts) return false;
  return !('contextSnapshot' in entry);
}

export function sortTimelineChronologicalDesc<T extends { occurredAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
