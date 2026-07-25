import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { computeRelationshipScore } from '@isalwa/domain';
import { buildActivityCreateManyInput } from '../timeline/emit';
import {
  BUSINESS_NAMES,
  FIRST_NAMES,
  HERO_ACCOUNTS,
  LAST_NAMES,
  ORG,
  PERMISSION_KEYS,
  PERSONAS,
  PRODUCT_CATALOG,
  TEAM,
  TERRITORIES,
  WA_CHANNELS,
  bobToCentavos,
  resolveSeedConfig,
  type Persona,
  type SeedConfig,
} from './fixtures';
import { addDays, createRng, daysAgo, stableId, type Rng } from './rng';

function weightedPersona(rng: Rng): Persona {
  const total = PERSONAS.reduce((s, p) => s + p.weight, 0);
  let r = rng.next() * total;
  for (const p of PERSONAS) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return PERSONAS[0]!;
}

function seasonalFactor(d: Date): number {
  const m = d.getUTCMonth(); // 0-11
  // Construction softer Dec/Jan; stronger Apr–Oct (assumption)
  if (m === 11 || m === 0) return 0.72;
  if (m === 1) return 0.85;
  if (m >= 3 && m <= 9) return 1.08;
  return 1.0;
}

export type SeedResult = {
  checksum: string;
  counts: Record<string, number>;
  profile: string;
  seedKey: string;
};

export async function seedUniverse(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SeedResult> {
  const config = resolveSeedConfig(env);
  const rng = createRng(config.seedKey);
  const counts: Record<string, number> = {};

  // Wipe in FK-safe order for re-seed
  await wipe(prisma);

  // ── Org & IAM ──────────────────────────────────────────
  await prisma.organization.create({
    data: {
      id: ORG.id,
      name: ORG.name,
      slug: ORG.slug,
      nit: ORG.nit,
    },
  });
  counts.organizations = 1;

  const permissions = PERMISSION_KEYS.map((key) => ({
    id: stableId('perm', key),
    key,
    description: key,
  }));
  await prisma.permission.createMany({ data: permissions });
  counts.permissions = permissions.length;

  const roleDefs = [
    { key: 'Propietaria', name: 'Propietaria', all: true },
    { key: 'GerenteComercial', name: 'Gerente Comercial', all: true },
    { key: 'SupervisorZona', name: 'Supervisor de Zona', keys: PERMISSION_KEYS.filter((k) => k !== 'admin.users') },
    { key: 'AsesorVentas', name: 'Asesor de Ventas', keys: ['accounts.read', 'accounts.write', 'quotes.read', 'quotes.write', 'quotes.send', 'visits.checkin', 'wa.inbox'] },
    { key: 'OperadorWhatsApp', name: 'Operador WhatsApp', keys: ['accounts.read', 'wa.inbox', 'quotes.read'] },
    { key: 'Cobranzas', name: 'Cobranzas', keys: ['accounts.read', 'collections.manage', 'wa.inbox', 'quotes.read'] },
    { key: 'Facturacion', name: 'Facturación', keys: ['accounts.read', 'quotes.read', 'collections.manage'] },
    { key: 'Almacen', name: 'Almacén', keys: ['accounts.read', 'quotes.read'] },
    { key: 'AdminSistema', name: 'Admin Sistema', all: true },
  ] as const;

  for (const r of roleDefs) {
    const roleId = stableId('role', r.key);
    await prisma.role.create({
      data: {
        id: roleId,
        organizationId: ORG.id,
        key: r.key,
        name: r.name,
        permissions: {
          create: ('all' in r && r.all
            ? PERMISSION_KEYS
            : 'keys' in r
              ? [...r.keys]
              : []
          ).map((k) => ({
            permissionId: stableId('perm', k),
          })),
        },
      },
    });
  }
  counts.roles = roleDefs.length;

  const territoryIds = new Map<string, string>();
  for (const t of TERRITORIES) {
    const id = stableId('ter', t.code);
    territoryIds.set(t.code, id);
    await prisma.territory.create({
      data: {
        id,
        organizationId: ORG.id,
        name: t.name,
        code: t.code,
      },
    });
  }
  counts.territories = TERRITORIES.length;

  const userIds = new Map<string, string>();
  const advisorKeys: string[] = [];
  for (const member of TEAM) {
    const id = stableId('user', member.key);
    userIds.set(member.key, id);
    await prisma.user.create({
      data: {
        id,
        organizationId: ORG.id,
        email: member.email,
        name: member.name,
        phone: member.phone,
        status: 'active',
        userRoles: {
          create: [{ roleId: stableId('role', member.role) }],
        },
      },
    });
    if (member.role === 'AsesorVentas') {
      advisorKeys.push(member.key);
      await prisma.salesRep.create({
        data: {
          id: stableId('rep', member.key),
          organizationId: ORG.id,
          userId: id,
          employeeCode: `ADV-${member.key.slice(-1)}`,
          hireDate: daysAgo(config.asOf, rng.int(400, 1800)),
          monthlyQuotaCentavos: bobToCentavos(rng.int(180000, 320000)),
        },
      });
      const terrCodes = 'territories' in member ? member.territories : [];
      for (const code of terrCodes ?? []) {
        await prisma.territoryMember.create({
          data: {
            territoryId: territoryIds.get(code)!,
            userId: id,
            roleInTerritory: 'advisor',
          },
        });
      }
    }
  }
  counts.users = TEAM.length;

  // ── Catalog ────────────────────────────────────────────
  const categoryIds = new Map<string, string>();
  const categories = [...new Set(PRODUCT_CATALOG.map((p) => p.category))];
  for (const [i, name] of categories.entries()) {
    const id = stableId('cat', name);
    categoryIds.set(name, id);
    await prisma.productCategory.create({
      data: { id, organizationId: ORG.id, name, sortOrder: i },
    });
  }
  const productBySku = new Map<string, { id: string; family: string; list: bigint }>();
  for (const p of PRODUCT_CATALOG) {
    const id = stableId('prod', p.sku);
    const list = bobToCentavos(p.listPriceBob);
    productBySku.set(p.sku, { id, family: p.family, list });
    await prisma.product.create({
      data: {
        id,
        organizationId: ORG.id,
        sku: p.sku,
        name: p.name,
        categoryId: categoryIds.get(p.category)!,
        listPriceCentavos: list,
        attributesJson: { family: p.family },
      },
    });
  }
  counts.products = PRODUCT_CATALOG.length;

  const priceListId = stableId('pl', 'default');
  await prisma.priceList.create({
    data: {
      id: priceListId,
      organizationId: ORG.id,
      name: 'Lista general 2024-2026',
      validFrom: daysAgo(config.asOf, 900),
      isDefault: true,
      items: {
        create: PRODUCT_CATALOG.map((p) => ({
          id: stableId('pli', p.sku),
          productId: productBySku.get(p.sku)!.id,
          unitPriceCentavos: bobToCentavos(p.listPriceBob),
        })),
      },
    },
  });

  // ── WhatsApp channels & SLA ────────────────────────────
  const slaId = stableId('sla', 'default');
  await prisma.slaPolicy.create({
    data: {
      id: slaId,
      organizationId: ORG.id,
      name: 'SLA horario laboral 5 min',
      firstResponseSeconds: 300,
      businessHoursJson: {
        tz: 'America/La_Paz',
        days: { mon: ['08:00', '18:00'], tue: ['08:00', '18:00'], wed: ['08:00', '18:00'], thu: ['08:00', '18:00'], fri: ['08:00', '18:00'], sat: ['08:00', '13:00'] },
      },
    },
  });
  const channelIds = new Map<string, string>();
  for (const ch of WA_CHANNELS) {
    const id = stableId('ch', ch.purpose);
    channelIds.set(ch.purpose, id);
    await prisma.messagingChannel.create({
      data: {
        id,
        organizationId: ORG.id,
        provider: 'mock',
        providerChannelId: `mock_${ch.purpose}`,
        displayName: ch.displayName,
        phoneE164: ch.phone,
        purpose: ch.purpose,
      },
    });
  }
  counts.messagingChannels = WA_CHANNELS.length;

  await prisma.organizationSettings.create({
    data: {
      organizationId: ORG.id,
      settingsJson: {
        currency: 'BOB',
        demo: true,
        seedKey: config.seedKey,
        profile: config.profile,
      },
    },
  });

  // ── Accounts + full commercial timelines ───────────────
  let quoteSeq = 1000;
  let orderSeq = 2000;
  let invoiceSeq = 3000;
  let paymentSeq = 4000;
  let visitSeq = 0;
  let msgSeq = 0;

  const activityBatch: Prisma.ActivityEventCreateManyInput[] = [];
  const priceObsBatch: Prisma.PriceObservationCreateManyInput[] = [];

  for (let i = 0; i < config.accountCount; i++) {
    const hero = i < HERO_ACCOUNTS.length ? HERO_ACCOUNTS[i] : null;
    const persona = hero
      ? (PERSONAS.find((p) => p.key === hero.personaKey) ?? weightedPersona(rng))
      : weightedPersona(rng);
    const terr = hero
      ? (TERRITORIES.find((t) => t.code === hero.territoryCode) ?? rng.pick(TERRITORIES))
      : rng.pick(TERRITORIES);
    const advisorKey = hero
      ? hero.advisorKey
      : advisorKeys.find((k) => {
          const member = TEAM.find((t) => t.key === k);
          const territories =
            member && 'territories' in member
              ? (member.territories as readonly string[])
              : undefined;
          return territories?.includes(terr.code) ?? false;
        }) ?? rng.pick(advisorKeys);
    const ownerId = userIds.get(advisorKey)!;

    const baseName = hero ? hero.tradeName : rng.pick(BUSINESS_NAMES);
    const legalName = hero ? hero.legalName : `${baseName} ${i + 1}`;
    const accountId = hero ? stableId('hero', hero.key) : stableId('acc', i);
    const code = hero ? hero.code : `C-${String(i + 1).padStart(4, '0')}`;
    const accountType = hero ? hero.accountType : rng.pick(persona.types);
    const city = terr.city;
    const lat = terr.lat + (rng.next() - 0.5) * 0.08;
    const lng = terr.lng + (rng.next() - 0.5) * 0.08;

    const historyMonths = Math.min(
      config.historyMonths,
      'maxHistoryMonths' in persona && persona.maxHistoryMonths
        ? persona.maxHistoryMonths
        : config.historyMonths,
    );
    // Heroes get full history depth for a richer dossier in the 8-minute demo.
    const createdAt = daysAgo(
      config.asOf,
      hero ? config.historyMonths * 30 + 5 : historyMonths * 30 + rng.int(0, 20),
    );

    const contactName = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    const phone = hero ? hero.phone : `+5917${String(1000000 + i).slice(0, 7)}`;

    // Build commerce timeline in memory first
    const timeline = buildAccountTimeline({
      rng,
      persona,
      config,
      createdAt,
      productBySku,
      accountId,
      ownerId,
      quoteSeqStart: quoteSeq,
      orderSeqStart: orderSeq,
      invoiceSeqStart: invoiceSeq,
    });
    quoteSeq = timeline.nextQuoteSeq;
    orderSeq = timeline.nextOrderSeq;
    invoiceSeq = timeline.nextInvoiceSeq;

    const lastPurchase = timeline.lastPurchaseAt;
    const openBalance = timeline.openBalance;
    const creditLimit = bobToCentavos(
      persona.segment === 'A' ? rng.int(80000, 250000) : persona.segment === 'B' ? rng.int(25000, 80000) : rng.int(5000, 25000),
    );
    const creditStatus =
      persona.key === 'debt_risk' || openBalance > creditLimit
        ? openBalance > creditLimit
          ? 'hold'
          : 'watch'
        : openBalance > 0 && rng.chance(0.1)
          ? 'watch'
          : 'ok';

    // Visits
    const visits = buildVisits({
      rng,
      persona,
      config,
      accountId,
      ownerId,
      createdAt,
      lat,
      lng,
      seqStart: visitSeq,
    });
    visitSeq += visits.length;
    const lastVisitAt = visits.filter((v) => v.completedAt).sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime()))[0]?.completedAt;

    // Relationship score from facts
    const daysSincePurchase = lastPurchase
      ? (config.asOf.getTime() - lastPurchase.getTime()) / 86400000
      : 999;
    const daysSinceVisit = lastVisitAt
      ? (config.asOf.getTime() - lastVisitAt.getTime()) / 86400000
      : 999;
    const score = computeRelationshipScore({
      recency: Math.max(0, 100 - daysSincePurchase * 1.2),
      frequency: Math.min(100, timeline.orderCount * 8),
      monetary: Math.min(100, Number(timeline.lifetimeCentavos / 10000n)),
      debtHealth: creditStatus === 'ok' ? 90 : creditStatus === 'watch' ? 55 : 25,
      responsiveness: persona.payDiscipline * 100,
    });

    const personaFamilies = persona.families as readonly string[];
    const favSkus = PRODUCT_CATALOG.filter((p) => personaFamilies.includes(p.family)).slice(0, 3);
    const quiet = 'quietMonths' in persona && persona.quietMonths ? persona.quietMonths : 0;
    const predStart = addDays(config.asOf, Math.max(3, Math.round((persona.orderEveryDays[0] + persona.orderEveryDays[1]) / 2) - quiet * 5));
    const predEnd = addDays(predStart, 14);

    const purchaseDaysLabel = Math.max(0, Math.round(daysSincePurchase));
    const visitDaysLabel = Math.max(0, Math.round(daysSinceVisit));
    const evidence = [
      lastPurchase
        ? purchaseDaysLabel === 0
          ? 'Última compra hoy'
          : `Última compra hace ${purchaseDaysLabel} días`
        : 'Sin compras registradas',
      `${timeline.orderCount} pedidos en el historial`,
      openBalance > 0n ? `Saldo abierto Bs ${(Number(openBalance) / 100).toFixed(0)}` : 'Sin deuda abierta',
      lastVisitAt
        ? visitDaysLabel === 0
          ? 'Última visita hoy'
          : `Última visita hace ${visitDaysLabel} días`
        : 'Sin visitas',
    ];
    if (hero?.story) evidence.unshift(hero.story);

    await prisma.account.create({
      data: {
        id: accountId,
        organizationId: ORG.id,
        code,
        legalName,
        tradeName: baseName,
        nit: `${328000000 + i}`,
        accountType,
        segment: persona.segment,
        status: 'active',
        creditLimitCentavos: creditLimit,
        creditStatus,
        relationshipScore: score.score,
        relationshipScoreComponents: score.components,
        ownerUserId: ownerId,
        territoryId: territoryIds.get(terr.code)!,
        personaKey: persona.key,
        favoriteProductsJson: favSkus.map((s) => s.sku),
        purchaseStatsJson: {
          orderCount: timeline.orderCount,
          lifetimeCentavos: timeline.lifetimeCentavos.toString(),
          avgTicketCentavos: timeline.orderCount
            ? (timeline.lifetimeCentavos / BigInt(timeline.orderCount)).toString()
            : '0',
        },
        predictedNextOrderStart: predStart,
        predictedNextOrderEnd: predEnd,
        predictionConfidence: daysSincePurchase < 60 ? 'alta' : daysSincePurchase < 120 ? 'media' : 'baja',
        aiSummary: `${legalName}: perfil ${persona.key.replaceAll('_', ' ')}. ${evidence.join('. ')}.`,
        aiSummaryAt: config.asOf,
        aiSummaryEvidenceJson: evidence,
        lastVisitAt: lastVisitAt ?? null,
        lastPurchaseAt: lastPurchase,
        lastWhatsappAt: null,
        tagsJson: [persona.key, accountType, terr.code],
        createdAt,
        contacts: {
          create: [
            {
              id: stableId('ctc', i, 0),
              organizationId: ORG.id,
              name: contactName,
              title: 'Compras',
              phone,
              isPrimary: true,
            },
          ],
        },
        addresses: {
          create: [
            {
              id: stableId('addr', i),
              label: 'Principal',
              line1: `Av. Ejemplo ${100 + i}`,
              city,
              isPrimary: true,
            },
          ],
        },
        locations: {
          create: [
            {
              id: stableId('loc', i),
              organizationId: ORG.id,
              label: 'Showroom / depósito',
              lat,
              lng,
              isPrimary: true,
              source: 'geocode',
            },
          ],
        },
        assignments: {
          create: [
            {
              id: stableId('asg', i),
              userId: ownerId,
              assignedAt: createdAt,
              reason: 'Territorio',
            },
          ],
        },
        creditTerms: {
          create: {
            id: stableId('cred', i),
            netDays: persona.segment === 'A' ? 30 : persona.segment === 'B' ? 21 : 7,
            notes: persona.key === 'negotiator' ? 'Negocia plazos con frecuencia' : null,
          },
        },
      },
    });

    activityBatch.push(
      buildActivityCreateManyInput({
        id: stableId('act', 'account', accountId),
        type: 'account.created',
        organizationId: ORG.id,
        accountId,
        actor: { kind: 'system', systemId: 'seed' },
        occurredAt: daysAgo(config.asOf, rng.int(200, 800)),
        title: 'Cliente creado',
        related: { type: 'account', id: accountId },
        metadata: { code: hero?.code ?? undefined, segment: persona.segment },
      }),
    );

    // Persist commerce chain
    for (const q of timeline.quotes) {
      await prisma.quote.create({ data: q.quote });
      await prisma.quoteItem.createMany({ data: q.items });
      for (const item of q.items) {
        priceObsBatch.push({
          id: stableId('pobs', item.id),
          organizationId: ORG.id,
          accountId,
          productId: item.productId,
          source: 'quote',
          sourceId: q.quote.id,
          unitPriceCentavos: item.unitPriceCentavos,
          observedAt: q.quote.createdAt,
          createdBy: ownerId,
        });
      }
      activityBatch.push(
        buildActivityCreateManyInput({
          id: stableId('act', 'quote', q.quote.id),
          type: 'quote.created',
          organizationId: ORG.id,
          accountId,
          actor: { kind: 'user', userId: ownerId },
          occurredAt: q.quote.createdAt,
          title: `Cotización ${q.quote.number}`,
          body: `Estado: ${q.quote.status}`,
          related: { type: 'quote', id: q.quote.id },
          metadata: { totalCentavos: q.quote.totalCentavos.toString(), status: q.quote.status },
        }),
      );
      if (q.quote.status === 'accepted' || q.quote.status === 'sent') {
        activityBatch.push(
          buildActivityCreateManyInput({
            id: stableId('act', 'quote-sent', q.quote.id),
            type: 'quote.sent',
            organizationId: ORG.id,
            accountId,
            actor: { kind: 'user', userId: ownerId },
            occurredAt: q.quote.sentAt ?? q.quote.createdAt,
            title: `Cotización ${q.quote.number} enviada`,
            related: { type: 'quote', id: q.quote.id },
          }),
        );
      }
      if (q.quote.status === 'accepted') {
        activityBatch.push(
          buildActivityCreateManyInput({
            id: stableId('act', 'quote-acc', q.quote.id),
            type: 'quote.accepted',
            organizationId: ORG.id,
            accountId,
            actor: { kind: 'user', userId: ownerId },
            occurredAt: q.quote.acceptedAt ?? q.quote.createdAt,
            title: `Cotización ${q.quote.number} aceptada`,
            related: { type: 'quote', id: q.quote.id },
          }),
        );
      }
    }
    for (const o of timeline.orders) {
      await prisma.order.create({ data: o.order });
      await prisma.orderItem.createMany({ data: o.items });
      activityBatch.push(
        buildActivityCreateManyInput({
          id: stableId('act', 'order', o.order.id),
          type: 'order.confirmed',
          organizationId: ORG.id,
          accountId,
          actor: { kind: 'user', userId: ownerId },
          occurredAt: o.order.orderedAt,
          title: `Pedido ${o.order.number}`,
          related: { type: 'order', id: o.order.id },
          metadata: { totalCentavos: o.order.totalCentavos.toString() },
        }),
      );
    }
    for (const inv of timeline.invoices) {
      await prisma.invoice.create({ data: inv.invoice });
      await prisma.invoiceItem.createMany({ data: inv.items });
      activityBatch.push(
        buildActivityCreateManyInput({
          id: stableId('act', 'invoice', inv.invoice.id),
          type: 'invoice.issued',
          organizationId: ORG.id,
          accountId,
          actor: { kind: 'user', userId: userIds.get('facturacion')! },
          occurredAt: inv.invoice.issuedAt,
          title: `Factura ${inv.invoice.number}`,
          related: { type: 'invoice', id: inv.invoice.id },
          metadata: {
            totalCentavos: inv.invoice.totalCentavos.toString(),
            balanceCentavos: inv.invoice.balanceCentavos.toString(),
          },
        }),
      );
    }
    for (const pay of timeline.payments) {
      paymentSeq += 1;
      await prisma.payment.create({
        data: {
          ...pay.payment,
          id: pay.payment.id,
          recordedById: userIds.get('cobranzas')!,
        },
      });
      await prisma.paymentAllocation.createMany({ data: pay.allocations });
      activityBatch.push(
        buildActivityCreateManyInput({
          id: stableId('act', 'pay', pay.payment.id),
          type: 'payment.allocated',
          organizationId: ORG.id,
          accountId,
          actor: { kind: 'user', userId: userIds.get('cobranzas')! },
          occurredAt: pay.payment.paidAt,
          title: 'Pago asignado',
          related: { type: 'payment', id: pay.payment.id },
          metadata: { amountCentavos: pay.payment.amountCentavos.toString() },
        }),
      );
    }
    for (const pr of timeline.promises) {
      await prisma.paymentPromise.create({
        data: { ...pr, ownerUserId: userIds.get('cobranzas')! },
      });
      activityBatch.push(
        buildActivityCreateManyInput({
          id: stableId('act', 'promise', pr.id),
          type: 'promise.made',
          organizationId: ORG.id,
          accountId,
          actor: { kind: 'user', userId: userIds.get('cobranzas')! },
          occurredAt: pr.promisedAt,
          title: 'Promesa de pago',
          body: pr.notes ?? undefined,
          related: { type: 'payment_promise', id: pr.id },
          metadata: {
            amountCentavos: pr.amountCentavos.toString(),
            dueAt: pr.dueAt.toISOString(),
            status: pr.status,
          },
        }),
      );
      if (pr.status === 'broken' || pr.status === 'overdue') {
        activityBatch.push(
          buildActivityCreateManyInput({
            id: stableId('act', 'promise-brk', pr.id),
            type: 'promise.broken',
            organizationId: ORG.id,
            accountId,
            actor: { kind: 'system', systemId: 'collections' },
            occurredAt: pr.dueAt,
            title: 'Promesa incumplida',
            related: { type: 'payment_promise', id: pr.id },
          }),
        );
      }
    }

    if (visits.length) {
      await prisma.visit.createMany({
        data: visits.map((v) => ({
          id: v.id,
          organizationId: ORG.id,
          accountId,
          salesRepUserId: ownerId,
          status: v.status,
          plannedAt: v.plannedAt,
          startedAt: v.startedAt,
          completedAt: v.completedAt,
          result: v.result,
          notes: v.notes,
          checkinLat: v.checkinLat,
          checkinLng: v.checkinLng,
          withinGeofence: v.withinGeofence,
        })),
      });
      for (const v of visits) {
        activityBatch.push(
          buildActivityCreateManyInput({
            id: stableId('act', 'visit-plan', v.id),
            type: 'visit.scheduled',
            organizationId: ORG.id,
            accountId,
            actor: { kind: 'user', userId: ownerId },
            occurredAt: v.plannedAt,
            title: 'Visita programada',
            related: { type: 'visit', id: v.id },
            metadata: { status: v.status },
          }),
        );
        if (v.status === 'completed' && v.completedAt) {
          activityBatch.push(
            buildActivityCreateManyInput({
              id: stableId('act', 'visit', v.id),
              type: 'visit.completed',
              organizationId: ORG.id,
              accountId,
              actor: { kind: 'user', userId: ownerId },
              occurredAt: v.completedAt,
              title: 'Visita completada',
              body: v.result ?? undefined,
              related: { type: 'visit', id: v.id },
              metadata: { result: v.result },
            }),
          );
        }
      }
    }

    // WhatsApp thread for many accounts (heroes always have a thread for Señal minute)
    if (hero || rng.chance(0.55)) {
      const channelPurpose = openBalance > 0n && rng.chance(0.4) ? 'cobranzas' : 'ventas';
      const convId = stableId('conv', i);
      const started = daysAgo(config.asOf, rng.int(1, 45));
      const messages = buildWhatsAppThread({
        rng,
        persona,
        accountName: legalName,
        convId,
        started,
        ownerId,
        waUserId: userIds.get(channelPurpose === 'cobranzas' ? 'wa_1' : 'wa_2')!,
        seqStart: msgSeq,
      });
      msgSeq += messages.length;
      const firstOut = messages.find((m) => m.direction === 'out');
      const lastAt = messages[messages.length - 1]!.sentAt;
      await prisma.conversation.create({
        data: {
          id: convId,
          organizationId: ORG.id,
          channelId: channelIds.get(channelPurpose)!,
          accountId,
          contactPhoneE164: phone,
          status: rng.chance(0.2) ? 'open' : 'closed',
          assignedUserId: ownerId,
          lastMessageAt: lastAt,
          slaPolicyId: slaId,
          slaDueAt: addDays(started, 0),
          slaStatus: firstOut ? 'met' : 'ok',
          firstResponseAt: firstOut?.sentAt,
          createdAt: started,
          messages: {
            create: messages.map(({ conversationId: _c, ...m }) => m),
          },
        },
      });
      await prisma.account.update({
        where: { id: accountId },
        data: { lastWhatsappAt: lastAt },
      });
      for (const m of messages) {
        activityBatch.push(
          buildActivityCreateManyInput({
            id: stableId('act', 'wa-msg', m.id),
            type: m.direction === 'in' ? 'whatsapp.received' : 'whatsapp.sent',
            organizationId: ORG.id,
            accountId,
            actor:
              m.direction === 'out' && m.senderUserId
                ? { kind: 'user', userId: m.senderUserId }
                : m.direction === 'out'
                  ? { kind: 'user', userId: ownerId }
                  : { kind: 'system', systemId: 'whatsapp-inbound' },
            occurredAt: m.sentAt,
            title: m.direction === 'in' ? 'WhatsApp recibido' : 'WhatsApp enviado',
            body: m.body.slice(0, 160),
            related: { type: 'message', id: m.id },
            metadata: { conversationId: convId, channelPurpose, direction: m.direction },
          }),
        );
      }
    }

    // Attention items for demo Radar
    if (daysSinceVisit > 21 && persona.segment === 'A') {
      await prisma.attentionItem.create({
        data: {
          id: stableId('attn', 'visit', i),
          organizationId: ORG.id,
          kind: 'visit_gap',
          subjectType: 'account',
          subjectId: accountId,
          accountId,
          score: Math.min(100, Math.round(daysSinceVisit)),
          reasonJson: { reason: 'Cliente A sin visita reciente', daysSinceVisit: Math.round(daysSinceVisit) },
          status: 'open',
          assigneeUserId: ownerId,
        },
      });
    }
    if (openBalance > 0n && creditStatus !== 'ok') {
      await prisma.attentionItem.create({
        data: {
          id: stableId('attn', 'debt', i),
          organizationId: ORG.id,
          kind: 'collections',
          subjectType: 'account',
          subjectId: accountId,
          accountId,
          score: Math.min(100, Number(openBalance / 50000n)),
          reasonJson: { reason: 'Cartera en riesgo', balanceCentavos: openBalance.toString() },
          status: 'open',
          assigneeUserId: userIds.get('cobranzas')!,
        },
      });
    }

    await prisma.aiSummary.create({
      data: {
        id: stableId('ais', accountId),
        organizationId: ORG.id,
        subjectType: 'account',
        subjectId: accountId,
        accountId,
        summary: `${legalName}: perfil ${persona.key.replaceAll('_', ' ')}. ${evidence.join('. ')}.`,
        evidenceJson: evidence,
        model: 'mock-ai',
        createdAt: config.asOf,
      },
    });
  }
  counts.accounts = config.accountCount;

  // Flush batches
  for (let i = 0; i < activityBatch.length; i += 500) {
    await prisma.activityEvent.createMany({ data: activityBatch.slice(i, i + 500) });
  }
  for (let i = 0; i < priceObsBatch.length; i += 500) {
    await prisma.priceObservation.createMany({ data: priceObsBatch.slice(i, i + 500) });
  }

  counts.quotes = await prisma.quote.count();
  counts.orders = await prisma.order.count();
  counts.invoices = await prisma.invoice.count();
  counts.payments = await prisma.payment.count();
  counts.visits = await prisma.visit.count();
  counts.conversations = await prisma.conversation.count();
  counts.messages = await prisma.message.count();
  counts.activityEvents = await prisma.activityEvent.count();
  counts.priceObservations = await prisma.priceObservation.count();
  counts.attentionItems = await prisma.attentionItem.count();

  const checksum = createHash('sha256')
    .update(JSON.stringify({ seedKey: config.seedKey, profile: config.profile, counts }))
    .digest('hex')
    .slice(0, 16);

  await prisma.seedMeta.create({
    data: {
      id: stableId('seedmeta', config.profile, config.seedKey),
      profile: config.profile,
      seedKey: config.seedKey,
      checksum,
      countsJson: counts,
    },
  });

  return { checksum, counts, profile: config.profile, seedKey: config.seedKey };
}

async function wipe(prisma: PrismaClient) {
  // Preserve Prisma migration history — never truncate `_prisma_migrations`.
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}

// ── Timeline builders ────────────────────────────────────

function buildAccountTimeline(args: {
  rng: Rng;
  persona: Persona;
  config: SeedConfig;
  createdAt: Date;
  productBySku: Map<string, { id: string; family: string; list: bigint }>;
  accountId: string;
  ownerId: string;
  quoteSeqStart: number;
  orderSeqStart: number;
  invoiceSeqStart: number;
}) {
  const { rng, persona, config, createdAt, productBySku, accountId, ownerId } = args;
  let quoteSeq = args.quoteSeqStart;
  let orderSeq = args.orderSeqStart;
  let invoiceSeq = args.invoiceSeqStart;

  const personaFamilies = persona.families as readonly string[];
  const products = [...productBySku.entries()]
    .filter(([, v]) => personaFamilies.includes(v.family))
    .map(([sku, v]) => ({ sku, ...v }));
  const pool = products.length ? products : [...productBySku.entries()].map(([sku, v]) => ({ sku, ...v }));

  const quotes: Array<{ quote: Prisma.QuoteCreateManyInput & { createdAt: Date }; items: Prisma.QuoteItemCreateManyInput[] }> = [];
  // Actually QuoteCreate needs nested - we'll use full create input objects
  type Q = {
    quote: {
      id: string;
      organizationId: string;
      number: string;
      accountId: string;
      ownerUserId: string;
      status: string;
      validUntil: Date;
      subtotalCentavos: bigint;
      taxCentavos: bigint;
      totalCentavos: bigint;
      currency: string;
      sentAt: Date | null;
      acceptedAt: Date | null;
      createdAt: Date;
    };
    items: Array<{
      id: string;
      quoteId: string;
      productId: string;
      description: string;
      qty: Prisma.Decimal | number;
      unitPriceCentavos: bigint;
      discountBps: number;
      lineTotalCentavos: bigint;
      position: number;
      lastPriceShownCentavos: bigint | null;
    }>;
  };
  type O = {
    order: {
      id: string;
      organizationId: string;
      number: string;
      accountId: string;
      quoteId: string | null;
      status: string;
      orderedAt: Date;
      subtotalCentavos: bigint;
      taxCentavos: bigint;
      totalCentavos: bigint;
      currency: string;
    };
    items: Array<{
      id: string;
      orderId: string;
      productId: string;
      qty: number;
      unitPriceCentavos: bigint;
      lineTotalCentavos: bigint;
      position: number;
    }>;
  };
  type I = {
    invoice: {
      id: string;
      organizationId: string;
      number: string;
      accountId: string;
      orderId: string | null;
      status: string;
      issuedAt: Date;
      dueAt: Date;
      subtotalCentavos: bigint;
      taxCentavos: bigint;
      totalCentavos: bigint;
      balanceCentavos: bigint;
      currency: string;
    };
    items: Array<{
      id: string;
      invoiceId: string;
      productId: string;
      qty: number;
      unitPriceCentavos: bigint;
      lineTotalCentavos: bigint;
    }>;
  };
  type P = {
    payment: {
      id: string;
      organizationId: string;
      accountId: string;
      amountCentavos: bigint;
      currency: string;
      method: string;
      paidAt: Date;
      reference: string | null;
      recordedById: string;
    };
    allocations: Array<{ id: string; paymentId: string; invoiceId: string; amountCentavos: bigint }>;
  };

  const qOut: Q[] = [];
  const oOut: O[] = [];
  const iOut: I[] = [];
  const payOut: P[] = [];
  const promises: Array<{
    id: string;
    organizationId: string;
    accountId: string;
    invoiceId: string | null;
    amountCentavos: bigint;
    promisedAt: Date;
    dueAt: Date;
    status: string;
    notes: string | null;
    ownerUserId: string;
  }> = [];

  let cursor = new Date(createdAt);
  let orderCount = 0;
  let lifetimeCentavos = 0n;
  let openBalance = 0n;
  let lastPurchaseAt: Date | null = null;
  let lastPriceByProduct = new Map<string, bigint>();
  let growth = 1;

  const quietMonths = 'quietMonths' in persona && persona.quietMonths ? persona.quietMonths : 0;
  const quietStart = daysAgo(config.asOf, quietMonths * 30);

  while (cursor < config.asOf) {
    if (quietMonths && cursor >= quietStart) break;

    const gap = rng.int(persona.orderEveryDays[0], persona.orderEveryDays[1]);
    cursor = addDays(cursor, gap);
    if (cursor >= config.asOf) break;

    growth *= 1 + persona.growth / 12;
    const season = seasonalFactor(cursor);
    const lineCount = rng.int(1, Math.min(4, pool.length));
    const chosen = rng.shuffle(pool).slice(0, lineCount);

    const itemsData: Q['items'] = [];
    let subtotal = 0n;
    chosen.forEach((prod, idx) => {
      const qty = rng.int(1, persona.segment === 'A' ? 12 : 6);
      let unit = prod.list;
      // price evolution + negotiation
      const monthsAlive = Math.max(0, (cursor.getTime() - createdAt.getTime()) / (30 * 86400000));
      const inflation = 1 + monthsAlive * 0.004;
      unit = BigInt(Math.round(Number(unit) * inflation * season * (0.92 + growth * 0.08)));
      if (persona.negotiate > 0.5 && rng.chance(persona.negotiate)) {
        unit = BigInt(Math.round(Number(unit) * (0.88 + rng.next() * 0.08)));
      }
      const prev = lastPriceByProduct.get(prod.id);
      if (prev && rng.chance(0.4)) {
        // sticky customer price with slight drift
        unit = BigInt(Math.round(Number(prev) * (0.98 + rng.next() * 0.05)));
      }
      lastPriceByProduct.set(prod.id, unit);
      const line = unit * BigInt(qty);
      subtotal += line;
      itemsData.push({
        id: stableId('qi', accountId, quoteSeq, idx),
        quoteId: '', // fill below
        productId: prod.id,
        description: PRODUCT_CATALOG.find((p) => productBySku.get(p.sku)?.id === prod.id)?.name ?? 'Producto',
        qty,
        unitPriceCentavos: unit,
        discountBps: persona.negotiate > 0.7 ? rng.int(0, 800) : 0,
        lineTotalCentavos: line,
        position: idx,
        lastPriceShownCentavos: prev ?? null,
      });
    });

    quoteSeq += 1;
    const quoteId = stableId('quo', accountId, quoteSeq);
    itemsData.forEach((it) => {
      it.quoteId = quoteId;
    });
    const accept = rng.chance(0.62 + (persona.segment === 'A' ? 0.1 : 0));
    const status = accept ? 'accepted' : rng.chance(0.5) ? 'sent' : 'rejected';
    const quote = {
      id: quoteId,
      organizationId: ORG.id,
      number: `COT-${quoteSeq}`,
      accountId,
      ownerUserId: ownerId,
      status,
      validUntil: addDays(cursor, 15),
      subtotalCentavos: subtotal,
      taxCentavos: 0n,
      totalCentavos: subtotal,
      currency: 'BOB',
      sentAt: cursor,
      acceptedAt: accept ? addDays(cursor, rng.int(0, 5)) : null,
      createdAt: cursor,
    };
    qOut.push({ quote, items: itemsData });

    if (!accept) continue;

    orderSeq += 1;
    const orderId = stableId('ord', accountId, orderSeq);
    const orderedAt = quote.acceptedAt ?? cursor;
    const orderItems = itemsData.map((it, idx) => ({
      id: stableId('oi', orderId, idx),
      orderId,
      productId: it.productId,
      qty: Number(it.qty),
      unitPriceCentavos: it.unitPriceCentavos,
      lineTotalCentavos: it.lineTotalCentavos,
      position: idx,
    }));
    oOut.push({
      order: {
        id: orderId,
        organizationId: ORG.id,
        number: `PED-${orderSeq}`,
        accountId,
        quoteId,
        status: 'fulfilled',
        orderedAt,
        subtotalCentavos: subtotal,
        taxCentavos: 0n,
        totalCentavos: subtotal,
        currency: 'BOB',
      },
      items: orderItems,
    });
    orderCount += 1;
    lifetimeCentavos += subtotal;
    lastPurchaseAt = orderedAt;

    invoiceSeq += 1;
    const invoiceId = stableId('inv', accountId, invoiceSeq);
    const issuedAt = addDays(orderedAt, 1);
    const dueAt = addDays(issuedAt, persona.segment === 'A' ? 30 : 21);
    let balance = subtotal;
    let invStatus = 'open';

    // Payments according to discipline
    const paymentsForInvoice: P[] = [];
    if (rng.chance(persona.payDiscipline)) {
      const payAt = addDays(dueAt, rng.int(-5, persona.payDiscipline > 0.8 ? 3 : 25));
      if (payAt <= config.asOf) {
        const payId = stableId('pay', invoiceId);
        const amount = rng.chance(0.15) ? subtotal / 2n : subtotal;
        paymentsForInvoice.push({
          payment: {
            id: payId,
            organizationId: ORG.id,
            accountId,
            amountCentavos: amount,
            currency: 'BOB',
            method: rng.pick(['transfer', 'cash', 'check']),
            paidAt: payAt,
            reference: `TRX-${invoiceSeq}`,
            recordedById: ownerId,
          },
          allocations: [
            {
              id: stableId('pall', payId),
              paymentId: payId,
              invoiceId,
              amountCentavos: amount,
            },
          ],
        });
        balance -= amount;
        invStatus = balance <= 0n ? 'paid' : 'partial';
      }
    } else if (dueAt < config.asOf && rng.chance(0.5)) {
      promises.push({
        id: stableId('prom', invoiceId),
        organizationId: ORG.id,
        accountId,
        invoiceId,
        amountCentavos: balance,
        promisedAt: daysAgo(config.asOf, rng.int(1, 10)),
        dueAt: addDays(config.asOf, rng.int(2, 14)),
        status: dueAt < config.asOf && rng.chance(0.45) ? 'broken' : 'open',
        notes: 'Promesa generada por disciplina de pago del persona',
        ownerUserId: ownerId,
      });
    }

    iOut.push({
      invoice: {
        id: invoiceId,
        organizationId: ORG.id,
        number: `FAC-${invoiceSeq}`,
        accountId,
        orderId,
        status: invStatus,
        issuedAt,
        dueAt,
        subtotalCentavos: subtotal,
        taxCentavos: 0n,
        totalCentavos: subtotal,
        balanceCentavos: balance < 0n ? 0n : balance,
        currency: 'BOB',
      },
      items: orderItems.map((it, idx) => ({
        id: stableId('ii', invoiceId, idx),
        invoiceId,
        productId: it.productId,
        qty: it.qty,
        unitPriceCentavos: it.unitPriceCentavos,
        lineTotalCentavos: it.lineTotalCentavos,
      })),
    });
    payOut.push(...paymentsForInvoice);
    openBalance += balance < 0n ? 0n : balance;
  }

  return {
    quotes: qOut,
    orders: oOut,
    invoices: iOut,
    payments: payOut,
    promises,
    orderCount,
    lifetimeCentavos,
    openBalance,
    lastPurchaseAt,
    nextQuoteSeq: quoteSeq,
    nextOrderSeq: orderSeq,
    nextInvoiceSeq: invoiceSeq,
  };
}

function buildVisits(args: {
  rng: Rng;
  persona: Persona;
  config: SeedConfig;
  accountId: string;
  ownerId: string;
  createdAt: Date;
  lat: number;
  lng: number;
  seqStart: number;
}) {
  const { rng, persona, config, accountId, createdAt, lat, lng } = args;
  const out: Array<{
    id: string;
    status: string;
    plannedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    result: string | null;
    notes: string | null;
    checkinLat: number | null;
    checkinLng: number | null;
    withinGeofence: boolean | null;
  }> = [];
  let cursor = new Date(createdAt);
  let n = args.seqStart;
  while (cursor < config.asOf) {
    const gap = rng.int(persona.visitEveryDays[0], persona.visitEveryDays[1]);
    cursor = addDays(cursor, gap);
    if (cursor >= config.asOf) break;
    n += 1;
    const completed = rng.chance(0.82);
    out.push({
      id: stableId('vis', accountId, n),
      status: completed ? 'completed' : rng.chance(0.5) ? 'missed' : 'planned',
      plannedAt: cursor,
      startedAt: completed ? cursor : null,
      completedAt: completed ? addDays(cursor, 0) : null,
      result: completed ? rng.pick(['sold', 'quoted', 'follow_up', 'not_available']) : null,
      notes: completed ? 'Visita de seguimiento comercial' : null,
      checkinLat: completed ? lat + (rng.next() - 0.5) * 0.002 : null,
      checkinLng: completed ? lng + (rng.next() - 0.5) * 0.002 : null,
      withinGeofence: completed ? rng.chance(0.94) : null,
    });
  }
  return out;
}

function buildWhatsAppThread(args: {
  rng: Rng;
  persona: Persona;
  accountName: string;
  convId: string;
  started: Date;
  ownerId: string;
  waUserId: string;
  seqStart: number;
}) {
  const { rng, persona, accountName, convId, started, waUserId } = args;
  const msgs: Array<{
    id: string;
    organizationId: string;
    conversationId: string;
    direction: string;
    providerMessageId: string;
    body: string;
    sentAt: Date;
    senderType: string;
    senderUserId: string | null;
    status: string;
  }> = [];
  let t = started;
  const inbound = [
    `Hola, ¿tienen stock de inodoros para esta semana? — ${accountName}`,
    '¿Me pueden pasar el último precio que nos dieron?',
    persona.key === 'debt_risk' ? 'Necesito reprogramar el pago de la factura' : 'Quiero cotizar 10 lavamanos',
  ];
  const outbound = [
    'Buenos días, con gusto. Revisamos disponibilidad y le confirmamos.',
    'Le comparto el último precio registrado para su cuenta.',
    'Queda agendada la visita / seguimiento. Gracias.',
  ];
  for (let i = 0; i < inbound.length; i++) {
    t = addDays(t, 0);
    t = new Date(t.getTime() + i * 3600000);
    msgs.push({
      id: stableId('msg', convId, args.seqStart + i * 2),
      organizationId: ORG.id,
      conversationId: convId,
      direction: 'in',
      providerMessageId: `mock_in_${convId}_${i}`,
      body: inbound[i]!,
      sentAt: t,
      senderType: 'customer',
      senderUserId: null,
      status: 'delivered',
    });
    if (rng.chance(0.9)) {
      const replyAt = new Date(t.getTime() + rng.int(2, 12) * 60000);
      msgs.push({
        id: stableId('msg', convId, args.seqStart + i * 2 + 1),
        organizationId: ORG.id,
        conversationId: convId,
        direction: 'out',
        providerMessageId: `mock_out_${convId}_${i}`,
        body: outbound[i]!,
        sentAt: replyAt,
        senderType: 'user',
        senderUserId: waUserId,
        status: 'sent',
      });
    }
  }
  return msgs;
}
