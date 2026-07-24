import { Injectable, NotFoundException } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';

function money(centavos: bigint | number | null | undefined) {
  const n = Number(centavos ?? 0);
  return {
    centavos: n,
    label: `Bs ${Math.trunc(n / 100).toLocaleString('es-BO')},${Math.abs(n % 100)
      .toString()
      .padStart(2, '0')}`,
  };
}

@Injectable()
export class AccountsService {
  async list(params: { q?: string; segment?: string; persona?: string; take?: number }) {
    const prisma = getPrisma();
    if (!prisma) return { items: [] };
    const take = params.take ?? 50;
    const items = await prisma.account.findMany({
      where: {
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
    };
  }

  async dossier(id: string) {
    const prisma = getPrisma();
    if (!prisma) throw new NotFoundException();
    const a = await prisma.account.findUnique({
      where: { id },
      include: {
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
      },
    });
    if (!a) throw new NotFoundException('Cuenta no encontrada');

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

  async timeline(id: string) {
    const prisma = getPrisma();
    if (!prisma) return { items: [] };
    const items = await prisma.activityEvent.findMany({
      where: { accountId: id },
      orderBy: { occurredAt: 'desc' },
      take: 40,
    });
    return {
      items: items.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        body: e.body,
        occurredAt: e.occurredAt,
        payload: e.payloadJson,
      })),
    };
  }
}
