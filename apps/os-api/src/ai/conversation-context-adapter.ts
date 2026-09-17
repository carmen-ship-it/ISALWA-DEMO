/**
 * Conversation / client / pedido context adapter for Ask ISALWA.
 *
 * Shapes authorized evidence into the certainty answer format required by CT3 §60:
 * LO CONFIRMADO · PENDIENTE DE CONFIRMAR · NO REGISTRADO · RECOMENDACIÓN ·
 * A QUIÉN PREGUNTAR · FUENTES (with deep links).
 *
 * Deterministic classification only — never AI probability labels.
 * Facts from another organization are refused (cross-tenant negative).
 * Does not approve, convert, create orders, send WhatsApp, move stock,
 * confirm payment, register delivery, or change access.
 */

export const AI_CERTAINTY_SECTION_LABELS = {
  loConfirmado: 'LO CONFIRMADO',
  pendienteDeConfirmar: 'PENDIENTE DE CONFIRMAR',
  noRegistrado: 'NO REGISTRADO',
  recomendacion: 'RECOMENDACIÓN',
  aQuienPreguntar: 'A QUIÉN PREGUNTAR',
  fuentes: 'FUENTES',
} as const;

export type AiCertaintyBucket = 'confirmado' | 'pendiente' | 'no_registrado';

export type AiDeepLinkSourceType =
  | 'issue'
  | 'journal_entry'
  | 'commitment'
  | 'party'
  | 'conversation'
  | 'order';

export type AiDeepLinkSource = {
  type: AiDeepLinkSourceType;
  id: string;
  label: string;
  href: string;
};

export type AuthorizedContextFact = {
  text: string;
  /** Owning tenant — must match actor organizationId or the fact is dropped. */
  organizationId: string;
  bucket: AiCertaintyBucket;
  source?: AiDeepLinkSource;
};

export type ConversationContextResponsible = {
  name: string;
  team?: string | null;
};

export type AiCertaintyAnswer = {
  loConfirmado: string[];
  pendienteDeConfirmar: string[];
  noRegistrado: string[];
  recomendacion: string;
  aQuienPreguntar: string;
  fuentes: AiDeepLinkSource[];
};

export type ShapeConversationContextInput = {
  actorOrganizationId: string;
  subjectType: 'issue' | 'party' | 'commitment' | string;
  subjectId: string;
  /** Pre-classified authorized facts only. */
  facts: readonly AuthorizedContextFact[];
  recommendation?: string | null;
  responsible?: ConversationContextResponsible | null;
  /** When the user asks about a conversation/pedido and nothing is registered. */
  missingHints?: readonly string[];
};

const NO_RESPONSIBLE =
  'Aún no hay una persona responsable asignada';

const DEFAULT_RECOMMENDATION =
  'Revise la evidencia enlazada y confirme con la persona responsable antes de actuar. La IA no aprueba ni envía.';

export function buildPartyDeepLink(partyId: string): AiDeepLinkSource {
  const id = partyId.trim();
  return {
    type: 'party',
    id,
    label: 'Cliente',
    href: `/clientes/${encodeURIComponent(id)}`,
  };
}

export function buildIssueDeepLink(issueId: string): AiDeepLinkSource {
  const id = issueId.trim();
  return {
    type: 'issue',
    id,
    label: 'Incidencia',
    href: `/incidencias/${encodeURIComponent(id)}`,
  };
}

export function buildCommitmentDeepLink(commitmentId: string, partyId?: string | null): AiDeepLinkSource {
  const id = commitmentId.trim();
  const party = partyId?.trim();
  return {
    type: 'commitment',
    id,
    label: 'Compromiso',
    href: party
      ? `/clientes/${encodeURIComponent(party)}#compromisos`
      : `/clientes`,
  };
}

export function buildConversationDeepLink(conversationId: string, partyId?: string | null): AiDeepLinkSource {
  const id = conversationId.trim();
  const party = partyId?.trim();
  return {
    type: 'conversation',
    id,
    label: 'Conversación',
    href: party
      ? `/clientes/${encodeURIComponent(party)}`
      : `/mensajes`,
  };
}

export function buildOrderDeepLink(orderId: string, partyId: string): AiDeepLinkSource {
  const id = orderId.trim();
  const party = partyId.trim();
  return {
    type: 'order',
    id,
    label: 'Pedido',
    href: `/clientes/${encodeURIComponent(party)}/pedidos/${encodeURIComponent(id)}`,
  };
}

/**
 * Classify assist packet fact lines without inventing confirmation.
 * Open / note-like lines stay pendiente; resolved outcomes may be confirmado;
 * empty / missing lines become no_registrado.
 */
export function classifyAssistFactLine(line: string): AiCertaintyBucket | 'skip' {
  const text = line.trim();
  if (!text) return 'skip';
  if (text.startsWith('Pregunta del usuario')) return 'skip';
  if (text.startsWith('Resumen limitado a')) return 'skip';

  const lower = text.toLowerCase();
  if (
    lower.includes('sin incidencias autorizadas') ||
    lower.includes('sin registros autorizados') ||
    lower.includes('sin evidencia')
  ) {
    return 'no_registrado';
  }

  const issueMatch = text.match(/^Incidencia\s*\(([^)]+)\)/i);
  if (issueMatch?.[1]) {
    const status = issueMatch[1].toLowerCase();
    if (status.includes('resolved') || status.includes('closed') || status.includes('done')) {
      return 'confirmado';
    }
    return 'pendiente';
  }

  const commitmentMatch = text.match(/^Compromiso\s*\(([^)]+)\)/i);
  if (commitmentMatch?.[1]) {
    const lifecycle = commitmentMatch[1].toLowerCase();
    if (
      lifecycle.includes('completed') ||
      lifecycle.includes('closed') ||
      lifecycle.includes('done') ||
      lifecycle.includes('fulfilled')
    ) {
      return 'confirmado';
    }
    return 'pendiente';
  }

  if (text.startsWith('Diario ')) {
    return 'pendiente';
  }

  // Default: authorized but not company-confirmed.
  return 'pendiente';
}

export function factsFromAssistPacket(input: {
  organizationId: string;
  facts: readonly string[];
  evidenceRefs: ReadonlyArray<{ type: string; id: string }>;
  partyId?: string | null;
}): AuthorizedContextFact[] {
  const org = input.organizationId.trim();
  const refs = input.evidenceRefs;
  const out: AuthorizedContextFact[] = [];

  for (let i = 0; i < input.facts.length; i += 1) {
    const text = input.facts[i]?.trim() ?? '';
    const bucket = classifyAssistFactLine(text);
    if (bucket === 'skip') continue;

    const ref = refs[i];
    const source = ref ? deepLinkForEvidenceRef(ref.type, ref.id, input.partyId) : undefined;
    out.push({
      text,
      organizationId: org,
      bucket,
      ...(source ? { source } : {}),
    });
  }

  return out;
}

export function deepLinkForEvidenceRef(
  type: string,
  id: string,
  partyId?: string | null,
): AiDeepLinkSource | undefined {
  const trimmed = id.trim();
  if (!trimmed) return undefined;
  switch (type) {
    case 'issue':
      return buildIssueDeepLink(trimmed);
    case 'commitment':
      return buildCommitmentDeepLink(trimmed, partyId);
    case 'journal_entry':
      return {
        type: 'journal_entry',
        id: trimmed,
        label: 'Bitácora',
        href: partyId
          ? `/clientes/${encodeURIComponent(partyId.trim())}`
          : `/incidencias`,
      };
    case 'party':
      return buildPartyDeepLink(trimmed);
    case 'conversation':
      return buildConversationDeepLink(trimmed, partyId);
    case 'order':
      return partyId ? buildOrderDeepLink(trimmed, partyId) : undefined;
    default:
      return undefined;
  }
}

export function shapeConversationContextAnswer(
  input: ShapeConversationContextInput,
): AiCertaintyAnswer {
  const actorOrg = input.actorOrganizationId.trim();
  const loConfirmado: string[] = [];
  const pendienteDeConfirmar: string[] = [];
  const noRegistrado: string[] = [];
  const fuentes: AiDeepLinkSource[] = [];
  const seenHref = new Set<string>();

  for (const fact of input.facts) {
    if (!fact.organizationId.trim() || fact.organizationId.trim() !== actorOrg) {
      // Cross-tenant: drop silently — never leak into answer buckets.
      continue;
    }
    const text = fact.text.trim();
    if (!text) continue;

    if (fact.bucket === 'confirmado') loConfirmado.push(text);
    else if (fact.bucket === 'pendiente') pendienteDeConfirmar.push(text);
    else noRegistrado.push(text);

    if (fact.source?.href && !seenHref.has(fact.source.href)) {
      seenHref.add(fact.source.href);
      fuentes.push(fact.source);
    }
  }

  for (const hint of input.missingHints ?? []) {
    const text = hint.trim();
    if (text) noRegistrado.push(text);
  }

  // Subject deep link when no evidence refs yet.
  if (fuentes.length === 0) {
    if (input.subjectType === 'party' && input.subjectId.trim()) {
      fuentes.push(buildPartyDeepLink(input.subjectId));
    } else if (input.subjectType === 'issue' && input.subjectId.trim()) {
      fuentes.push(buildIssueDeepLink(input.subjectId));
    }
  }

  if (
    loConfirmado.length === 0 &&
    pendienteDeConfirmar.length === 0 &&
    noRegistrado.length === 0
  ) {
    noRegistrado.push(
      'No hay hechos autorizados registrados para este contexto en el alcance visible.',
    );
  }

  const recommendation = input.recommendation?.trim() || DEFAULT_RECOMMENDATION;
  const aQuienPreguntar = formatResponsible(input.responsible);

  return {
    loConfirmado,
    pendienteDeConfirmar,
    noRegistrado,
    recomendacion: recommendation,
    aQuienPreguntar,
    fuentes,
  };
}

function formatResponsible(responsible: ConversationContextResponsible | null | undefined): string {
  const name = responsible?.name?.trim();
  if (!name) return NO_RESPONSIBLE;
  const team = responsible?.team?.trim();
  return team ? `${name} · ${team}` : name;
}

/** True when the structured answer does not claim mutation capability. */
export function certaintyAnswerIsNonMutating(answer: AiCertaintyAnswer): boolean {
  const blob = [
    answer.recomendacion,
    ...answer.loConfirmado,
    ...answer.pendienteDeConfirmar,
    ...answer.noRegistrado,
  ]
    .join(' ')
    .toLowerCase();

  const forbidden = [
    'apruebo',
    'aprobado automáticamente',
    'enviando whatsapp',
    'pedido creado',
    'pago confirmado por ia',
    'stock movido',
    'entrega registrada por ia',
    'acceso concedido',
  ];
  return forbidden.every((needle) => !blob.includes(needle));
}
