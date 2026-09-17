/**
 * Build Contexto ISALWA view model for a selected conversation.
 * Uses deterministic demo suggestion rules + certainty helpers — never auto-mutates.
 */

import {
  CERTAINTY_LABEL,
  type CertaintyState,
  whoToAskView,
  type CanonicalResponsible,
} from '@/lib/certainty';
import { quoteHref } from '@/lib/commercial/navigation';
import {
  demoRecommendedReplyFor,
  matchDemoSuggestionRules,
  type ConversationSuggestion,
} from './smart-context';
import type { Conversation } from './model';
import { conversationHref } from './model';

export type ContextFactRow = {
  certainty: CertaintyState;
  label: string;
  detail: string;
};

export type ContextLink = {
  label: string;
  href: string;
};

export type ConversationContextView = {
  cliente: {
    name: string;
    contact: string | null;
    responsible: ReturnType<typeof whoToAskView>;
    locationState: string;
    partyHref: string | null;
  };
  comercial: {
    opportunities: string;
    quotes: string;
    pedidos: string;
    links: ContextLink[];
  };
  operacion: {
    pedidoState: string;
    production: string;
    warehouse: string;
    delivery: string;
  };
  trabajo: {
    nextFollowUp: string;
    openIssues: string;
    commitments: string;
  };
  informacionAConfirmar: ContextFactRow[];
  recomendacion: string;
  whoToAsk: ReturnType<typeof whoToAskView>;
  suggestions: ConversationSuggestion[];
  recommendedReply: {
    body: string;
    badges: ('confirmed' | 'pending')[];
  } | null;
  acciones: ContextLink[];
  freshnessLabel: string | null;
};

function lastInboundText(conversation: Conversation): string {
  const inbound = [...conversation.messages]
    .reverse()
    .find((m) => m.direction === 'inbound');
  return (inbound?.body ?? conversation.preview ?? '').trim();
}

function relatedQuoteCode(conversation: Conversation): string | null {
  if (conversation.related.quoteNumber?.trim()) {
    return conversation.related.quoteNumber.trim().toUpperCase();
  }
  const fromRelated = conversation.related.quoteId?.includes('Q-DEMO')
    ? conversation.related.quoteId.replace(/^demo-quote-/, '')
    : null;
  const match = lastInboundText(conversation).match(/\bQ-[A-Z0-9][\w-]*/i);
  return fromRelated ?? (match ? match[0].toUpperCase() : null);
}

function isRealPartyId(partyId: string): boolean {
  return Boolean(partyId.trim()) && !partyId.startsWith('demo-party-');
}

function isRealRecordId(id: string | null | undefined): id is string {
  const value = id?.trim() ?? '';
  return Boolean(value) && !value.startsWith('demo-');
}

/** Demo/hotel delivery question: confirmed FG vs missing salida/entrega. */
function deliveryQuestionFacts(conversation: Conversation): ContextFactRow[] {
  const text = lastInboundText(conversation).toLowerCase();
  if (!text.includes('cuándo llega') && !text.includes('cuando llega')) return [];
  return [
    {
      certainty: 'confirmed',
      label: CERTAINTY_LABEL.confirmed,
      detail: 'Hay pedido y evidencia de producto terminado registrada en el ejemplo DEMO.',
    },
    {
      certainty: 'pending',
      label: CERTAINTY_LABEL.pending,
      detail: 'Salida / entrega / fecha confirmada de llegada no están registradas.',
    },
    {
      certainty: 'not_recorded',
      label: CERTAINTY_LABEL.not_recorded,
      detail: 'No hay fecha de entrega confirmada en ISALWA.',
    },
  ];
}

function scenarioCertaintyFacts(
  conversation: Conversation,
  suggestions: ConversationSuggestion[],
): ContextFactRow[] {
  const facts: ContextFactRow[] = [];
  if (suggestions.some((s) => s.type === 'possible_opportunity')) {
    facts.push({
      certainty: 'pending',
      label: CERTAINTY_LABEL.pending,
      detail: 'Consulta comercial detectada; la oportunidad aún no está creada en ISALWA.',
    });
    facts.push({
      certainty: 'not_recorded',
      label: CERTAINTY_LABEL.not_recorded,
      detail: 'Disponibilidad y plazo de entrega para la próxima semana no están confirmados.',
    });
  }
  if (suggestions.some((s) => s.type === 'possible_acceptance')) {
    facts.push({
      certainty: 'confirmed',
      label: CERTAINTY_LABEL.confirmed,
      detail: `Cotización ${relatedQuoteCode(conversation) ?? 'mencionada'} existe en el ejemplo DEMO.`,
    });
    facts.push({
      certainty: 'pending',
      label: CERTAINTY_LABEL.pending,
      detail: 'La conversión a pedido requiere confirmación humana (no automática).',
    });
  }
  if (suggestions.some((s) => s.type === 'possible_issue')) {
    facts.push({
      certainty: 'pending',
      label: CERTAINTY_LABEL.pending,
      detail: 'Reporte de piezas quebradas detectado; la incidencia aún no está registrada.',
    });
    facts.push({
      certainty: 'not_recorded',
      label: CERTAINTY_LABEL.not_recorded,
      detail: 'No hay incidencia canónica vinculada a este hilo todavía.',
    });
  }
  if (suggestions.some((s) => s.type === 'possible_follow_up')) {
    facts.push({
      certainty: 'confirmed',
      label: CERTAINTY_LABEL.confirmed,
      detail: conversation.related.orderId
        ? 'Hay pedido vinculado en el ejemplo DEMO para dar seguimiento.'
        : 'El cliente pide confirmación del estado del pedido.',
    });
    facts.push({
      certainty: 'pending',
      label: CERTAINTY_LABEL.pending,
      detail: 'Respuesta de seguimiento aún no registrada como enviada.',
    });
  }
  return facts;
}

export function buildConversationContextView(input: {
  conversation: Conversation;
  responsible?: CanonicalResponsible | null;
  canAssignResponsible?: boolean;
}): ConversationContextView {
  const { conversation } = input;
  const messageText = lastInboundText(conversation);
  const quoteCode = relatedQuoteCode(conversation);
  const suggestions = matchDemoSuggestionRules({
    messageText,
    messageAt: conversation.lastOccurredAt,
    relatedQuoteCode: quoteCode,
  });

  const responsible =
    input.responsible ??
    (conversation.responsible
      ? {
          memberId: conversation.responsible.memberId,
          displayName: conversation.responsible.displayName,
          teamLabel: conversation.responsible.teamLabel,
        }
      : null);
  const who = whoToAskView({
    responsible,
    canAssignResponsible: input.canAssignResponsible ?? false,
    canRequestUpdate: Boolean(responsible),
  });

  const deliveryFacts = deliveryQuestionFacts(conversation);
  const informacion: ContextFactRow[] = [
    ...deliveryFacts,
    ...scenarioCertaintyFacts(conversation, suggestions),
  ];

  if (conversation.nextAction) {
    informacion.push({
      certainty: 'pending',
      label: CERTAINTY_LABEL.pending,
      detail: `Próxima acción sugerida: ${conversation.nextAction}`,
    });
  } else {
    informacion.push({
      certainty: 'not_recorded',
      label: CERTAINTY_LABEL.not_recorded,
      detail: 'No hay una próxima acción registrada en esta conversación.',
    });
  }

  let recommendedReply: ConversationContextView['recommendedReply'] = null;
  if (deliveryFacts.length) {
    const draft = demoRecommendedReplyFor('delivery_unknown');
    recommendedReply = { body: draft.body, badges: draft.badges };
  } else if (suggestions.some((s) => s.type === 'possible_opportunity')) {
    recommendedReply = {
      body: 'Con gusto podemos preparar la cotización. Antes de confirmarle la entrega para la próxima semana, voy a validar disponibilidad y plazo interno.',
      badges: ['pending'],
    };
  } else if (suggestions.some((s) => s.type === 'possible_acceptance')) {
    recommendedReply = {
      body: 'Gracias por el mensaje. Voy a revisar la cotización indicada y le confirmo los siguientes pasos.',
      badges: ['pending'],
    };
  } else if (suggestions.some((s) => s.type === 'possible_issue')) {
    recommendedReply = {
      body: 'Lamento lo ocurrido. Voy a registrar la incidencia con lo que nos indica y le confirmo el seguimiento.',
      badges: ['pending'],
    };
  } else if (suggestions.some((s) => s.type === 'possible_follow_up')) {
    recommendedReply = {
      body: 'Recibido. Voy a revisar el estado del pedido en ISALWA y le confirmo lo que tengamos registrado.',
      badges: ['pending'],
    };
  }

  const partyHref = isRealPartyId(conversation.partyId)
    ? `/clientes/${encodeURIComponent(conversation.partyId)}`
    : null;

  const acciones: ContextLink[] = [];
  if (partyHref) {
    acciones.push({ label: 'Abrir Cliente360', href: partyHref });
  }
  if (isRealRecordId(conversation.related.quoteId) && partyHref) {
    acciones.push({
      label: quoteCode ? `Abrir cotización ${quoteCode}` : 'Abrir cotización',
      href: quoteHref(conversation.partyId, conversation.related.quoteId),
    });
  }
  if (isRealRecordId(conversation.related.orderId) && partyHref) {
    acciones.push({
      label: 'Abrir Pedido',
      href: `/clientes/${encodeURIComponent(conversation.partyId)}/pedidos/${encodeURIComponent(conversation.related.orderId)}`,
    });
  }
  if (isRealRecordId(conversation.related.opportunityId) && partyHref) {
    acciones.push({
      label: 'Abrir oportunidad',
      href: `/clientes/${encodeURIComponent(conversation.partyId)}/oportunidades/${encodeURIComponent(conversation.related.opportunityId)}`,
    });
  }
  if (suggestions.some((s) => s.type === 'possible_opportunity')) {
    acciones.push({
      label: 'Crear oportunidad (requiere confirmación)',
      href: partyHref ? `${partyHref}?tab=comercial` : '/oportunidades',
    });
  }
  if (suggestions.some((s) => s.type === 'possible_issue')) {
    acciones.push({
      label: 'Crear incidencia (requiere confirmación)',
      href: '/incidencias',
    });
  }
  acciones.push({
    label: 'Registrar seguimiento',
    href: partyHref ? `${partyHref}?tab=trabajo` : '/trabajo',
  });

  const recomendacion =
    conversation.nextAction ??
    suggestions[0]?.explanation ??
    'Revise el hilo y confirme la siguiente acción humana. ISALWA no crea registros solos.';

  const freshnessLabel = conversation.lastOccurredAt
    ? `Última actualización: ${formatFreshness(conversation.lastOccurredAt)}`
    : null;

  const comercialLinks: ContextLink[] = [];
  if (quoteCode && isRealRecordId(conversation.related.quoteId) && partyHref) {
    comercialLinks.push({
      label: `Revisar ${quoteCode}`,
      href: quoteHref(conversation.partyId, conversation.related.quoteId),
    });
  } else if (quoteCode) {
    comercialLinks.push({
      label: `Revisar ${quoteCode}`,
      href: partyHref ? `${partyHref}?tab=comercial` : '/cotizaciones',
    });
  }

  return {
    cliente: {
      name: conversation.partyLabel,
      contact: conversation.contactLabel,
      responsible: who,
      locationState: conversation.isDemo
        ? 'Ubicación de ejemplo DEMO (no mezclar con datos reales)'
        : 'Ver ficha del cliente para estado de ubicación',
      partyHref,
    },
    comercial: {
      opportunities: conversation.attention.possibleOpportunity
        ? 'Señal de oportunidad posible (sin crear aún)'
        : conversation.related.opportunityId
          ? 'Oportunidad vinculada'
          : 'Sin oportunidad vinculada en este hilo',
      quotes: quoteCode
        ? `Cotización mencionada: ${quoteCode}`
        : conversation.related.quoteId
          ? 'Cotización vinculada'
          : 'Sin cotización vinculada',
      pedidos: conversation.related.orderId
        ? 'Pedido vinculado'
        : deliveryFacts.length
          ? 'Pedido de ejemplo DEMO (verificar ficha)'
          : 'Sin pedido vinculado en este hilo',
      links: comercialLinks,
    },
    operacion: {
      pedidoState: deliveryFacts[0]?.detail
        ?? (conversation.related.orderId
          ? 'Pedido vinculado — verificar ficha operativa'
          : 'Sin estado operativo confirmado en este hilo'),
      production: deliveryFacts.length
        ? 'Evidencia de preparación / PT en demo (confirmar en Pedido)'
        : 'Sin evidencia de producción en este hilo',
      warehouse: deliveryFacts.length
        ? 'Ingreso de producto terminado en demo (confirmar en Almacén)'
        : 'Sin evidencia de almacén en este hilo',
      delivery: deliveryFacts.some((f) => f.certainty === 'pending' || f.certainty === 'not_recorded')
        ? 'Salida / entrega pendientes de registro'
        : 'Sin hechos de entrega en este hilo',
    },
    trabajo: {
      nextFollowUp: conversation.nextAction ?? 'Sin seguimiento programado',
      openIssues: conversation.attention.possibleIssue
        ? 'Posible incidencia detectada (sin crear aún)'
        : 'Sin incidencia vinculada',
      commitments: conversation.commitmentCandidate
        ? `Candidato: ${conversation.commitmentCandidate}`
        : 'Sin compromiso vinculado',
    },
    informacionAConfirmar: informacion,
    recomendacion,
    whoToAsk: who,
    suggestions,
    recommendedReply,
    acciones,
    freshnessLabel,
  };
}

function formatFreshness(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function conversationOriginLabel(kind: 'opportunity' | 'issue' | 'follow_up' | 'commitment'): string {
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

export function conversationOriginHref(conversationId: string): string {
  return conversationHref(conversationId);
}
