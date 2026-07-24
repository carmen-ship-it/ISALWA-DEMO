import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { createId } from '@isalwa/ts-utils';
import type { ProviderRegistry } from '@isalwa/providers';
import { PROVIDER_REGISTRY } from '../providers/providers.tokens';
import { money } from '../lib/money';

type LineInput = {
  productId: string;
  qty: number;
  unitPriceCentavos?: number;
};

@Injectable()
export class CommerceService {
  constructor(@Inject(PROVIDER_REGISTRY) private readonly providers: ProviderRegistry) {}

  async listProducts(q?: string) {
    const prisma = getPrisma();
    if (!prisma) return { items: [] };
    const items = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 40,
      include: { category: true },
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        listPrice: money(p.listPriceCentavos),
      })),
    };
  }

  async lastPrice(accountId: string, productId: string) {
    const prisma = getPrisma();
    if (!prisma) throw new NotFoundException();
    const [obs, product] = await Promise.all([
      prisma.priceObservation.findFirst({
        where: { accountId, productId },
        orderBy: { observedAt: 'desc' },
      }),
      prisma.product.findUnique({ where: { id: productId } }),
    ]);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return {
      productId,
      sku: product.sku,
      name: product.name,
      listPrice: money(product.listPriceCentavos),
      lastPrice: obs ? money(obs.unitPriceCentavos) : null,
      lastObservedAt: obs?.observedAt ?? null,
      source: obs?.source ?? null,
      suggestedUnitPriceCentavos: Number(obs?.unitPriceCentavos ?? product.listPriceCentavos),
    };
  }

  async listQuotes(accountId?: string) {
    const prisma = getPrisma();
    if (!prisma) return { items: [] };
    const items = await prisma.quote.findMany({
      where: accountId ? { accountId } : {},
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { account: true, items: true },
    });
    return {
      items: items.map((q) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        accountId: q.accountId,
        accountName: q.account.tradeName ?? q.account.legalName,
        total: money(q.totalCentavos),
        lineCount: q.items.length,
        createdAt: q.createdAt,
        sentAt: q.sentAt,
      })),
    };
  }

  async getQuote(id: string) {
    const prisma = getPrisma();
    if (!prisma) throw new NotFoundException();
    const q = await prisma.quote.findUnique({
      where: { id },
      include: {
        account: true,
        owner: true,
        items: { include: { product: true }, orderBy: { position: 'asc' } },
        orders: { include: { invoices: true } },
      },
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    return this.serializeQuote(q);
  }

  async createQuote(input: { accountId: string; items: LineInput[]; notes?: string }) {
    const prisma = getPrisma();
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    if (!input.items?.length) throw new BadRequestException('Agregue al menos una línea');

    const account = await prisma.account.findUnique({ where: { id: input.accountId } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');

    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = [];
    let subtotal = 0n;
    for (let i = 0; i < input.items.length; i++) {
      const line = input.items[i]!;
      const product = byId.get(line.productId);
      if (!product) throw new BadRequestException(`Producto inválido: ${line.productId}`);
      const qty = Math.max(1, Math.round(line.qty));
      const last = await prisma.priceObservation.findFirst({
        where: { accountId: input.accountId, productId: product.id },
        orderBy: { observedAt: 'desc' },
      });
      const unit = BigInt(
        line.unitPriceCentavos ?? Number(last?.unitPriceCentavos ?? product.listPriceCentavos),
      );
      const lineTotal = unit * BigInt(qty);
      subtotal += lineTotal;
      lines.push({
        id: createId(),
        productId: product.id,
        description: product.name,
        qty,
        unitPriceCentavos: unit,
        discountBps: 0,
        lineTotalCentavos: lineTotal,
        position: i + 1,
        lastPriceShownCentavos: last?.unitPriceCentavos ?? null,
      });
    }

    const count = await prisma.quote.count({ where: { organizationId: account.organizationId } });
    const number = `COT-${String(count + 1).padStart(5, '0')}`;
    const quoteId = createId();
    const validUntil = new Date(Date.now() + 14 * 86400000);

    await prisma.quote.create({
      data: {
        id: quoteId,
        organizationId: account.organizationId,
        number,
        accountId: account.id,
        ownerUserId: account.ownerUserId,
        status: 'draft',
        validUntil,
        subtotalCentavos: subtotal,
        taxCentavos: 0n,
        totalCentavos: subtotal,
        notes: input.notes ?? null,
        items: { create: lines },
      },
    });

    await prisma.activityEvent.create({
      data: {
        id: createId(),
        organizationId: account.organizationId,
        accountId: account.id,
        actorUserId: account.ownerUserId,
        type: 'quote_created',
        title: `Cotización ${number} creada`,
        body: `${lines.length} líneas · ${money(subtotal).label}`,
        payloadJson: { quoteId },
        occurredAt: new Date(),
      },
    });

    return this.getQuote(quoteId);
  }

  async sendQuote(id: string) {
    const prisma = getPrisma();
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const q = await prisma.quote.findUnique({
      where: { id },
      include: { account: true, items: { include: { product: true } } },
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.status !== 'draft' && q.status !== 'sent') {
      throw new BadRequestException('Solo se pueden enviar borradores o reenviar enviadas');
    }

    const html = [
      `<h1>Cotización ${q.number}</h1>`,
      `<p>${q.account.tradeName ?? q.account.legalName}</p>`,
      ...q.items.map(
        (i) =>
          `<div>${i.qty} × ${i.product.name} — ${money(i.unitPriceCentavos).label}</div>`,
      ),
      `<strong>Total ${money(q.totalCentavos).label}</strong>`,
    ].join('\n');

    const pdfBytes = await this.providers.pdf.renderQuotePdf({
      quoteNumber: q.number,
      html,
    });

    await prisma.quote.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });

    for (const item of q.items) {
      await prisma.priceObservation.create({
        data: {
          id: createId(),
          organizationId: q.organizationId,
          accountId: q.accountId,
          productId: item.productId,
          source: 'quote',
          sourceId: q.id,
          unitPriceCentavos: item.unitPriceCentavos,
          observedAt: new Date(),
          createdBy: q.ownerUserId,
        },
      });
    }

    await prisma.activityEvent.create({
      data: {
        id: createId(),
        organizationId: q.organizationId,
        accountId: q.accountId,
        actorUserId: q.ownerUserId,
        type: 'quote_sent',
        title: `Cotización ${q.number} enviada`,
        body: `PDF mock ${pdfBytes.byteLength} bytes · lista para WhatsApp`,
        payloadJson: { quoteId: q.id, pdfBytes: pdfBytes.byteLength },
        occurredAt: new Date(),
      },
    });

    return this.getQuote(id);
  }

  async acceptQuote(id: string) {
    const prisma = getPrisma();
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const q = await prisma.quote.findUnique({
      where: { id },
      include: { items: true, orders: true },
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.orders.length > 0) {
      return this.getQuote(id);
    }
    if (q.status === 'rejected' || q.status === 'expired') {
      throw new BadRequestException('Cotización no aceptable');
    }

    const orderId = createId();
    const invoiceId = createId();
    const orderCount = await prisma.order.count({ where: { organizationId: q.organizationId } });
    const invoiceCount = await prisma.invoice.count({
      where: { organizationId: q.organizationId },
    });
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 86400000);

    await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: { status: 'accepted', acceptedAt: now },
      });
      await tx.order.create({
        data: {
          id: orderId,
          organizationId: q.organizationId,
          number: `PED-${String(orderCount + 1).padStart(5, '0')}`,
          accountId: q.accountId,
          quoteId: q.id,
          status: 'confirmed',
          orderedAt: now,
          subtotalCentavos: q.subtotalCentavos,
          taxCentavos: q.taxCentavos,
          totalCentavos: q.totalCentavos,
          items: {
            create: q.items.map((i) => ({
              id: createId(),
              productId: i.productId,
              qty: i.qty,
              unitPriceCentavos: i.unitPriceCentavos,
              lineTotalCentavos: i.lineTotalCentavos,
              position: i.position,
            })),
          },
        },
      });
      await tx.invoice.create({
        data: {
          id: invoiceId,
          organizationId: q.organizationId,
          number: `FAC-${String(invoiceCount + 1).padStart(5, '0')}`,
          accountId: q.accountId,
          orderId,
          status: 'open',
          issuedAt: now,
          dueAt: due,
          subtotalCentavos: q.subtotalCentavos,
          taxCentavos: q.taxCentavos,
          totalCentavos: q.totalCentavos,
          balanceCentavos: q.totalCentavos,
          items: {
            create: q.items.map((i) => ({
              id: createId(),
              productId: i.productId,
              qty: i.qty,
              unitPriceCentavos: i.unitPriceCentavos,
              lineTotalCentavos: i.lineTotalCentavos,
            })),
          },
        },
      });
      await tx.activityEvent.create({
        data: {
          id: createId(),
          organizationId: q.organizationId,
          accountId: q.accountId,
          actorUserId: q.ownerUserId,
          type: 'quote_accepted',
          title: `Cotización ${q.number} aceptada`,
          body: 'Pedido y factura generados automáticamente',
          payloadJson: { quoteId: q.id, orderId, invoiceId },
          occurredAt: now,
        },
      });
    });

    return this.getQuote(id);
  }

  async getInvoice(id: string) {
    const prisma = getPrisma();
    if (!prisma) throw new NotFoundException();
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        account: true,
        order: { include: { quote: true } },
        items: { include: { product: true } },
        allocations: { include: { payment: true } },
        promises: true,
      },
    });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return {
      id: inv.id,
      number: inv.number,
      status: inv.status,
      accountId: inv.accountId,
      accountName: inv.account.tradeName ?? inv.account.legalName,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      total: money(inv.totalCentavos),
      balance: money(inv.balanceCentavos),
      orderId: inv.orderId,
      quoteId: inv.order?.quoteId ?? null,
      quoteNumber: inv.order?.quote?.number ?? null,
      items: inv.items.map((i) => ({
        id: i.id,
        productName: i.product.name,
        sku: i.product.sku,
        qty: Number(i.qty),
        unitPrice: money(i.unitPriceCentavos),
        lineTotal: money(i.lineTotalCentavos),
      })),
      payments: inv.allocations.map((a) => ({
        id: a.payment.id,
        amount: money(a.amountCentavos),
        method: a.payment.method,
        paidAt: a.payment.paidAt,
        reference: a.payment.reference,
      })),
      nextHref:
        inv.balanceCentavos > 0n
          ? null
          : `/personas/${inv.accountId}`,
    };
  }

  async recordPayment(input: {
    invoiceId: string;
    amountCentavos: number;
    method?: string;
    reference?: string;
  }) {
    const prisma = getPrisma();
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const amount = BigInt(Math.max(1, Math.round(input.amountCentavos)));
    const inv = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    if (inv.balanceCentavos <= 0n) throw new BadRequestException('Factura ya pagada');
    if (amount > inv.balanceCentavos) {
      throw new BadRequestException('El monto supera el saldo');
    }

    const paymentId = createId();
    const newBalance = inv.balanceCentavos - amount;
    const status = newBalance === 0n ? 'paid' : 'partial';

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          id: paymentId,
          organizationId: inv.organizationId,
          accountId: inv.accountId,
          amountCentavos: amount,
          method: input.method ?? 'transfer',
          paidAt: new Date(),
          reference: input.reference ?? `PAY-${paymentId.slice(0, 8)}`,
          recordedById: (
            await tx.account.findUniqueOrThrow({ where: { id: inv.accountId } })
          ).ownerUserId,
          allocations: {
            create: {
              id: createId(),
              invoiceId: inv.id,
              amountCentavos: amount,
            },
          },
        },
      });
      await tx.invoice.update({
        where: { id: inv.id },
        data: { balanceCentavos: newBalance, status },
      });
      await tx.activityEvent.create({
        data: {
          id: createId(),
          organizationId: inv.organizationId,
          accountId: inv.accountId,
          type: 'payment_recorded',
          title: `Pago ${money(amount).label} aplicado a ${inv.number}`,
          body: status === 'paid' ? 'Factura saldada' : `Saldo restante ${money(newBalance).label}`,
          payloadJson: { paymentId, invoiceId: inv.id },
          occurredAt: new Date(),
        },
      });
    });

    return this.getInvoice(inv.id);
  }

  private serializeQuote(q: {
    id: string;
    number: string;
    status: string;
    accountId: string;
    notes: string | null;
    validUntil: Date;
    createdAt: Date;
    sentAt: Date | null;
    acceptedAt: Date | null;
    subtotalCentavos: bigint;
    taxCentavos: bigint;
    totalCentavos: bigint;
    account: { tradeName: string | null; legalName: string; code: string };
    owner: { name: string };
    items: Array<{
      id: string;
      productId: string;
      description: string;
      qty: { toString(): string } | number;
      unitPriceCentavos: bigint;
      lineTotalCentavos: bigint;
      lastPriceShownCentavos: bigint | null;
      product: { sku: string; name: string };
    }>;
    orders: Array<{ id: string; number: string; invoices: Array<{ id: string; number: string }> }>;
  }) {
    const invoice = q.orders[0]?.invoices[0];
    return {
      id: q.id,
      number: q.number,
      status: q.status,
      accountId: q.accountId,
      accountCode: q.account.code,
      accountName: q.account.tradeName ?? q.account.legalName,
      ownerName: q.owner.name,
      notes: q.notes,
      validUntil: q.validUntil,
      createdAt: q.createdAt,
      sentAt: q.sentAt,
      acceptedAt: q.acceptedAt,
      subtotal: money(q.subtotalCentavos),
      tax: money(q.taxCentavos),
      total: money(q.totalCentavos),
      items: q.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        sku: i.product.sku,
        name: i.product.name,
        description: i.description,
        qty: Number(i.qty),
        unitPrice: money(i.unitPriceCentavos),
        lineTotal: money(i.lineTotalCentavos),
        lastPriceShown: i.lastPriceShownCentavos != null ? money(i.lastPriceShownCentavos) : null,
      })),
      orderId: q.orders[0]?.id ?? null,
      orderNumber: q.orders[0]?.number ?? null,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.number ?? null,
    };
  }
}
