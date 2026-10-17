/**
 * Guided presentation — "Recorrido de ISALWA" (20 steps).
 *
 * Neutral by design (re-review R3/R2F decision 3): steps link to generic
 * product pages the person's own permissions govern, never to seeded
 * synthetic records, and no step selects an organization or data mode. The
 * walkthrough content is rewritten in T20; demo removal is T10/T11.
 */

export const STORY_MODE_TITLE = 'Recorrido de ISALWA' as const;

export type StoryModeStep = {
  step: number;
  title: string;
  whatHappened: string;
  whoNormallyActs: string;
  whatIsalwaRecorded: string;
  ctaLabel: string;
  href: string;
};

/** True for product PDF download APIs — not app pages. */
export function isStoryPdfApiHref(href: string): boolean {
  const pathOnly = href.split('?')[0] ?? href;
  return pathOnly.startsWith('/api/') && pathOnly.endsWith('/pdf');
}

/**
 * Append `datos=demo` to an app-page href when the person chose Demo themselves
 * (shell navigation only; not used by the Journey). Leaves null and raw PDF API
 * hrefs unchanged.
 */
export function withStoryDemoDatos(href: string | null): string | null {
  if (href == null) return null;
  if (isStoryPdfApiHref(href)) return href;
  if (/(?:^|[?&])datos=/.test(href)) return href;
  return href.includes('?') ? `${href}&datos=demo` : `${href}?datos=demo`;
}

export const STORY_MODE_STEPS: readonly StoryModeStep[] = [
  {
    step: 1,
    title: 'Llega una conversación',
    whatHappened: 'El cliente escribe pidiendo estado del pedido.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Conversación registrada como evidencia (no envía WhatsApp).',
    ctaLabel: 'Ver conversaciones',
    href: '/conversaciones',
  },
  {
    step: 2,
    title: 'ISALWA identifica contexto',
    whatHappened: 'Se vincula la conversación al cliente.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Cliente, contacto y ubicación confirmada.',
    ctaLabel: 'Ver clientes',
    href: '/clientes',
  },
  {
    step: 3,
    title: 'Oportunidad sugerida',
    whatHappened: 'El hilo comercial sugiere una oportunidad abierta.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Sugerencia determinística — no crea sola el registro.',
    ctaLabel: 'Ver oportunidades',
    href: '/oportunidades',
  },
  {
    step: 4,
    title: 'Oportunidad creada',
    whatHappened: 'Se abre la oportunidad.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Oportunidad con etapa y valor esperado.',
    ctaLabel: 'Ver oportunidades',
    href: '/oportunidades',
  },
  {
    step: 5,
    title: 'Cotización creada',
    whatHappened: 'Se emite la cotización con líneas.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Cotización con líneas.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 6,
    title: 'PDF generado',
    whatHappened: 'El PDF de cotización está disponible.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Documento PDF generado desde la cotización.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 7,
    title: 'Envío registrado',
    whatHappened: 'Se registra el envío manual (fuera de ISALWA).',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Evidencia de envío manual.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 8,
    title: 'Seguimiento programado',
    whatHappened: 'Queda un seguimiento de cotización.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Trabajo de seguimiento vinculado al cliente.',
    ctaLabel: 'Ver trabajo',
    href: '/trabajo',
  },
  {
    step: 9,
    title: 'Cliente acepta',
    whatHappened: 'El cliente acepta y se convierte a pedido.',
    whoNormallyActs: 'Asesor / persona autorizada a convertir',
    whatIsalwaRecorded: 'Cotización aceptada → Pedido.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 10,
    title: 'Pedido creado',
    whatHappened: 'Existe el pedido.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Pedido abierto con líneas.',
    ctaLabel: 'Ver pedidos',
    href: '/pedidos',
  },
  {
    step: 11,
    title: 'Preparación operativa',
    whatHappened: 'Se solicita revisión operativa del pedido.',
    whoNormallyActs: 'Asesor / coordinación',
    whatIsalwaRecorded: 'Trabajo de preparación operativa (producción).',
    ctaLabel: 'Ver pedidos',
    href: '/pedidos',
  },
  {
    step: 12,
    title: 'Producción / Almacén / Compras review',
    whatHappened: 'Producción revisa el pedido.',
    whoNormallyActs: 'Producción',
    whatIsalwaRecorded: 'Revisión de producción solicitada.',
    ctaLabel: 'Ver producción',
    href: '/produccion',
  },
  {
    step: 13,
    title: 'Producto terminado',
    whatHappened: 'Entra producto terminado a almacén.',
    whoNormallyActs: 'Almacén',
    whatIsalwaRecorded: 'Recepción de productos terminados (FG).',
    ctaLabel: 'Ver almacén',
    href: '/almacen',
  },
  {
    step: 14,
    title: 'Nota de entrega',
    whatHappened: 'Se emite la nota de entrega con PDF.',
    whoNormallyActs: 'Persona autorizada para entregas',
    whatIsalwaRecorded: 'Nota de entrega + PDF disponible.',
    ctaLabel: 'Ver entregas',
    href: '/entregas',
  },
  {
    step: 15,
    title: 'Salida',
    whatHappened: 'Se registra la salida de almacén.',
    whoNormallyActs: 'Almacén',
    whatIsalwaRecorded: 'Salida vinculada al pedido.',
    ctaLabel: 'Ver almacén',
    href: '/almacen',
  },
  {
    step: 16,
    title: 'Entrega',
    whatHappened: 'Se registra la entrega al cliente.',
    whoNormallyActs: 'Persona autorizada para entregas',
    whatIsalwaRecorded: 'Entrega registrada con receptor.',
    ctaLabel: 'Ver entregas',
    href: '/entregas',
  },
  {
    step: 17,
    title: 'Documentos',
    whatHappened: 'Los documentos del cliente quedan visibles.',
    whoNormallyActs: 'Asesor / Gerencia',
    whatIsalwaRecorded: 'PDFs en Documentos del cliente.',
    ctaLabel: 'Ver clientes',
    href: '/clientes',
  },
  {
    step: 18,
    title: 'Cliente360 historial',
    whatHappened: 'El historial del cliente muestra el recorrido completo.',
    whoNormallyActs: 'Asesor / Gerencia',
    whatIsalwaRecorded: 'Historial del cliente en Cliente360.',
    ctaLabel: 'Ver clientes',
    href: '/clientes',
  },
  {
    step: 19,
    title: 'Auditoría',
    whatHappened: 'La memoria de cambios refleja los hechos.',
    whoNormallyActs: 'Gerencia',
    whatIsalwaRecorded: 'Cambios recientes en Inicio.',
    ctaLabel: 'Ver Inicio',
    href: '/inicio',
  },
  {
    step: 20,
    title: 'Gerencia / métricas',
    whatHappened: 'La vista de gerencia resume la actividad.',
    whoNormallyActs: 'Gerencia',
    whatIsalwaRecorded: 'Métricas de gerencia.',
    ctaLabel: 'Ver gerencia',
    href: '/inicio?lente=gerencia',
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
