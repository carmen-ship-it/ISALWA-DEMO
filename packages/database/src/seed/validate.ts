import { PrismaClient } from '@prisma/client';

/**
 * Post-seed integrity checks — relationships must tell a coherent story.
 */
async function main() {
  const prisma = new PrismaClient();
  const errors: string[] = [];

  try {
    const invoices = await prisma.invoice.findMany({
      select: { id: true, orderId: true, accountId: true, balanceCentavos: true, totalCentavos: true },
      take: 5000,
    });
    for (const inv of invoices) {
      if (!inv.orderId) errors.push(`Invoice ${inv.id} missing orderId`);
      if (inv.balanceCentavos < 0n) errors.push(`Invoice ${inv.id} negative balance`);
      if (inv.balanceCentavos > inv.totalCentavos) errors.push(`Invoice ${inv.id} balance > total`);
    }

    const orphanOrders = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM orders o
      LEFT JOIN quotes q ON q.id = o.quote_id
      WHERE o.quote_id IS NOT NULL AND q.id IS NULL
    `;
    if (Number(orphanOrders[0]?.n ?? 0) > 0) errors.push('Orders reference missing quotes');

    const waWithoutAccount = await prisma.conversation.count({ where: { accountId: null } });
    // allowed but we expect most linked
    const waTotal = await prisma.conversation.count();
    if (waTotal > 0 && waWithoutAccount / waTotal > 0.2) {
      errors.push('Too many WhatsApp conversations without account link');
    }

    const accounts = await prisma.account.count();
    const withScore = await prisma.account.count({ where: { relationshipScore: { gt: 0 } } });
    if (accounts > 0 && withScore / accounts < 0.5) {
      errors.push('Too many accounts with zero relationship score');
    }

    const meta = await prisma.seedMeta.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!meta) errors.push('Missing seed_meta checksum row');

    const heroCodes = ['H-VIP-001', 'H-DEBT-001', 'H-SILENT-001', 'H-TANK-001', 'H-NEG-001'];
    const heroes = await prisma.account.findMany({ where: { code: { in: heroCodes } } });
    if (heroes.length !== heroCodes.length) {
      errors.push(`Expected ${heroCodes.length} demo heroes, found ${heroes.length}`);
    }

    const sample = await prisma.account.findFirst({
      where: { personaKey: 'vip_grower' },
      include: {
        quotes: { take: 1 },
        orders: { take: 1 },
        invoices: { take: 1 },
        visits: { take: 1 },
        conversations: { take: 1 },
      },
    });
    if (sample) {
      if (sample.orders.length === 0) errors.push('vip_grower sample has no orders');
      if (sample.visits.length === 0) errors.push('vip_grower sample has no visits');
    }

    if (errors.length) {
      console.error(JSON.stringify({ ok: false, errors }, null, 2));
      process.exit(1);
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          accounts,
          invoices: invoices.length,
          conversations: waTotal,
          seedChecksum: meta?.checksum,
          heroes: heroes.map((h) => ({ code: h.code, name: h.tradeName })),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
