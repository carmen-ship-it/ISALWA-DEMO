/**
 * CT3-E owner-demo fixture catalog — pure definitions (no I/O).
 * Seed script materializes these into SYNTH; Story Mode links to resulting IDs.
 */

import {
  OWNER_DEMO_NOTES_TAG,
  OWNER_DEMO_PREFIX,
  OWNER_DEMO_QUOTE_NUMBER_PROYECTOS,
  OWNER_DEMO_SYNTH_ORG,
} from './guards';

export const OWNER_DEMO_CLIENT_KEYS = [
  'maderas_oriente',
  'constructora_andina',
  'proyectos_del_sur',
  'hotel_central',
  'ferreteria_norte',
] as const;

export type OwnerDemoClientKey = (typeof OWNER_DEMO_CLIENT_KEYS)[number];

export type OwnerDemoClientSpec = {
  key: OwnerDemoClientKey;
  displayName: string;
  legalName: string;
  contact: { givenName: string; familyName: string; phone: string; title: string };
  location: {
    label: string;
    addressText: string;
    latitude: number;
    longitude: number;
  };
  story: string;
};

export const OWNER_DEMO_CLIENTS: readonly OwnerDemoClientSpec[] = [
  {
    key: 'maderas_oriente',
    displayName: `${OWNER_DEMO_PREFIX}MADERAS ORIENTE`,
    legalName: `${OWNER_DEMO_PREFIX}MADERAS ORIENTE S.R.L.`,
    contact: {
      givenName: 'Elena',
      familyName: 'Rocha',
      phone: '+59170011001',
      title: 'Compras',
    },
    location: {
      label: 'Depósito Oriente',
      addressText: 'Av. Cristo Redentor, Santa Cruz',
      latitude: -17.7833,
      longitude: -63.1821,
    },
    story: 'full_healthy_loop',
  },
  {
    key: 'constructora_andina',
    displayName: `${OWNER_DEMO_PREFIX}CONSTRUCTORA ANDINA`,
    legalName: `${OWNER_DEMO_PREFIX}CONSTRUCTORA ANDINA S.R.L.`,
    contact: {
      givenName: 'Marco',
      familyName: 'Andrade',
      phone: '+59170011002',
      title: 'Obra',
    },
    location: {
      label: 'Obra Warnes',
      addressText: 'Carretera Norte, Warnes',
      latitude: -17.5061,
      longitude: -63.1658,
    },
    story: 'sales_conversation_need_quote',
  },
  {
    key: 'proyectos_del_sur',
    displayName: `${OWNER_DEMO_PREFIX}PROYECTOS DEL SUR`,
    legalName: `${OWNER_DEMO_PREFIX}PROYECTOS DEL SUR S.R.L.`,
    contact: {
      givenName: 'Sofía',
      familyName: 'Mendoza',
      phone: '+59170011003',
      title: 'Administración',
    },
    location: {
      label: 'Oficina Sur',
      addressText: 'Doble vía La Guardia',
      latitude: -17.8892,
      longitude: -63.3214,
    },
    story: 'quote_acceptance',
  },
  {
    key: 'hotel_central',
    displayName: `${OWNER_DEMO_PREFIX}HOTEL CENTRAL`,
    legalName: `${OWNER_DEMO_PREFIX}HOTEL CENTRAL S.A.`,
    contact: {
      givenName: 'Luis',
      familyName: 'Paredes',
      phone: '+59170011004',
      title: 'Mantenimiento',
    },
    location: {
      label: 'Hotel Centro',
      addressText: 'Calle Bolívar, Santa Cruz',
      latitude: -17.7892,
      longitude: -63.1817,
    },
    story: 'delivery_question_missing_salida',
  },
  {
    key: 'ferreteria_norte',
    displayName: `${OWNER_DEMO_PREFIX}FERRETERÍA NORTE`,
    legalName: `${OWNER_DEMO_PREFIX}FERRETERÍA NORTE`,
    contact: {
      givenName: 'Nora',
      familyName: 'Quiroga',
      phone: '+59170011005',
      title: 'Dueña',
    },
    location: {
      label: 'Local Norte',
      addressText: 'Av. Banzer, Santa Cruz',
      latitude: -17.742,
      longitude: -63.158,
    },
    story: 'issue_broken_pieces',
  },
] as const;

export type OwnerDemoConversationSpec = {
  clientKey: OwnerDemoClientKey;
  summary: string;
  pastedEvidence: string;
  customerQuestion: string;
};

export const OWNER_DEMO_CONVERSATIONS: readonly OwnerDemoConversationSpec[] = [
  {
    clientKey: 'maderas_oriente',
    summary: 'Pedido completo ya recorrido — conversación de apertura del loop sano.',
    pastedEvidence:
      'Buenos días. Confirmamos el pedido de sanitarios para el depósito Oriente. Gracias.',
    customerQuestion: '¿Pueden confirmarnos el estado del pedido?',
  },
  {
    clientKey: 'constructora_andina',
    summary: 'Nueva obra — pide cotización 20 unidades y entrega próxima semana.',
    pastedEvidence:
      'Hola, necesito cotizar 20 unidades para una obra nueva.\n¿Tienen entrega para la próxima semana?',
    customerQuestion: '¿Tienen entrega para la próxima semana?',
  },
  {
    clientKey: 'proyectos_del_sur',
    summary: `Aceptación explícita de ${OWNER_DEMO_QUOTE_NUMBER_PROYECTOS}.`,
    pastedEvidence: `Perfecto, aceptamos la cotización ${OWNER_DEMO_QUOTE_NUMBER_PROYECTOS}.`,
    customerQuestion: `¿Pueden convertir ${OWNER_DEMO_QUOTE_NUMBER_PROYECTOS} a pedido?`,
  },
  {
    clientKey: 'hotel_central',
    summary: 'Pregunta de entrega — pedido en FG sin Salida/Entrega.',
    pastedEvidence: '¿Cuándo llega nuestro pedido?',
    customerQuestion: '¿Cuándo llega nuestro pedido?',
  },
  {
    clientKey: 'ferreteria_norte',
    summary: 'Incidencia — 3 piezas quebradas.',
    pastedEvidence: 'Nos llegaron 3 piezas quebradas.',
    customerQuestion: '¿Cómo registramos las 3 piezas quebradas?',
  },
] as const;

export const OWNER_DEMO_SUGGESTED_REPLY_ANDINA =
  'Con gusto podemos preparar la cotización. Antes de confirmarle la entrega para la próxima semana, voy a validar disponibilidad y plazo interno.';

export type OwnerDemoStoryStepDef = {
  step: number;
  title: string;
  whatHappened: string;
  whoNormallyActs: string;
  whatIsalwaRecorded: string;
  /** Registry field used to build the CTA href after seed. */
  recordKey:
    | 'conversation'
    | 'context'
    | 'opportunitySuggested'
    | 'opportunity'
    | 'quote'
    | 'quotePdf'
    | 'manualSend'
    | 'followUp'
    | 'acceptance'
    | 'order'
    | 'orderPrep'
    | 'productionReview'
    | 'finishedGoods'
    | 'deliveryNote'
    | 'salida'
    | 'entrega'
    | 'documents'
    | 'cliente360'
    | 'audit'
    | 'management';
};

/** "Recorrido completo de ISALWA" — 20 steps (CT3 §71). */
export const OWNER_DEMO_STORY_STEPS: readonly OwnerDemoStoryStepDef[] = [
  {
    step: 1,
    title: 'Llega una conversación',
    whatHappened: 'El cliente escribe pidiendo estado del pedido.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Conversación registrada como evidencia (no envía WhatsApp).',
    recordKey: 'conversation',
  },
  {
    step: 2,
    title: 'ISALWA identifica contexto',
    whatHappened: 'Se vincula la conversación al cliente DEMO MADERAS ORIENTE.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Cliente, contacto y ubicación confirmada.',
    recordKey: 'context',
  },
  {
    step: 3,
    title: 'Oportunidad sugerida',
    whatHappened: 'El hilo comercial sugiere una oportunidad abierta.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Sugerencia determinística — no crea sola el registro.',
    recordKey: 'opportunitySuggested',
  },
  {
    step: 4,
    title: 'Oportunidad creada',
    whatHappened: 'Se abre la oportunidad del loop sano.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Oportunidad con etapa y valor esperado.',
    recordKey: 'opportunity',
  },
  {
    step: 5,
    title: 'Cotización creada',
    whatHappened: 'Se emite la cotización con líneas.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Cotización + líneas + notas con marca demo.',
    recordKey: 'quote',
  },
  {
    step: 6,
    title: 'PDF generado',
    whatHappened: 'El PDF de cotización está disponible para ver/descargar.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Documento PDF generado desde la cotización real.',
    recordKey: 'quotePdf',
  },
  {
    step: 7,
    title: 'Envío registrado',
    whatHappened: 'Se registra el envío manual (fuera de ISALWA).',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Evidencia de envío manual por WhatsApp u otro canal.',
    recordKey: 'manualSend',
  },
  {
    step: 8,
    title: 'Seguimiento programado',
    whatHappened: 'Queda un seguimiento de cotización.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Trabajo de seguimiento vinculado a la cotización.',
    recordKey: 'followUp',
  },
  {
    step: 9,
    title: 'Cliente acepta',
    whatHappened: 'El cliente acepta y se convierte a pedido.',
    whoNormallyActs: 'Asesor / persona autorizada a convertir',
    whatIsalwaRecorded: 'Cotización aceptada → Pedido.',
    recordKey: 'acceptance',
  },
  {
    step: 10,
    title: 'Pedido creado',
    whatHappened: 'Existe el Pedido del loop sano.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded: 'Pedido abierto con líneas copiadas de la cotización.',
    recordKey: 'order',
  },
  {
    step: 11,
    title: 'Preparación operativa',
    whatHappened: 'Se solicita revisión operativa del pedido.',
    whoNormallyActs: 'Asesor / coordinación',
    whatIsalwaRecorded: 'Trabajo de preparación operativa (producción).',
    recordKey: 'orderPrep',
  },
  {
    step: 12,
    title: 'Producción / Almacén / Compras review',
    whatHappened: 'Producción revisa el pedido.',
    whoNormallyActs: 'Producción',
    whatIsalwaRecorded: 'Revisión de producción solicitada o registrada.',
    recordKey: 'productionReview',
  },
  {
    step: 13,
    title: 'Producto terminado',
    whatHappened: 'Entra producto terminado a almacén.',
    whoNormallyActs: 'Almacén',
    whatIsalwaRecorded: 'Recepción de productos terminados (FG).',
    recordKey: 'finishedGoods',
  },
  {
    step: 14,
    title: 'Nota de entrega',
    whatHappened: 'Se emite la nota de entrega con PDF.',
    whoNormallyActs: 'Persona autorizada para entregas',
    whatIsalwaRecorded: 'Nota de entrega + PDF disponible.',
    recordKey: 'deliveryNote',
  },
  {
    step: 15,
    title: 'Salida',
    whatHappened: 'Se registra la salida de almacén.',
    whoNormallyActs: 'Almacén',
    whatIsalwaRecorded: 'Salida (warehouse exit) vinculada al pedido.',
    recordKey: 'salida',
  },
  {
    step: 16,
    title: 'Entrega',
    whatHappened: 'Se registra la entrega al cliente.',
    whoNormallyActs: 'Persona autorizada para entregas',
    whatIsalwaRecorded: 'Entrega registrada con receptor.',
    recordKey: 'entrega',
  },
  {
    step: 17,
    title: 'Documentos',
    whatHappened: 'Los documentos del cliente quedan visibles.',
    whoNormallyActs: 'Asesor / Gerencia',
    whatIsalwaRecorded: 'PDFs de cotización y nota de entrega en Documentos.',
    recordKey: 'documents',
  },
  {
    step: 18,
    title: 'Cliente360 historial',
    whatHappened: 'El historial del cliente muestra el loop completo.',
    whoNormallyActs: 'Asesor / Gerencia',
    whatIsalwaRecorded: 'Timeline / Cliente360 del demo.',
    recordKey: 'cliente360',
  },
  {
    step: 19,
    title: 'Auditoría',
    whatHappened: 'La memoria de cambios refleja los hechos.',
    whoNormallyActs: 'Gerencia',
    whatIsalwaRecorded: 'Eventos de negocio / cambios recientes.',
    recordKey: 'audit',
  },
  {
    step: 20,
    title: 'Gerencia / métricas',
    whatHappened: 'La vista de gerencia puede filtrar demo vs real.',
    whoNormallyActs: 'Gerencia',
    whatIsalwaRecorded: 'Métricas con filtro Datos reales / Demo.',
    recordKey: 'management',
  },
] as const;

/**
 * PF-1 commercial density contract — seed materializes these shapes in SYNTH.
 * Inicio / list desks derive counts from filtered records (never hardcoded totals).
 */
export const OWNER_DEMO_COMMERCIAL_DENSITY = {
  /** Open opportunities across stages after seed (primary + secondary). */
  minOpenOpportunities: 4,
  minWonOpportunities: 1,
  minLostOpportunities: 1,
  /** Quote statuses that must appear among DEMO parties. */
  requiredQuoteStates: ['draft', 'submitted', 'accepted'] as const,
  /** Pedido lifecycle stories covered by linked DEMO records. */
  pedidoLifecycleStories: [
    'delivered_full_loop', // maderas_oriente
    'fg_note_without_salida', // hotel_central
    'order_open_early', // ferreteria_norte
  ] as const,
  clients: {
    maderas_oriente: {
      opportunityTitle: 'DEMO MADERAS — loop sano',
      stage: 'propuesta',
      closeAs: 'won' as const,
      quote: { submit: true, manualSend: true, convert: true },
    },
    constructora_andina: {
      opportunityTitle: 'DEMO ANDINA — obra nueva',
      stage: 'calificacion',
      closeAs: null,
      secondaryOpportunityTitle: 'DEMO ANDINA — ampliación futura',
      secondaryStage: 'propuesta',
      quote: { submit: false, manualSend: false, convert: false },
    },
    proyectos_del_sur: {
      opportunityTitle: 'DEMO PROYECTOS — aceptación',
      stage: 'negociacion',
      closeAs: null,
      quote: { submit: true, manualSend: true, convert: false, quoteNumber: OWNER_DEMO_QUOTE_NUMBER_PROYECTOS },
    },
    hotel_central: {
      opportunityTitle: 'DEMO HOTEL — pedido sin salida',
      stage: 'propuesta',
      closeAs: null,
      lostOpportunityTitle: 'DEMO HOTEL — oportunidad perdida',
      quote: { submit: true, manualSend: true, convert: true },
    },
    ferreteria_norte: {
      opportunityTitle: 'DEMO FERRETERÍA — pedido con incidencia',
      stage: 'propuesta',
      closeAs: null,
      quote: { submit: true, manualSend: false, convert: true },
    },
  },
} as const;

export function ownerDemoCatalogMeta() {
  return {
    organizationId: OWNER_DEMO_SYNTH_ORG,
    prefix: OWNER_DEMO_PREFIX.trim(),
    notesTag: OWNER_DEMO_NOTES_TAG,
    clientCount: OWNER_DEMO_CLIENTS.length,
    storyStepCount: OWNER_DEMO_STORY_STEPS.length,
    quoteNumberProyectos: OWNER_DEMO_QUOTE_NUMBER_PROYECTOS,
    commercialDensity: {
      minOpenOpportunities: OWNER_DEMO_COMMERCIAL_DENSITY.minOpenOpportunities,
      minWonOpportunities: OWNER_DEMO_COMMERCIAL_DENSITY.minWonOpportunities,
      minLostOpportunities: OWNER_DEMO_COMMERCIAL_DENSITY.minLostOpportunities,
      requiredQuoteStates: [...OWNER_DEMO_COMMERCIAL_DENSITY.requiredQuoteStates],
      pedidoLifecycleStories: [...OWNER_DEMO_COMMERCIAL_DENSITY.pedidoLifecycleStories],
    },
  };
}

export function ownerDemoClientByKey(key: OwnerDemoClientKey): OwnerDemoClientSpec {
  const found = OWNER_DEMO_CLIENTS.find((c) => c.key === key);
  if (!found) throw new Error(`OWNER_DEMO_CLIENT_MISSING:${key}`);
  return found;
}
