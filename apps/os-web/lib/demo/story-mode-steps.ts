/**
 * Owner Story Mode — "Recorrido completo de ISALWA" (20 steps).
 * CTAs resolve against seeded DEMO MADERAS ORIENTE ids when available.
 *
 * Demo company context:
 * - App page deep links append `?datos=demo` so SSR desks keep the Demo filter
 *   when Story CTAs navigate (parity with normal Demo navigation intent).
 * - Raw PDF API routes (`/api/.../pdf`) are left unchanged — they are session/
 *   auth scoped downloads, not app pages.
 * - Effective company cookie (Demo → SYNTH org among memberships) is set by
 *   OwnerDemoProvider (OA-1). This module does not rewrite the company resolver.
 */

import type { DemoSeedIdMap } from '@/lib/demo/owner-demo-registry';

export const STORY_MODE_TITLE = 'Recorrido completo de ISALWA' as const;

export type StoryModeStep = {
  step: number;
  title: string;
  whatHappened: string;
  whoNormallyActs: string;
  whatIsalwaRecorded: string;
  ctaLabel: string;
  hrefFor: (ids: DemoSeedIdMap | null) => string | null;
};

function maderas(ids: DemoSeedIdMap | null) {
  return ids?.clients.find((c) => c.key === 'maderas_oriente') ?? null;
}

/** True for product PDF download APIs — not app pages. */
export function isStoryPdfApiHref(href: string): boolean {
  const pathOnly = href.split('?')[0] ?? href;
  return pathOnly.startsWith('/api/') && pathOnly.endsWith('/pdf');
}

/**
 * Append `datos=demo` to Story Mode app-page CTAs.
 * Leaves null and raw PDF API hrefs unchanged.
 */
export function withStoryDemoDatos(href: string | null): string | null {
  if (href == null) return null;
  if (isStoryPdfApiHref(href)) return href;
  if (/(?:^|[?&])datos=/.test(href)) return href;
  return href.includes('?') ? `${href}&datos=demo` : `${href}?datos=demo`;
}

function storyHref(
  build: (ids: DemoSeedIdMap | null) => string | null,
): StoryModeStep['hrefFor'] {
  return (ids) => withStoryDemoDatos(build(ids));
}

export const STORY_MODE_STEPS: readonly StoryModeStep[] = [
  {
    step: 1,
    title: 'Llega una conversación',
    whatHappened: 'El cliente escribe pidiendo estado del pedido.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Conversación registrada como evidencia (no envía WhatsApp).',
    ctaLabel: 'Ver cliente demo',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m ? `/clientes/${encodeURIComponent(m.partyId)}` : '/conversaciones';
    }),
  },
  {
    step: 2,
    title: 'ISALWA identifica contexto',
    whatHappened: 'Se vincula la conversación a DEMO MADERAS ORIENTE.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Cliente, contacto y ubicación confirmada.',
    ctaLabel: 'Abrir Cliente360',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m ? `/clientes/${encodeURIComponent(m.partyId)}` : null;
    }),
  },
  {
    step: 3,
    title: 'Oportunidad sugerida',
    whatHappened: 'El hilo comercial sugiere una oportunidad abierta.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Sugerencia determinística — no crea sola el registro.',
    ctaLabel: 'Ver oportunidades',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m ? `/clientes/${encodeURIComponent(m.partyId)}?tab=comercial` : '/oportunidades';
    }),
  },
  {
    step: 4,
    title: 'Oportunidad creada',
    whatHappened: 'Se abre la oportunidad del loop sano.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Oportunidad con etapa y valor esperado.',
    ctaLabel: 'Abrir oportunidad',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.opportunityId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/oportunidades/${encodeURIComponent(m.opportunityId)}`;
    }),
  },
  {
    step: 5,
    title: 'Cotización creada',
    whatHappened: 'Se emite la cotización con líneas.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Cotización + líneas + marca demo.',
    ctaLabel: 'Abrir cotización',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.quoteId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/cotizaciones/${encodeURIComponent(m.quoteId)}`;
    }),
  },
  {
    step: 6,
    title: 'PDF generado',
    whatHappened: 'El PDF de cotización está disponible.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Documento PDF generado desde la cotización real.',
    ctaLabel: 'Descargar PDF cotización',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m?.quoteId ? `/api/quotes/${encodeURIComponent(m.quoteId)}/pdf` : null;
    }),
  },
  {
    step: 7,
    title: 'Envío registrado',
    whatHappened: 'Se registra el envío manual (fuera de ISALWA).',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Evidencia de envío manual.',
    ctaLabel: 'Ver cotización enviada',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.quoteId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/cotizaciones/${encodeURIComponent(m.quoteId)}`;
    }),
  },
  {
    step: 8,
    title: 'Seguimiento programado',
    whatHappened: 'Queda un seguimiento de cotización.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Trabajo de seguimiento vinculado al cliente.',
    ctaLabel: 'Ver trabajo',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m?.followUpWorkId
        ? `/trabajo/${encodeURIComponent(m.followUpWorkId)}`
        : m
          ? `/clientes/${encodeURIComponent(m.partyId)}`
          : '/inicio';
    }),
  },
  {
    step: 9,
    title: 'Cliente acepta',
    whatHappened: 'El cliente acepta y se convierte a pedido.',
    whoNormallyActs: 'Asesor / persona autorizada a convertir',
    whatIsalwaRecorded: 'Cotización aceptada → Pedido.',
    ctaLabel: 'Ver cotización aceptada',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.quoteId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/cotizaciones/${encodeURIComponent(m.quoteId)}`;
    }),
  },
  {
    step: 10,
    title: 'Pedido creado',
    whatHappened: 'Existe el Pedido del loop sano.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Pedido abierto con líneas.',
    ctaLabel: 'Abrir pedido',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.orderId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/pedidos/${encodeURIComponent(m.orderId)}`;
    }),
  },
  {
    step: 11,
    title: 'Preparación operativa',
    whatHappened: 'Se solicita revisión operativa del pedido.',
    whoNormallyActs: 'Asesor / coordinación',
    whatIsalwaRecorded: 'Trabajo de preparación operativa (producción).',
    ctaLabel: 'Ver preparación',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.orderId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/pedidos/${encodeURIComponent(m.orderId)}`;
    }),
  },
  {
    step: 12,
    title: 'Producción / Almacén / Compras review',
    whatHappened: 'Producción revisa el pedido.',
    whoNormallyActs: 'Producción',
    whatIsalwaRecorded: 'Revisión de producción solicitada.',
    ctaLabel: 'Ver revisión',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m?.orderPrepWorkId
        ? `/trabajo/${encodeURIComponent(m.orderPrepWorkId)}`
        : m?.orderId
          ? `/clientes/${encodeURIComponent(m.partyId)}/pedidos/${encodeURIComponent(m.orderId)}`
          : null;
    }),
  },
  {
    step: 13,
    title: 'Producto terminado',
    whatHappened: 'Entra producto terminado a almacén.',
    whoNormallyActs: 'Almacén',
    whatIsalwaRecorded: 'Recepción de productos terminados (FG).',
    ctaLabel: 'Ver pedido / FG',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.orderId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/pedidos/${encodeURIComponent(m.orderId)}`;
    }),
  },
  {
    step: 14,
    title: 'Nota de entrega',
    whatHappened: 'Se emite la nota de entrega con PDF.',
    whoNormallyActs: 'Persona autorizada para entregas',
    whatIsalwaRecorded: 'Nota de entrega + PDF disponible.',
    ctaLabel: 'Descargar PDF nota',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m?.deliveryNoteId
        ? `/api/delivery-notes/${encodeURIComponent(m.deliveryNoteId)}/pdf`
        : null;
    }),
  },
  {
    step: 15,
    title: 'Salida',
    whatHappened: 'Se registra la salida de almacén.',
    whoNormallyActs: 'Almacén',
    whatIsalwaRecorded: 'Salida vinculada al pedido.',
    ctaLabel: 'Ver pedido',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.orderId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/pedidos/${encodeURIComponent(m.orderId)}`;
    }),
  },
  {
    step: 16,
    title: 'Entrega',
    whatHappened: 'Se registra la entrega al cliente.',
    whoNormallyActs: 'Persona autorizada para entregas',
    whatIsalwaRecorded: 'Entrega registrada con receptor.',
    ctaLabel: 'Ver entrega',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      if (!m?.orderId) return null;
      return `/clientes/${encodeURIComponent(m.partyId)}/pedidos/${encodeURIComponent(m.orderId)}`;
    }),
  },
  {
    step: 17,
    title: 'Documentos',
    whatHappened: 'Los documentos del cliente quedan visibles.',
    whoNormallyActs: 'Asesor / Gerencia',
    whatIsalwaRecorded: 'PDFs en Documentos.',
    ctaLabel: 'Abrir documentos',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m ? `/clientes/${encodeURIComponent(m.partyId)}?tab=documentos` : null;
    }),
  },
  {
    step: 18,
    title: 'Cliente360 historial',
    whatHappened: 'El historial del cliente muestra el loop completo.',
    whoNormallyActs: 'Asesor / Gerencia',
    whatIsalwaRecorded: 'Timeline / Cliente360 del demo.',
    ctaLabel: 'Abrir historial',
    hrefFor: storyHref((ids) => {
      const m = maderas(ids);
      return m ? `/clientes/${encodeURIComponent(m.partyId)}?tab=historial` : null;
    }),
  },
  {
    step: 19,
    title: 'Auditoría',
    whatHappened: 'La memoria de cambios refleja los hechos.',
    whoNormallyActs: 'Gerencia',
    whatIsalwaRecorded: 'Cambios recientes en Inicio.',
    ctaLabel: 'Ver Inicio',
    hrefFor: storyHref(() => '/inicio'),
  },
  {
    step: 20,
    title: 'Gerencia / métricas',
    whatHappened: 'La vista de gerencia puede filtrar demo vs real.',
    whoNormallyActs: 'Gerencia',
    whatIsalwaRecorded: 'Métricas con filtro Datos reales / Demo.',
    ctaLabel: 'Ver gerencia',
    hrefFor: storyHref(() => '/inicio?lente=gerencia'),
  },
] as const;

export function storyStepState(
  stepNumber: number,
  currentStep: number,
): 'completed' | 'current' | 'future' {
  if (stepNumber < currentStep) return 'completed';
  if (stepNumber === currentStep) return 'current';
  return 'future';
}
