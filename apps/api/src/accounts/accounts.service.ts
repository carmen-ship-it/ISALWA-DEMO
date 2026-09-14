import { Injectable } from '@nestjs/common';
import { getPrisma, listAccountTimeline } from '@isalwa/database';

function money(centavos: bigint | number | null | undefined) {
  const n = Number(centavos ?? 0);
  return {
    centavos: n,
    label: `Bs ${Math.trunc(n / 100).toLocaleString('es-BO')},${Math.abs(n % 100)
      .toString()
      .padStart(2, '0')}`,
  };
}

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.customer. Not a caller-supplied tenant. */
export const ACCOUNT_READ_SCOPE = 'commercial.team.read';

export type TrustedAccountSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type AccountDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type AccountListRow = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  segment: string;
  personaKey: string | null;
  creditStatus: string;
  relationshipScore: number;
  lastVisitAt: Date | null;
  lastPurchaseAt: Date | null;
  aiSummary: string | null;
  owner: { name: string };
  territory: { code: string };
  locations: Array<{ lat: unknown; lng: unknown }>;
};

type AccountDossierRow = AccountListRow & {
  nit: string | null;
  accountType: string;
  creditLimitCentavos: bigint;
  relationshipScoreComponents: unknown;
  aiSummaryEvidenceJson: unknown;
  favoriteProductsJson: unknown;
  predictedNextOrderStart: Date | null;
  predictedNextOrderEnd: Date | null;
  predictionConfidence: string | null;
  lastWhatsappAt: Date | null;
  contacts: unknown[];
  creditTerms: { netDays: number } | null;
  quotes: Array<{
    id: string;
    number: string;
    status: string;
    totalCentavos: bigint;
    createdAt: Date;
  }>;
  orders: Array<{
    id: string;
    number: string;
    status: string;
    totalCentavos: bigint;
    orderedAt: Date;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    status: string;
    totalCentavos: bigint;
    balanceCentavos: bigint;
    dueAt: Date;
  }>;
  visits: Array<{
    id: string;
    status: string;
    plannedAt: Date;
    completedAt: Date | null;
    result: string | null;
    notes: string | null;
  }>;
  conversations: Array<{
    id: string;
    lastMessageAt: Date;
    slaStatus: string | null;
    channel: { displayName: string; purpose: string };
    messages: Array<{
      id: string;
      direction: string;
      body: string;
      sentAt: Date;
      senderType: string;
    }>;
  }>;
  priceObservations: Array<{
    productId: string;
    unitPriceCentavos: bigint;
    observedAt: Date;
    source: string;
    product: { name: string; sku: string };
  }>;
};

export type AccountReadDb = {
  account: {
    findMany: (args: {
      where: { organizationId: string; AND?: unknown[] };
      orderBy: unknown;
      take: number;
      include: {
        owner: true;
        territory: true;
        locations: { where: { isPrimary: true; organizationId: string }; take: number };
      };
    }) => Promise<AccountListRow[]>;
    findFirst: (args: {
      where: { id: string; organizationId: string };
      include: Record<string, unknown>;
    }) => Promise<AccountDossierRow | null>;
  };
};

export type AccountListResult = {
  items: Array<{
    id: string;
    code: string;
    name: string;
    legalName: string;
    segment: string;
    personaKey: string | null;
    creditStatus: string;
    relationshipScore: number;
    ownerName: string;
    territoryCode: string;
    lastVisitAt: Date | null;
    lastPurchaseAt: Date | null;
    aiSummary: string | null;
    lat: number | null;
    lng: number | null;
  }>;
  code: AccountDenialCode | null;
  count: number;
};

function trustedOrganization(session: TrustedAccountSession | null | undefined): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function holdsAccountScope(session: TrustedAccountSession | null | undefined): boolean {
  return (session?.grantedScopes ?? []).some((scope) => scope.trim() === ACCOUNT_READ_SCOPE);
}

function accountDb(explicit: AccountReadDb | null | undefined): AccountReadDb | null {
  if (explicit !== undefined) return explicit;
  return getPrisma() as AccountReadDb | null;
}

function deniedList(code: AccountDenialCode): AccountListResult {
  return { items: [], code, count: 0 };
}

function deniedDossier(denial: AccountDenialCode | null) {
  return { denial, count: 0 };
}

@Injectable()
export class AccountsService {
  async list(params: {
    q?: string;
    segment?: string;
    persona?: string;
    take?: number;
    session?: TrustedAccountSession | null;
    db?: AccountReadDb | null;
  }): Promise<AccountListResult> {
    const organizationId = trustedOrganization(params.session);
    if (!organizationId) return deniedList('AUTH_REQUIRED');
    if (!holdsAccountScope(params.session)) return deniedList('ROLE_FORBIDDEN');
    const prisma = accountDb(params.db);
    if (!prisma) return { items: [], code: null, count: 0 };

    const take = params.take ?? 50;
    const items = await prisma.account.findMany({
      where: {
        organizationId,
        AND: [
          params.segment ? { segment: params.segment } : {},
          params.persona ? { personaKey: params.persona } : {},
          params.q
            ? {
                OR: [
                  { legalName: { contains: params.q, mode: 'insensitive' } },
                  { tradeName: { contains: params.q, mode: 'insensitive' } },
                  { code: { contains: params.q, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ segment: 'asc' }, { relationshipScore: 'desc' }],
      take,
      include: {
        owner: true,
        territory: true,
        locations: { where: { isPrimary: true, organizationId }, take: 1 },
      },
    });
    return {
      items: items.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.tradeName ?? a.legalName,
        legalName: a.legalName,
        segment: a.segment,
        personaKey: a.personaKey,
        creditStatus: a.creditStatus,
        relationshipScore: a.relationshipScore,
        ownerName: a.owner.name,
        territoryCode: a.territory.code,
        lastVisitAt: a.lastVisitAt,
        lastPurchaseAt: a.lastPurchaseAt,
        aiSummary: a.aiSummary,
        lat: a.locations[0] ? Number(a.locations[0].lat) : null,
        lng: a.locations[0] ? Number(a.locations[0].lng) : null,
      })),
      code: null,
      count: items.length,
    };
  }

  async dossier(
    id: string,
    session?: TrustedAccountSession | null,
    db?: AccountReadDb | null,
  ) {
    const organizationId = trustedOrganization(session);
    if (!organizationId) return deniedDossier('AUTH_REQUIRED');
    if (!holdsAccountScope(session)) return deniedDossier('ROLE_FORBIDDEN');
    const prisma = accountDb(db);
    if (!prisma) return deniedDossier(null);

    const a = await prisma.account.findFirst({
      where: { id, organizationId },
      include: {
        owner: true,
        territory: true,
        contacts: { where: { organizationId } },
        locations: { where: { organizationId } },
        creditTerms: true,
        quotes: {
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { items: true },
        },
        orders: { where: { organizationId }, orderBy: { orderedAt: 'desc' }, take: 8 },
        invoices: { where: { organizationId }, orderBy: { issuedAt: 'desc' }, take: 8 },
        visits: { where: { organizationId }, orderBy: { plannedAt: 'desc' }, take: 10 },
        conversations: {
          where: { organizationId },
          orderBy: { lastMessageAt: 'desc' },
          take: 3,
          include: {
            messages: { where: { organizationId }, orderBy: { sentAt: 'asc' }, take: 12 },
            channel: true,
          },
        },
        priceObservations: {
          where: { organizationId },
          orderBy: { observedAt: 'desc' },
          take: 12,
          include: { product: true },
        },
      },
    });
    if (!a) return deniedDossier(null);

    const openBalance = a.invoices.reduce((s, i) => s + i.balanceCentavos, 0n);

    return {
      id: a.id,
      code: a.code,
      name: a.tradeName ?? a.legalName,
      legalName: a.legalName,
      nit: a.nit,
      segment: a.segment,
      accountType: a.accountType,
      personaKey: a.personaKey,
      creditStatus: a.creditStatus,
      creditLimit: money(a.creditLimitCentavos),
      openBalance: money(openBalance),
      relationshipScore: a.relationshipScore,
      relationshipScoreComponents: a.relationshipScoreComponents,
      ownerName: a.owner.name,
      territoryCode: a.territory.code,
      aiSummary: a.aiSummary,
      aiSummaryEvidence: a.aiSummaryEvidenceJson,
      favoriteProducts: a.favoriteProductsJson,
      predictedNextOrder: {
        start: a.predictedNextOrderStart,
        end: a.predictedNextOrderEnd,
        confidence: a.predictionConfidence,
      },
      lastVisitAt: a.lastVisitAt,
      lastPurchaseAt: a.lastPurchaseAt,
      lastWhatsappAt: a.lastWhatsappAt,
      contacts: a.contacts,
      locations: a.locations.map((l) => ({
        id: (l as { id?: string }).id,
        label: (l as { label?: string }).label,
        lat: Number((l as { lat: unknown }).lat),
        lng: Number((l as { lng: unknown }).lng),
        isPrimary: (l as { isPrimary?: boolean }).isPrimary,
      })),
      netDays: a.creditTerms?.netDays ?? null,
      recentQuotes: a.quotes.map((q) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        total: money(q.totalCentavos),
        createdAt: q.createdAt,
      })),
      recentOrders: a.orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: money(o.totalCentavos),
        orderedAt: o.orderedAt,
      })),
      recentInvoices: a.invoices.map((i) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        total: money(i.totalCentavos),
        balance: money(i.balanceCentavos),
        dueAt: i.dueAt,
      })),
      recentVisits: a.visits.map((v) => ({
        id: v.id,
        status: v.status,
        plannedAt: v.plannedAt,
        completedAt: v.completedAt,
        result: v.result,
        notes: v.notes,
      })),
      conversations: a.conversations.map((c) => ({
        id: c.id,
        channel: c.channel.displayName,
        purpose: c.channel.purpose,
        slaStatus: c.slaStatus,
        lastMessageAt: c.lastMessageAt,
        messages: c.messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          body: m.body,
          sentAt: m.sentAt,
          senderType: m.senderType,
        })),
      })),
      priceMemory: a.priceObservations.map((p) => ({
        productId: p.productId,
        productName: p.product.name,
        sku: p.product.sku,
        unitPrice: money(p.unitPriceCentavos),
        observedAt: p.observedAt,
        source: p.source,
      })),
      denial: null as AccountDenialCode | null,
      count: 1,
    };
  }

  async timeline(
    id: string,
    session?: TrustedAccountSession | null,
    db?: Parameters<typeof listAccountTimeline>[0] | null,
  ): Promise<{
    items: Array<{
      id: string;
      type: string;
      title: string;
      body: string | null;
      occurredAt: string;
      payload: unknown;
      canonicalType: string | null;
      family: string;
    }>;
    code: AccountDenialCode | null;
    count: number;
  }> {
    const organizationId = trustedOrganization(session);
    if (!organizationId) return { items: [], code: 'AUTH_REQUIRED' as const, count: 0 };
    if (!holdsAccountScope(session)) return { items: [], code: 'ROLE_FORBIDDEN' as const, count: 0 };
    const prisma = db !== undefined ? db : getPrisma();
    if (!prisma) return { items: [], code: null, count: 0 };
    const result = await listAccountTimeline(prisma, id, { take: 40, session });
    return {
      items: result.items.map((e) => ({
        id: e.id,
        type: e.canonicalType ?? e.type,
        title: e.title,
        body: e.body,
        occurredAt: e.occurredAt,
        payload: e.payload,
        canonicalType: e.canonicalType,
        family: e.family,
      })),
      code: result.code,
      count: result.count,
    };
  }
}
