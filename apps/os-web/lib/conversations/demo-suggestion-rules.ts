/**
 * Deterministic demo suggestion rules for owner-demo phrases.
 * Marked demo — do not pretend live AI inference when no provider is available.
 */

import type { ConversationSuggestion, SuggestionType } from './suggestion-types';

export type DemoSuggestionMatchInput = {
  messageText: string;
  /** Message timestamp for follow-up Monday calculation. ISO preferred. */
  messageAt?: string | Date | null;
  timeZone?: string;
  /** Optional explicit quote code already in context (e.g. thread related quote). */
  relatedQuoteCode?: string | null;
};

type Rule = {
  id: string;
  type: SuggestionType;
  test: (normalized: string) => boolean;
  build: (input: DemoSuggestionMatchInput, snippet: string) => ConversationSuggestion;
};

const ZONE = 'America/La_Paz';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetOf(text: string, max = 120): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Next Monday on/after the message civil day in America/La_Paz (or given zone). */
export function nextMondayIso(messageAt: string | Date | null | undefined, timeZone = ZONE): string | null {
  const date = toDate(messageAt) ?? new Date();
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const dow = map[weekday];
  if (dow == null) return null;
  const daysUntil = dow === 1 ? 0 : (8 - dow) % 7 || 7;
  const next = new Date(date.getTime() + daysUntil * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(next);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) return null;
  return `${y}-${m}-${d}`;
}

function quoteCodeFrom(text: string, related?: string | null): string | null {
  const fromRelated = related?.trim() || null;
  if (fromRelated) return fromRelated;
  const match = text.match(/\bQ-[A-Z0-9][\w-]*/i);
  return match ? match[0].toUpperCase() : null;
}

const RULES: readonly Rule[] = [
  {
    id: 'demo-opportunity-qty-20',
    type: 'possible_opportunity',
    test: (n) =>
      (n.includes('cotizar') || n.includes('necesito')) &&
      (/\b20\b/.test(n) || n.includes('20 unidades')) &&
      (n.includes('obra') || n.includes('unidades')),
    build: (_input, snippet) => ({
      id: 'demo-opportunity-qty-20',
      type: 'possible_opportunity',
      explanation: 'El cliente está consultando por una posible compra.',
      snippet,
      signal: 'clear',
      relatedLabel: null,
      detected: ['Cantidad: 20', 'Necesidad: obra nueva'],
      unknown: ['producto exacto si no es inequívoco', 'factibilidad de entrega'],
      primaryActionLabel: 'Crear oportunidad',
      isDemo: true,
    }),
  },
  {
    id: 'demo-acceptance-q-demo-001',
    type: 'possible_acceptance',
    test: (n) =>
      (n.includes('aceptamos') || n.includes('acepto') || n.includes('perfecto')) &&
      (n.includes('cotizacion') || n.includes('q-demo-001') || n.includes('q-')),
    build: (input, snippet) => {
      const code = quoteCodeFrom(snippet, input.relatedQuoteCode) ?? 'Q-DEMO-001';
      return {
        id: 'demo-acceptance-q-demo-001',
        type: 'possible_acceptance',
        explanation: 'El mensaje parece indicar que el cliente aceptó esta cotización.',
        snippet,
        signal: 'clear',
        relatedLabel: code,
        detected: [`Cotización: ${code}`],
        unknown: ['confirmación humana antes de convertir'],
        primaryActionLabel: 'Revisar cotización',
        isDemo: true,
      };
    },
  },
  {
    id: 'demo-issue-broken-pieces',
    type: 'possible_issue',
    test: (n) =>
      (n.includes('quebradas') || n.includes('rotas') || n.includes('danadas') || n.includes('dañadas')) &&
      (/\b3\b/.test(n) || n.includes('piezas')),
    build: (_input, snippet) => ({
      id: 'demo-issue-broken-pieces',
      type: 'possible_issue',
      explanation: 'El cliente reporta un posible daño en la entrega.',
      snippet,
      signal: 'clear',
      relatedLabel: null,
      detected: ['Cantidad mencionada: 3', 'Texto de incidencia presente'],
      unknown: ['pedido relacionado si no está explícito'],
      primaryActionLabel: 'Crear incidencia',
      isDemo: true,
    }),
  },
  {
    id: 'demo-followup-llamame-lunes',
    type: 'possible_follow_up',
    test: (n) => n.includes('llamame') && n.includes('lunes'),
    build: (input, snippet) => {
      const monday = nextMondayIso(input.messageAt, input.timeZone ?? ZONE);
      return {
        id: 'demo-followup-llamame-lunes',
        type: 'possible_follow_up',
        explanation: 'El cliente pide una llamada; hay que confirmar fecha y hora.',
        snippet,
        signal: 'clear',
        relatedLabel: monday ? `Propuesta: ${monday}` : null,
        detected: monday ? [`Fecha propuesta (lunes): ${monday}`] : ['Pedido de llamada el lunes'],
        unknown: ['hora exacta', 'persona que llama'],
        primaryActionLabel: 'Programar seguimiento',
        isDemo: true,
      };
    },
  },
  {
    id: 'demo-commitment-confirmo-manana',
    type: 'possible_commitment',
    test: (n) => n.includes('confirmo') && (n.includes('manana') || n.includes('mañana')),
    build: (_input, snippet) => ({
      id: 'demo-commitment-confirmo-manana',
      type: 'possible_commitment',
      explanation: 'El cliente anticipa una confirmación. No confirma un pago.',
      snippet,
      signal: 'possible',
      relatedLabel: null,
      detected: ['Texto: Confirmar mañana', 'Origen: Reportado por el cliente'],
      unknown: ['fecha/hora exacta', 'qué confirmará'],
      primaryActionLabel: 'Registrar compromiso',
      isDemo: true,
    }),
  },
  {
    id: 'demo-product-6mm',
    type: 'product_question',
    test: (n) =>
      (n.includes('tienen') || n.includes('manejan') || n.includes('producto')) &&
      (n.includes('6 mm') || n.includes('6mm')),
    build: (_input, snippet) => ({
      id: 'demo-product-6mm',
      type: 'product_question',
      explanation: 'El cliente pregunta por una presentación de producto.',
      snippet,
      signal: 'possible',
      relatedLabel: null,
      detected: ['Especificación mencionada: 6 mm'],
      unknown: ['disponibilidad actual', 'stock confirmado'],
      primaryActionLabel: 'Revisar',
      isDemo: true,
    }),
  },
  {
    id: 'demo-delivery-cuando-llega',
    type: 'delivery_question',
    test: (n) =>
      (n.includes('cuando') || n.includes('cuándo')) &&
      (n.includes('llega') || n.includes('entrega')) &&
      (n.includes('pedido') || n.includes('nuestro')),
    build: (_input, snippet) => ({
      id: 'demo-delivery-cuando-llega',
      type: 'delivery_question',
      explanation: 'El cliente pregunta por el estado de entrega del pedido.',
      snippet,
      signal: 'possible',
      relatedLabel: null,
      detected: ['Pregunta de llegada/entrega'],
      unknown: ['pedido explícito', 'evidencia de salida/entrega'],
      primaryActionLabel: 'Revisar',
      isDemo: true,
    }),
  },
];

/**
 * Match deterministic demo rules against message text.
 * Returns zero or more suggestions, all marked `isDemo: true`.
 */
export function matchDemoSuggestionRules(input: DemoSuggestionMatchInput): ConversationSuggestion[] {
  const text = input.messageText?.trim() ?? '';
  if (!text) return [];
  const normalized = normalize(text);
  const snippet = snippetOf(text);
  const out: ConversationSuggestion[] = [];
  for (const rule of RULES) {
    if (rule.test(normalized)) {
      out.push(rule.build(input, snippet));
    }
  }
  return out;
}

export function demoSuggestionRuleIds(): readonly string[] {
  return RULES.map((r) => r.id);
}
