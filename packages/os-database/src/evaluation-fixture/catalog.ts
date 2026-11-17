/**
 * Evaluation fixture catalog — pure definitions (no I/O).
 *
 * Four EVALUACIÓN customers, one per commercial context the evaluators walk through:
 * Showroom, Más de 10 unidades, Calidad Segunda, Viajes/Trópico. Everything is synthetic and
 * labelled EVALUACIÓN. No product catalog rows and no real prices are invented: each quote line
 * is a free-text example line with a symbolic price that is explicitly "not a catalog price".
 */
import {
  EVALUACION_PREFIX,
  EVALUATION_CONVERSATION_PHRASE,
  assertConversationPhrase,
  assertEvaluationLabel,
} from './guards';

export const EVALUATION_CUSTOMER_KEYS = [
  'showroom',
  'mas_de_10_unidades',
  'calidad_segunda',
  'viajes_tropico',
] as const;
export type EvaluationCustomerKey = (typeof EVALUATION_CUSTOMER_KEYS)[number];

/** Quote states the fixture walks the T04 path to. */
export const EVALUATION_QUOTE_STATES = ['draft', 'pending_approval', 'issued', 'accepted_order'] as const;
export type EvaluationQuoteState = (typeof EVALUATION_QUOTE_STATES)[number];

export type EvaluationConversationChannel = 'call' | 'visit' | 'in_person' | 'whatsapp';

export type EvaluationCustomerSpec = {
  key: EvaluationCustomerKey;
  /** Natural key: found by displayName on re-run. */
  displayName: string;
  contactGivenName: string;
  contactFamilyName: string;
  contactTitle: string;
  /** Bolivian national number (country BO). */
  phone: string;
  city: string;
  department: string;
  addressReference: string;
  location: { label: string; addressText: string; latitude: number; longitude: number };
  /** Plain-language context carried in notes/story, never in a catalog or price. */
  story: string;
  opportunity: { title: string; stage: string };
  quote: {
    targetState: EvaluationQuoteState;
    notes: string;
    line: { description: string; quantity: number; unitLabel: string; unitPriceCentavos: number };
  };
  conversation: {
    channel: EvaluationConversationChannel;
    reason: string;
    summary: string;
    pastedEvidence: string;
    customerQuestion: string;
  };
};

/** Symbolic example price (BOB 1.00 per unit). Explicitly not a catalog or list price. */
export const EVALUATION_SYMBOLIC_UNIT_PRICE_CENTAVOS = 100 as const;
const LINE_NOTE = 'precio simbólico de ejemplo, no es precio de catálogo';

export const EVALUATION_COORDS_SANTA_CRUZ = { latitude: -17.7833, longitude: -63.1821 } as const;

export const EVALUATION_CUSTOMERS: readonly EvaluationCustomerSpec[] = [
  {
    key: 'showroom',
    displayName: `${EVALUACION_PREFIX}Showroom Cliente Visita`,
    contactGivenName: 'Elena',
    contactFamilyName: 'Rocha (EVALUACIÓN)',
    contactTitle: 'Compras',
    phone: '70000011',
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    addressReference: 'EVALUACIÓN — cliente de ejemplo que conoció los productos en el showroom',
    location: {
      label: 'EVALUACIÓN Depósito Showroom',
      addressText: 'EVALUACIÓN — Av. Cristo Redentor, Santa Cruz (dirección de ejemplo)',
      latitude: -17.7833,
      longitude: -63.1821,
    },
    story:
      'Showroom: la clienta visitó el showroom, vio muestras y pidió una cotización que ya se aceptó y pasó a pedido.',
    opportunity: { title: `${EVALUACION_PREFIX}Oportunidad Showroom`, stage: 'propuesta' },
    quote: {
      targetState: 'accepted_order',
      notes: `${EVALUACION_PREFIX}Showroom — cotización aprobada, emitida, aceptada por el cliente y convertida en pedido (${LINE_NOTE}).`,
      line: {
        description: `${EVALUACION_PREFIX}Línea de ejemplo Showroom (sin producto de catálogo)`,
        quantity: 4,
        unitLabel: 'pza',
        unitPriceCentavos: EVALUATION_SYMBOLIC_UNIT_PRICE_CENTAVOS,
      },
    },
    conversation: {
      channel: 'visit',
      reason: 'Visita al showroom para ver muestras',
      summary: `Visita al showroom y pedido de cotización. ${EVALUATION_CONVERSATION_PHRASE}.`,
      pastedEvidence: `${EVALUATION_CONVERSATION_PHRASE}. Texto de ejemplo: «Vimos las muestras en el showroom, ¿nos pueden cotizar?»`,
      customerQuestion: '¿Pueden cotizarnos lo que vimos en el showroom?',
    },
  },
  {
    key: 'mas_de_10_unidades',
    displayName: `${EVALUACION_PREFIX}Constructora Más de 10 Unidades`,
    contactGivenName: 'Marco',
    contactFamilyName: 'Andrade (EVALUACIÓN)',
    contactTitle: 'Obra',
    phone: '70000012',
    city: 'Warnes',
    department: 'Santa Cruz',
    addressReference: 'EVALUACIÓN — obra de ejemplo con compra de más de 10 unidades',
    location: {
      label: 'EVALUACIÓN Obra Warnes',
      addressText: 'EVALUACIÓN — Carretera Norte, Warnes (dirección de ejemplo)',
      latitude: -17.5061,
      longitude: -63.1658,
    },
    story:
      'Más de 10 unidades: pedido grande de una obra; la cotización ya está emitida y espera la respuesta del cliente.',
    opportunity: { title: `${EVALUACION_PREFIX}Oportunidad Más de 10 unidades`, stage: 'propuesta' },
    quote: {
      targetState: 'issued',
      notes: `${EVALUACION_PREFIX}Más de 10 unidades — cotización aprobada por Jefatura y emitida (${LINE_NOTE}).`,
      line: {
        description: `${EVALUACION_PREFIX}Línea de ejemplo, más de 10 unidades (sin producto de catálogo)`,
        quantity: 12,
        unitLabel: 'pza',
        unitPriceCentavos: EVALUATION_SYMBOLIC_UNIT_PRICE_CENTAVOS,
      },
    },
    conversation: {
      channel: 'call',
      reason: 'Llamada de la obra para cotizar más de 10 unidades',
      summary: `Llamada por una compra de más de 10 unidades. ${EVALUATION_CONVERSATION_PHRASE}.`,
      pastedEvidence: `${EVALUATION_CONVERSATION_PHRASE}. Texto de ejemplo: «Necesitamos más de 10 unidades para una obra, ¿qué condiciones tienen?»`,
      customerQuestion: '¿Qué condiciones aplican a más de 10 unidades?',
    },
  },
  {
    key: 'calidad_segunda',
    displayName: `${EVALUACION_PREFIX}Ferretería Calidad Segunda`,
    contactGivenName: 'Nora',
    contactFamilyName: 'Quiroga (EVALUACIÓN)',
    contactTitle: 'Dueña',
    phone: '70000013',
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    addressReference: 'EVALUACIÓN — cliente de ejemplo interesado en calidad segunda',
    location: {
      label: 'EVALUACIÓN Local Norte',
      addressText: 'EVALUACIÓN — Av. Banzer, Santa Cruz (dirección de ejemplo)',
      latitude: -17.742,
      longitude: -63.158,
    },
    story:
      'Calidad Segunda: la clienta pregunta por piezas de calidad segunda; la cotización espera la aprobación de Jefatura.',
    opportunity: { title: `${EVALUACION_PREFIX}Oportunidad Calidad Segunda`, stage: 'propuesta' },
    quote: {
      targetState: 'pending_approval',
      notes: `${EVALUACION_PREFIX}Calidad Segunda — cotización en borrador con aprobación pendiente de Jefatura (${LINE_NOTE}).`,
      line: {
        description: `${EVALUACION_PREFIX}Línea de ejemplo, calidad segunda (sin producto de catálogo)`,
        quantity: 6,
        unitLabel: 'pza',
        unitPriceCentavos: EVALUATION_SYMBOLIC_UNIT_PRICE_CENTAVOS,
      },
    },
    conversation: {
      channel: 'in_person',
      reason: 'Atención presencial por piezas de calidad segunda',
      summary: `Consulta presencial sobre calidad segunda. ${EVALUATION_CONVERSATION_PHRASE}.`,
      pastedEvidence: `${EVALUATION_CONVERSATION_PHRASE}. Texto de ejemplo: «¿Tienen piezas de calidad segunda y cómo se identifican?»`,
      customerQuestion: '¿Cómo se identifican las piezas de calidad segunda?',
    },
  },
  {
    key: 'viajes_tropico',
    displayName: `${EVALUACION_PREFIX}Hotel Viajes Trópico`,
    contactGivenName: 'Luis',
    contactFamilyName: 'Paredes (EVALUACIÓN)',
    contactTitle: 'Mantenimiento',
    phone: '70000014',
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    addressReference: 'EVALUACIÓN — cliente de ejemplo con entregas de viaje hacia el Trópico',
    location: {
      label: 'EVALUACIÓN Hotel Centro',
      addressText: 'EVALUACIÓN — Calle Bolívar, Santa Cruz (dirección de ejemplo)',
      latitude: -17.7892,
      longitude: -63.1817,
    },
    story:
      'Viajes/Trópico: el cliente recibiría el pedido en una entrega con viaje al Trópico; la cotización sigue en borrador.',
    opportunity: { title: `${EVALUACION_PREFIX}Oportunidad Viajes Trópico`, stage: 'propuesta' },
    quote: {
      targetState: 'draft',
      notes: `${EVALUACION_PREFIX}Viajes/Trópico — cotización en borrador, entrega con viaje al Trópico por coordinar (${LINE_NOTE}).`,
      line: {
        description: `${EVALUACION_PREFIX}Línea de ejemplo, entrega al Trópico (sin producto de catálogo)`,
        quantity: 3,
        unitLabel: 'pza',
        unitPriceCentavos: EVALUATION_SYMBOLIC_UNIT_PRICE_CENTAVOS,
      },
    },
    conversation: {
      channel: 'whatsapp',
      reason: 'Consulta por entrega con viaje al Trópico',
      summary: `Consulta sobre entrega con viaje al Trópico. ${EVALUATION_CONVERSATION_PHRASE}.`,
      pastedEvidence: `${EVALUATION_CONVERSATION_PHRASE}. Texto de ejemplo: «¿Pueden entregar en el Trópico y cuándo sale el viaje?»`,
      customerQuestion: '¿Cuándo sale el próximo viaje al Trópico?',
    },
  },
] as const;

/** Customer that receives the coverage grant (the covering advisor works on its account). */
export const EVALUATION_COVERAGE_CUSTOMER_KEY: EvaluationCustomerKey = 'mas_de_10_unidades';
/** Customer whose order carries the reported payment. */
export const EVALUATION_PAYMENT_CUSTOMER_KEY: EvaluationCustomerKey = 'showroom';

export type EvaluationCommitmentSpec = {
  key: string;
  customerKey: EvaluationCustomerKey;
  text: string;
  dueInDays: number;
};

/** Follow-ups created through CreateEmployeeCommitment (natural key: the exact text). */
export const EVALUATION_COMMITMENTS: readonly EvaluationCommitmentSpec[] = [
  {
    key: 'follow-up-showroom-order',
    customerKey: 'showroom',
    text: `${EVALUACION_PREFIX}Confirmar con Elena la entrega del pedido del showroom`,
    dueInDays: 3,
  },
  {
    key: 'follow-up-mas-de-10-quote',
    customerKey: 'mas_de_10_unidades',
    text: `${EVALUACION_PREFIX}Llamar a Marco para saber si aceptan la cotización de más de 10 unidades`,
    dueInDays: 2,
  },
];

export const EVALUATION_PAYMENT_REPORT = {
  idempotencyKey: 'evaluation-fixture:payment-report:showroom',
  totalCentavos: '100',
  paidOn: '2026-11-16',
  method: 'transfer' as const,
  reference: 'EVALUACION-PAGO-0001',
  note: `${EVALUACION_PREFIX}Pago reportado de ejemplo — pendiente de verificación (no confirmado).`,
} as const;

export function evaluationConversationNaturalKey(key: EvaluationCustomerKey): string {
  return `evaluation-conversation:${key}`;
}

export function evaluationCatalogMeta(): {
  customerCount: number;
  quoteStates: readonly EvaluationQuoteState[];
  commitmentCount: number;
  conversationCount: number;
} {
  return {
    customerCount: EVALUATION_CUSTOMERS.length,
    quoteStates: EVALUATION_CUSTOMERS.map((c) => c.quote.targetState),
    commitmentCount: EVALUATION_COMMITMENTS.length,
    conversationCount: EVALUATION_CUSTOMERS.length,
  };
}

/** Self-check used by tests and the runner before any write. */
export function assertEvaluationCatalogValid(): void {
  for (const customer of EVALUATION_CUSTOMERS) {
    assertEvaluationLabel(customer.displayName);
    assertEvaluationLabel(customer.opportunity.title);
    assertEvaluationLabel(customer.quote.line.description);
    assertConversationPhrase(customer.conversation.summary);
    assertConversationPhrase(customer.conversation.pastedEvidence);
  }
  for (const commitment of EVALUATION_COMMITMENTS) assertEvaluationLabel(commitment.text);
}
