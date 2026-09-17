import { clienteSectionHref, orderHref, quoteHref } from '@/lib/commercial/navigation';
import { conversationHref } from '@/lib/conversations/model';
import { loadDemoSeedIdMap, type DemoSeedClientIds, type DemoSeedIdMap } from '@/lib/demo/owner-demo-registry';
import { auditoriaHref, type AuditQueryState } from '@/lib/audit/url-state';

export const DEMO_MADERAS_KEY = 'maderas_oriente' as const;
export const DEMO_MADERAS_DISPLAY_NAME = 'DEMO MADERAS ORIENTE' as const;

export type DemoMaderasCoherenceLinks = {
  partyId: string;
  opportunityId: string | null;
  quoteId: string | null;
  quoteNumber: string | null;
  orderId: string | null;
  displayName: typeof DEMO_MADERAS_DISPLAY_NAME;
  cliente360: string;
  clienteHistorial: string;
  clienteDocumentos: string;
  quote: string | null;
  order: string | null;
  conversacionesDesk: string;
  /** Searchable Auditoría presets for owner-demo BV (real filters, not a static table). */
  auditPresets: {
    maderasParty: string;
    cotizacion: string;
    pedido: string;
    conversacion: string;
    quoteById: string | null;
    orderById: string | null;
  };
};

export function findDemoMaderasClient(
  map: DemoSeedIdMap = loadDemoSeedIdMap(),
): DemoSeedClientIds | null {
  return map.clients.find((c) => c.key === DEMO_MADERAS_KEY) ?? null;
}

export function auditSearchPreset(state: AuditQueryState): string {
  return auditoriaHref('/auditoria', state);
}

/**
 * Cross-page durable hrefs for DEMO MADERAS ORIENTE.
 * Quote ↔ Pedido ↔ Cliente360 ↔ Audit must share the same seeded ids.
 */
export function demoMaderasCoherenceLinks(
  map: DemoSeedIdMap = loadDemoSeedIdMap(),
): DemoMaderasCoherenceLinks | null {
  const maderas = findDemoMaderasClient(map);
  if (!maderas?.partyId) return null;

  const partyId = maderas.partyId;
  const quoteId = maderas.quoteId;
  const orderId = maderas.orderId;

  return {
    partyId,
    opportunityId: maderas.opportunityId,
    quoteId,
    quoteNumber: maderas.quoteNumber,
    orderId,
    displayName: DEMO_MADERAS_DISPLAY_NAME,
    cliente360: `/clientes/${encodeURIComponent(partyId)}`,
    clienteHistorial: clienteSectionHref(partyId, 'historial'),
    clienteDocumentos: clienteSectionHref(partyId, 'documentos'),
    quote: quoteId ? quoteHref(partyId, quoteId) : null,
    order: orderId ? orderHref(partyId, orderId) : null,
    conversacionesDesk: conversationHref(''),
    auditPresets: {
      maderasParty: auditSearchPreset({
        resourceType: 'party',
        resourceId: partyId,
        q: DEMO_MADERAS_DISPLAY_NAME,
      }),
      cotizacion: auditSearchPreset({ resourceType: 'quote', q: 'Cotización' }),
      pedido: auditSearchPreset({ resourceType: 'order', q: 'Pedido' }),
      conversacion: auditSearchPreset({
        resourceType: 'conversation',
        q: 'Conversación',
      }),
      quoteById: quoteId
        ? auditSearchPreset({ resourceType: 'quote', resourceId: quoteId })
        : null,
      orderById: orderId
        ? auditSearchPreset({ resourceType: 'order', resourceId: orderId })
        : null,
    },
  };
}

/** Event types Historial / Auditoría should surface for a full MADERAS commercial loop. */
export const DEMO_MADERAS_EXPECTED_LOOP_EVENT_TYPES = [
  'party.created',
  'opportunity.created',
  'quote.created',
  'quote.send_recorded',
  'order.created',
  'conversation.recorded',
] as const;

export type DemoMaderasExpectedEventType = (typeof DEMO_MADERAS_EXPECTED_LOOP_EVENT_TYPES)[number];

export function auditQueryMatchesDemoIntent(
  state: AuditQueryState,
  intent: 'maderas' | 'cotizacion' | 'pedido' | 'conversacion',
): boolean {
  const q = state.q?.toLocaleLowerCase('es') ?? '';
  const type = state.resourceType?.trim() ?? '';
  switch (intent) {
    case 'maderas':
      return (
        type === 'party' ||
        q.includes('maderas') ||
        Boolean(state.resourceId && state.resourceId === findDemoMaderasClient()?.partyId)
      );
    case 'cotizacion':
      return type === 'quote' || q.includes('cotiz') || q.includes('quote');
    case 'pedido':
      return type === 'order' || q.includes('pedido') || q.includes('order');
    case 'conversacion':
      return (
        type === 'conversation' ||
        q.includes('convers') ||
        Boolean(state.action?.includes('conversation'))
      );
  }
}
