/**
 * Project CT3-E owner-demo conversation JSON into Conversation models.
 * SYNTH-only fixtures; never claim live WhatsApp.
 * Related commercial/ops IDs come from seeded-ids (PF-1 catalog) when provided.
 */

import conversationsFixture from '@/lib/demo/conversations.json';
import {
  deriveAttention,
  type Conversation,
  type ConversationMessage,
  type ConversationResponsibleHint,
} from './model';

type FixtureRow = {
  clientKey: string;
  displayName: string;
  pastedEvidence: string;
  customerQuestion?: string;
  expectedQuantity?: number;
  relatedQuoteNumber?: string;
  missingFacts?: string[];
  issueQuantity?: number;
};

/** Seeded client row shape from apps/os-web/lib/demo/seeded-ids.json (PF-1). */
export type OwnerDemoSeededClient = {
  key: string;
  partyId: string;
  opportunityId?: string | null;
  quoteId?: string | null;
  quoteNumber?: string | null;
  orderId?: string | null;
  followUpWorkId?: string | null;
};

const FIXTURE_ORG = (conversationsFixture as { organizationId: string }).organizationId;
const ROWS = (conversationsFixture as { conversations: FixtureRow[] }).conversations;

/** SYNTH org id for owner-demo conversation fixtures. */
export const OWNER_DEMO_CONVERSATION_ORG_ID = FIXTURE_ORG;

const DEMO_ASESOR: ConversationResponsibleHint = {
  memberId: 'demo-member-asesor',
  displayName: 'DEMO Asesor Comercial',
  teamLabel: 'Comercial',
};

const DEMO_COORD: ConversationResponsibleHint = {
  memberId: 'demo-member-coord',
  displayName: 'DEMO Coordinación',
  teamLabel: 'Operaciones',
};

function scenarioExtras(clientKey: string): {
  nextAction: string | null;
  responsible: ConversationResponsibleHint;
  forceFollowUp?: boolean;
  forceOpportunity?: boolean;
  forceIssue?: boolean;
  forceNeedsResponse?: boolean;
} {
  switch (clientKey) {
    case 'constructora_andina':
      return {
        nextAction: 'Validar disponibilidad y crear oportunidad (confirmación humana)',
        responsible: DEMO_ASESOR,
        forceOpportunity: true,
        forceNeedsResponse: true,
      };
    case 'proyectos_del_sur':
      return {
        nextAction: 'Revisar aceptación de Q-DEMO-001 antes de convertir a pedido',
        responsible: DEMO_ASESOR,
        forceNeedsResponse: true,
      };
    case 'hotel_central':
      return {
        nextAction: 'Confirmar salida / fecha de entrega con operaciones',
        responsible: DEMO_COORD,
        forceNeedsResponse: true,
      };
    case 'ferreteria_norte':
      return {
        nextAction: 'Registrar incidencia de piezas quebradas (confirmación humana)',
        responsible: DEMO_COORD,
        forceIssue: true,
        forceNeedsResponse: true,
      };
    case 'maderas_oriente':
    default:
      return {
        nextAction: 'Responder seguimiento del estado del pedido',
        responsible: DEMO_ASESOR,
        forceFollowUp: true,
        forceNeedsResponse: true,
      };
  }
}

function resolveSeedMap(
  partyIdByClientKey?:
    | ReadonlyMap<string, string>
    | Record<string, string>
    | ReadonlyArray<OwnerDemoSeededClient>
    | null,
): Map<string, OwnerDemoSeededClient> {
  const out = new Map<string, OwnerDemoSeededClient>();
  if (!partyIdByClientKey) return out;
  if (Array.isArray(partyIdByClientKey)) {
    for (const row of partyIdByClientKey) {
      if (row?.key && row.partyId) out.set(row.key, row);
    }
    return out;
  }
  if (partyIdByClientKey instanceof Map) {
    for (const [key, partyId] of partyIdByClientKey) {
      out.set(key, { key, partyId });
    }
    return out;
  }
  for (const [key, partyId] of Object.entries(partyIdByClientKey)) {
    out.set(key, { key, partyId });
  }
  return out;
}

export function ownerDemoConversationFixtures(
  organizationId: string,
  partyIdByClientKey?:
    | ReadonlyMap<string, string>
    | Record<string, string>
    | ReadonlyArray<OwnerDemoSeededClient>
    | null,
): Conversation[] {
  if (organizationId.trim() !== FIXTURE_ORG) {
    return [];
  }

  const seedMap = resolveSeedMap(partyIdByClientKey);

  return ROWS.map((row) => {
    const id = `demo-conv-${row.clientKey}`;
    const occurredAt = '2026-09-16T15:00:00.000Z';
    const seed = seedMap.get(row.clientKey);
    const partyId = seed?.partyId?.trim() || `demo-party-${row.clientKey}`;
    const body = row.pastedEvidence.trim();
    const extras = scenarioExtras(row.clientKey);
    const message: ConversationMessage = {
      id: `${id}:inbound`,
      conversationId: id,
      organizationId: FIXTURE_ORG,
      direction: 'inbound',
      channel: 'WHATSAPP',
      body,
      occurredAt,
      actorLabel: row.displayName,
      actorMemberId: null,
      externalMessageId: null,
      provenance: 'demo_fixture',
      isDemo: true,
    };

    const quoteNumber =
      seed?.quoteNumber?.trim() ||
      row.relatedQuoteNumber?.trim() ||
      null;
    const quoteId = seed?.quoteId?.trim() || null;
    const opportunityId = seed?.opportunityId?.trim() || null;
    const orderId = seed?.orderId?.trim() || null;
    const workItemId = seed?.followUpWorkId?.trim() || null;

    const attention = deriveAttention({
      messages: [message],
      opportunityId,
      customerQuestion: row.customerQuestion ?? null,
      commitmentCandidate: null,
      nextAction: extras.nextAction,
      summary: body,
    });

    if (extras.forceOpportunity) attention.possibleOpportunity = true;
    if (extras.forceIssue) attention.possibleIssue = true;
    if (extras.forceNeedsResponse) attention.needsResponse = true;
    if (extras.forceFollowUp) attention.followUp = true;

    // Demo opportunity signal is suggestion-only until human creates it.
    if (row.clientKey === 'constructora_andina') {
      attention.possibleOpportunity = true;
    }

    const conversation: Conversation = {
      id,
      organizationId: FIXTURE_ORG,
      partyId,
      partyLabel: row.displayName,
      contactLabel: null,
      channel: 'WHATSAPP',
      preview: body.slice(0, 120),
      lastOccurredAt: occurredAt,
      messages: [message],
      related: {
        opportunityId: row.clientKey === 'constructora_andina' ? null : opportunityId,
        quoteId,
        quoteNumber,
        orderId,
        issueId: null,
        workItemId,
      },
      attention,
      provenance: 'demo_fixture',
      isDemo: true,
      externalConversationId: null,
      enteredByLabel: null,
      nextAction: extras.nextAction,
      customerQuestion: row.customerQuestion ?? null,
      commitmentCandidate: null,
      responsible: extras.responsible,
    };
    return conversation;
  });
}
