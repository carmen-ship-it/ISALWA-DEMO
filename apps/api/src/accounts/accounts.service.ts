import { Injectable, NotFoundException } from '@nestjs/common';
import {
  holdsExactScope,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

/** Matches TENANT_SURFACE_REQUIRED_SCOPE for account reads. Not a caller-supplied tenant. */
export const ACCOUNT_READ_SCOPE = 'commercial.team.read';

export type AccountDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type AccountListParams = {
  q?: string;
  segment?: string;
  persona?: string;
  take?: number;
};

export type AccountDenied = {
  items: [];
  code: AccountDenialCode;
  count: 0;
};

type AccountListRow = {
  id: string;
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

type AccountDossierRow = Omit<AccountListRow, 'locations'> & {
  nit: string | null;
  accountType: string;
  locations: Array<{ id: string; label: string; lat: unknown; lng: unknown; isPrimary: boolean }>;
  creditLimitCentavos: bigint | number | null;
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
    totalCentavos: bigint | number | null;
    createdAt: Date;
  }>;
  orders: Array<{
    id: string;
    number: string;
    status: string;
    totalCentavos: bigint | number | null;
    orderedAt: Date;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    status: string;
    totalCentavos: bigint | number | null;
    balanceCentavos: bigint;
    dueAt: Date | null;
  }>;
  visits: Array<{
    id: string;
    status: string;
    plannedAt: Date | null;
    completedAt: Date | null;
    result: string | null;
    notes: string | null;
  }>;
  conversations: Array<{
    id: string;
    slaStatus: string;
    lastMessageAt: Date | null;
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
    unitPriceCentavos: bigint | number | null;
    observedAt: Date;
    source: string;
    product: { name: string; sku: string };
  }>;
};

type AccountFindManyArgs = {
  where: {
    organizationId: string;
    AND: unknown[];
  };
  orderBy: Array<{ segment: 'asc' } | { relationshipScore: 'desc' }>;
  take: number;
  include: {
    owner: true;
    territory: true;
    locations: { where: { isPrimary: true }; take: 1 };
  };
};

type AccountMatchArgs = {
  where: { id: string; organizationId: string };
  select: { id: true };
};

type AccountDossierArgs = {
  where: { id: string; organizationId: string };
  include: Record<string, unknown>;
};

export type AccountsReadDb = {
  account: {
    findMany: (args: AccountFindManyArgs) => Promise<AccountListRow[]>;
    findFirst: (
      args: AccountMatchArgs | AccountDossierArgs,
    ) => Promise<{ id: string } | AccountDossierRow | null>;
  };
};

const DOSSIER_INCLUDE = {
  owner: true,
  territory: true,
  contacts: true,
  locations: true,
  creditTerms: true,
  quotes: { orderBy: { createdAt: 'desc' }, take: 8, include: { items: true } },
  orders: { orderBy: { orderedAt: 'desc' }, take: 8 },
  invoices: { orderBy: { issuedAt: 'desc' }, take: 8 },
  visits: { orderBy: { plannedAt: 'desc' }, take: 10 },
  conversations: {
    orderBy: { lastMessageAt: 'desc' },
    take: 3,
    include: { messages: { orderBy: { sentAt: 'asc' }, take: 12 }, channel: true },
  },
  priceObservations: { orderBy: { observedAt: 'desc' }, take: 12, include: { product: true } },
} as const;

function money(centavos: bigint | number | null | undefined) {
  const n = Number(centavos ?? 0);
  return {
    centavos: n,
    label: `Bs ${Math.trunc(n / 100).toLocaleString('es-BO')},${Math.abs(n % 100)
      .toString()
      .padStart(2, '0')}`,
  };
}

function denied(code: AccountDenialCode): AccountDenied {
  return { items: [], code, count: 0 };
}

function gate(session: TrustedTenantSession | null | undefined) {
  const organizationId = trustedOrganizationId(session);
  if (!session || !organizationId) return { ok: false as const, code: 'AUTH_REQUIRED' as const };
  if (!holdsExactScope(session.grantedScopes, ACCOUNT_READ_SCOPE)) {
    return { ok: false as const, code: 'ROLE_FORBIDDEN' as const };
  }
  return { ok: true as const, organizationId, session };
}

type TimelineReadItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  occurredAt: string;
  payload: unknown;
  canonicalType: string | null;
  family: string;
};

type TimelineReader = (
  db: AccountsReadDb,
  accountId: string,
  opts: {
    take?: number;
    session: { organizationId: string; grantedScopes: readonly string[] };
  },
) => Promise<{
  items: TimelineReadItem[];
  code: AccountDenialCode | null;
  count: number;
}>;

async function defaultDb(): Promise<AccountsReadDb | null> {
  const database = await import('@isalwa/database');
  return database.getPrisma() as AccountsReadDb | null;
}

async function defaultTimelineReader(): Promise<TimelineReader> {
  const database = await import('@isalwa/database');
  return database.listAccountTimeline as TimelineReader;
}

async function resolveDb(db: AccountsReadDb | null | undefined): Promise<AccountsReadDb | null> {
  if (db !== undefined) return db;
  return defaultDb();
}

@Injectable()
export class AccountsService {
  async list(
    session: TrustedTenantSession | null | undefined,
    params: AccountListParams = {},
    db?: AccountsReadDb | null,
  ) {
    const access = gate(session);
    if (!access.ok) return denied(access.code);

    const prisma = await resolveDb(db);
    if (!prisma) return { items: [], code: null, count: 0 };

    const take = params.take ?? 50;
    const items = await prisma.account.findMany({
      where: {
        organizationId: access.organizationId,
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
        locations: { where: { isPrimary: true }, take: 1 },
      },
    });
    const mapped = items.map((a) => ({
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
    }));
    return { items: mapped, code: null, count: mapped.length };
  }

  async dossier(
    session: TrustedTenantSession | null | undefined,
    id: string,
    db?: AccountsReadDb | null,
  ) {
    const access = gate(session);
    if (!access.ok) return denied(access.code);

    const prisma = await resolveDb(db);
    if (!prisma) throw new NotFoundException();

    const matched = await prisma.account.findFirst({
      where: { id, organizationId: access.organizationId },
      select: { id: true },
    });
    if (!matched) throw new NotFoundException('Cuenta no encontrada');

    const loaded = await prisma.account.findFirst({
      where: { id: matched.id, organizationId: access.organizationId },
      include: DOSSIER_INCLUDE,
    });
    if (!loaded || !('legalName' in loaded)) throw new NotFoundException('Cuenta no encontrada');
    const a = loaded;

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
        id: l.id,
        label: l.label,
        lat: Number(l.lat),
        lng: Number(l.lng),
        isPrimary: l.isPrimary,
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
    };
  }

  async timeline(
    session: TrustedTenantSession | null | undefined,
    id: string,
    db?: AccountsReadDb | null,
    readTimeline?: TimelineReader,
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
    const access = gate(session);
    if (!access.ok) return denied(access.code);

    const prisma = await resolveDb(db);
    if (!prisma) return { items: [], code: null, count: 0 };

    const read = readTimeline ?? (await defaultTimelineReader());
    const { items, code, count } = await read(prisma, id, {
      take: 40,
      session: {
        organizationId: access.organizationId,
        grantedScopes: access.session.grantedScopes,
      },
    });
    return {
      items: items.map((e) => ({
        id: e.id,
        type: e.canonicalType ?? e.type,
        title: e.title,
        body: e.body,
        occurredAt: e.occurredAt,
        payload: e.payload,
        canonicalType: e.canonicalType,
        family: e.family,
      })),
      code,
      count,
    };
  }
}
