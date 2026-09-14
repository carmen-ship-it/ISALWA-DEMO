import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { emitCommercialEvent, getPrisma } from '@isalwa/database';
import { createId } from '@isalwa/ts-utils';
import type { ProviderRegistry } from '@isalwa/providers';
import { holdsExactScope, trustedOrganizationId } from '../auth/trusted-session';
import { PROVIDER_REGISTRY } from '../providers/providers.tokens';
import { money } from '../lib/money';

type LineInput = {
  productId: string;
  qty: number;
  unitPriceCentavos?: number;
};

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.product. Not a caller-supplied tenant. */
const PRODUCT_READ_SCOPE = 'master_data.admin';
/** Matches TENANT_SURFACE_REQUIRED_SCOPE.quote. Not a caller-supplied tenant. */
const QUOTE_READ_SCOPE = 'commercial.team.read';
/**
 * Operational reference read for a price memory or invoice the caller already
 * holds a commercial id for. Not accounting authority. Does not imply
 * finance.operational.record. Not price.read or invoice.read.
 */
const COMMERCIAL_REFERENCE_READ_SCOPE = 'commercial.team.read';
/** Existing operational finance record scope. Not a ledger posting. */
const PAYMENT_RECORD_SCOPE = 'finance.operational.record';

const PRICE_NOT_FOUND = 'Producto no encontrado';
const QUOTE_NOT_FOUND = 'Cotización no encontrada';
const INVOICE_NOT_FOUND = 'Factura no encontrada';
const ACCOUNT_NOT_FOUND = 'Cuenta no encontrada';

/**
 * createQuote, sendQuote, and acceptQuote have no existing create/send scope.
 * commercial.team.read does not authorize them. commercial.quote.convert.own
 * does not either: acceptQuote is not that convert action — current code does
 * not require the scope, does not check owner or submitted status, and creates
 * an order. Do not invent a scope string.
 */
export const QUOTE_MUTATION_AUTHORITY = 'CROSS_LANE_CHANGE_REQUEST' as const;

export type TrustedCommerceSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type CommerceDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type ProductListRow = {
  id: string;
  sku: string;
  name: string;
  listPriceCentavos: bigint;
  category: { name: string };
};

type QuoteListRow = {
  id: string;
  number: string;
  status: string;
  accountId: string;
  totalCentavos: bigint;
  createdAt: Date;
  sentAt: Date | null;
  account: { tradeName: string | null; legalName: string };
  items: unknown[];
};

export type CommerceReadDb = {
  product: {
    findMany: (args: {
      where: {
        organizationId: string;
        isActive: true;
        OR?: Array<Record<string, { contains: string; mode: 'insensitive' }>>;
      };
      orderBy: { name: 'asc' };
      take: number;
      include: { category: true };
    }) => Promise<ProductListRow[]>;
  };
  quote: {
    findMany: (args: {
      where: { organizationId: string; accountId?: string };
      orderBy: { createdAt: 'desc' };
      take: number;
      include: { account: true; items: true };
    }) => Promise<QuoteListRow[]>;
  };
};

export type CommerceListResult<T> = {
  items: T[];
  code: CommerceDenialCode | null;
  count: number;
};

type OwnedId = { id: string; organizationId: string };

type AccountOwned = {
  id: string;
  organizationId: string;
  ownerUserId: string;
};

type ProductOwned = {
  id: string;
  sku: string;
  name: string;
  listPriceCentavos: bigint;
};

type ObservationOwned = {
  unitPriceCentavos: bigint;
  observedAt: Date;
  source: string | null;
};

type InvoiceCharge = {
  id: string;
  organizationId: string;
  accountId: string;
  number: string;
  balanceCentavos: bigint;
};

export type CommerceLookupDb = {
  account: {
    findFirst: (args: { where: OwnedId }) => Promise<AccountOwned | null>;
  };
  product: {
    findFirst: (args: { where: OwnedId }) => Promise<ProductOwned | null>;
    findMany: (args: {
      where: { id: { in: string[] }; organizationId: string };
    }) => Promise<Array<Pick<ProductOwned, 'id' | 'name' | 'listPriceCentavos'>>>;
  };
  priceObservation: {
    findFirst: (args: {
      where: { accountId: string; productId: string; organizationId: string };
      orderBy: { observedAt: 'desc' };
    }) => Promise<ObservationOwned | null>;
    create: (args: { data: unknown }) => Promise<unknown>;
  };
  quote: {
    findFirst: (args: { where: OwnedId; include?: unknown }) => Promise<unknown>;
    count: (args: { where: { organizationId: string } }) => Promise<number>;
    create: (args: { data: unknown }) => Promise<unknown>;
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  };
  invoice: {
    findFirst: (args: { where: OwnedId; include?: unknown }) => Promise<unknown>;
    count: (args: { where: { organizationId: string } }) => Promise<number>;
    create: (args: { data: unknown }) => Promise<unknown>;
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  };
  order: {
    count: (args: { where: { organizationId: string } }) => Promise<number>;
    create: (args: { data: unknown }) => Promise<unknown>;
  };
  payment: {
    create: (args: { data: unknown }) => Promise<unknown>;
  };
  $transaction: <T>(fn: (tx: CommerceLookupDb) => Promise<T>) => Promise<T>;
};

function commerceReadDb(explicit: CommerceReadDb | null | undefined): CommerceReadDb | null {
  if (explicit !== undefined) return explicit;
  return getPrisma() as CommerceReadDb | null;
}

function requireOrganization(session: TrustedCommerceSession | null | undefined): string {
  const organizationId = trustedOrganizationId(session);
  if (!organizationId || !session) throw new UnauthorizedException('AUTH_REQUIRED');
  return organizationId;
}

/** Capability first. A wrong scope must not reach getPrisma or a caller-supplied db. */
function requireScope(
  session: TrustedCommerceSession | null | undefined,
  scope: string,
): string {
  const organizationId = requireOrganization(session);
  if (!holdsExactScope(session?.grantedScopes, scope)) {
    throw new ForbiddenException('ROLE_FORBIDDEN');
  }
  return organizationId;
}

function lookupDb(explicit: CommerceLookupDb | null | undefined): CommerceLookupDb | null {
  if (explicit !== undefined) return explicit;
  return getPrisma() as CommerceLookupDb | null;
}

function ownedId(id: string, organizationId: string): OwnedId {
  return { id, organizationId };
}

/**
 * No create, send, or accept scope exists. Always deny, including same-tenant
 * callers who hold commercial.team.read or commercial.quote.convert.own.
 */
function denyQuoteMutation(session: TrustedCommerceSession): never {
  void session.grantedScopes;
  void QUOTE_MUTATION_AUTHORITY;
  throw new ForbiddenException('ROLE_FORBIDDEN');
}

function asInvoiceCharge(row: unknown, organizationId: string): InvoiceCharge | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as Partial<InvoiceCharge>;
  if (value.organizationId !== organizationId) return null;
  if (typeof value.id !== 'string' || typeof value.accountId !== 'string') return null;
  if (typeof value.number !== 'string' || typeof value.balanceCentavos !== 'bigint') return null;
  return {
    id: value.id,
    organizationId,
    accountId: value.accountId,
    number: value.number,
    balanceCentavos: value.balanceCentavos,
  };
}

type InvoiceView = {
  id: string;
  number: string;
  status: string;
  accountId: string;
  organizationId: string;
  issuedAt: Date;
  dueAt: Date;
  totalCentavos: bigint;
  balanceCentavos: bigint;
  orderId: string | null;
  account: { tradeName: string | null; legalName: string };
  order: { quoteId: string | null; quote: { number: string } | null } | null;
  items: Array<{
    id: string;
    qty: { toString(): string } | number;
    unitPriceCentavos: bigint;
    lineTotalCentavos: bigint;
    product: { name: string; sku: string };
  }>;
  allocations: Array<{
    amountCentavos: bigint;
    payment: { id: string; method: string; paidAt: Date; reference: string | null };
  }>;
};

type SendQuoteRow = {
  id: string;
  number: string;
  status: string;
  organizationId: string;
  accountId: string;
  ownerUserId: string;
  totalCentavos: bigint;
  account: { tradeName: string | null; legalName: string };
  items: Array<{
    productId: string;
    qty: number;
    unitPriceCentavos: bigint;
    product: { name: string };
  }>;
};

type AcceptQuoteRow = {
  id: string;
  number: string;
  status: string;
  organizationId: string;
  accountId: string;
  ownerUserId: string;
  subtotalCentavos: bigint;
  taxCentavos: bigint;
  totalCentavos: bigint;
  items: Array<{
    productId: string;
    qty: number;
    unitPriceCentavos: bigint;
    lineTotalCentavos: bigint;
    position: number;
  }>;
  orders: unknown[];
};

function asSendQuote(row: unknown, organizationId: string): SendQuoteRow | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as SendQuoteRow;
  if (value.organizationId !== organizationId || !value.account || !Array.isArray(value.items)) return null;
  return value;
}

function asAcceptQuote(row: unknown, organizationId: string): AcceptQuoteRow | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as AcceptQuoteRow;
  if (value.organizationId !== organizationId || !Array.isArray(value.items) || !Array.isArray(value.orders)) {
    return null;
  }
  return value;
}

function quoteBelongsToOrganization(row: unknown, organizationId: string): row is Record<string, unknown> {
  if (!row || typeof row !== 'object') return false;
  const value = row as { organizationId?: unknown; account?: unknown; owner?: unknown; items?: unknown; orders?: unknown };
  if (value.organizationId !== organizationId) return false;
  return Boolean(value.account && value.owner && Array.isArray(value.items) && Array.isArray(value.orders));
}

function asInvoiceView(row: unknown, organizationId: string): InvoiceView | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as InvoiceView;
  if (value.organizationId !== organizationId) return null;
  if (!value.account || !Array.isArray(value.items) || !Array.isArray(value.allocations)) return null;
  return value;
}

const QUOTE_INCLUDE = {
  account: true,
  owner: true,
  items: { include: { product: true }, orderBy: { position: 'asc' as const } },
  orders: { include: { invoices: true } },
};

const INVOICE_INCLUDE = {
  account: true,
  order: { include: { quote: true } },
  items: { include: { product: true } },
  allocations: { include: { payment: true } },
  promises: true,
};

@Injectable()
export class CommerceService {
  constructor(@Inject(PROVIDER_REGISTRY) private readonly providers: ProviderRegistry) {}

  async listProducts(
    q?: string,
    session?: TrustedCommerceSession | null,
    db?: CommerceReadDb | null,
  ): Promise<
    CommerceListResult<{
      id: string;
      sku: string;
      name: string;
      category: string;
      listPrice: ReturnType<typeof money>;
    }>
  > {
    const organizationId = trustedOrganizationId(session);
    if (!organizationId) return { items: [], code: 'AUTH_REQUIRED', count: 0 };
    if (!holdsExactScope(session?.grantedScopes, PRODUCT_READ_SCOPE)) {
      return { items: [], code: 'ROLE_FORBIDDEN', count: 0 };
    }
    const prisma = commerceReadDb(db);
    if (!prisma) return { items: [], code: null, count: 0 };
    const needle = q?.trim() ?? '';
    const items = await prisma.product.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(needle
          ? {
              OR: [
                { name: { contains: needle, mode: 'insensitive' as const } },
                { sku: { contains: needle, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 40,
      include: { category: true },
    });
    const mapped = items.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      listPrice: money(p.listPriceCentavos),
    }));
    return { items: mapped, code: null, count: mapped.length };
  }

  async lastPrice(
    accountId: string,
    productId: string,
    session?: TrustedCommerceSession | null,
    db?: CommerceLookupDb | null,
  ) {
    const organizationId = requireScope(session, COMMERCIAL_REFERENCE_READ_SCOPE);
    const prisma = lookupDb(db);
    if (!prisma) throw new NotFoundException(PRICE_NOT_FOUND);
    const account = await prisma.account.findFirst({
      where: ownedId(accountId, organizationId),
    });
    if (!account) throw new NotFoundException(PRICE_NOT_FOUND);
    const [observation, product] = await Promise.all([
      prisma.priceObservation.findFirst({
        where: { accountId, productId, organizationId },
        orderBy: { observedAt: 'desc' },
      }),
      prisma.product.findFirst({
        where: ownedId(productId, organizationId),
      }),
    ]);
    if (!product || product.id !== productId) throw new NotFoundException(PRICE_NOT_FOUND);
    return {
      productId,
      sku: product.sku,
      name: product.name,
      listPrice: money(product.listPriceCentavos),
      lastPrice: observation ? money(observation.unitPriceCentavos) : null,
      lastObservedAt: observation?.observedAt ?? null,
      source: observation?.source ?? null,
      suggestedUnitPriceCentavos: Number(
        observation?.unitPriceCentavos ?? product.listPriceCentavos,
      ),
    };
  }

  async listQuotes(
    accountId?: string,
    session?: TrustedCommerceSession | null,
    db?: CommerceReadDb | null,
  ): Promise<
    CommerceListResult<{
      id: string;
      number: string;
      status: string;
      accountId: string;
      accountName: string;
      total: ReturnType<typeof money>;
      lineCount: number;
      createdAt: Date;
      sentAt: Date | null;
    }>
  > {
    const organizationId = trustedOrganizationId(session);
    if (!organizationId) return { items: [], code: 'AUTH_REQUIRED', count: 0 };
    if (!holdsExactScope(session?.grantedScopes, QUOTE_READ_SCOPE)) {
      return { items: [], code: 'ROLE_FORBIDDEN', count: 0 };
    }
    const prisma = commerceReadDb(db);
    if (!prisma) return { items: [], code: null, count: 0 };
    const items = await prisma.quote.findMany({
      where: {
        organizationId,
        ...(accountId ? { accountId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { account: true, items: true },
    });
    const mapped = items.map((q) => ({
      id: q.id,
      number: q.number,
      status: q.status,
      accountId: q.accountId,
      accountName: q.account.tradeName ?? q.account.legalName,
      total: money(q.totalCentavos),
      lineCount: q.items.length,
      createdAt: q.createdAt,
      sentAt: q.sentAt,
    }));
    return { items: mapped, code: null, count: mapped.length };
  }

  async getQuote(id: string, session?: TrustedCommerceSession | null, db?: CommerceLookupDb | null) {
    const organizationId = requireScope(session, QUOTE_READ_SCOPE);
    const prisma = lookupDb(db);
    if (!prisma) throw new NotFoundException(QUOTE_NOT_FOUND);
    return this.loadQuote(id, organizationId, prisma);
  }

  async createQuote(
    input: { accountId: string; items: LineInput[]; notes?: string },
    session?: TrustedCommerceSession | null,
    db?: CommerceLookupDb | null,
  ) {
    const organizationId = requireOrganization(session);
    if (!session) throw new UnauthorizedException('AUTH_REQUIRED');
    denyQuoteMutation(session);
    return this.createQuoteOwned(input, organizationId, db);
  }

  private async createQuoteOwned(
    input: { accountId: string; items: LineInput[]; notes?: string },
    organizationId: string,
    db: CommerceLookupDb | null | undefined,
  ) {
    const prisma = lookupDb(db);
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    if (!input.items?.length) throw new BadRequestException('Agregue al menos una línea');

    const account = await prisma.account.findFirst({
      where: ownedId(input.accountId, organizationId),
    });
    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException(ACCOUNT_NOT_FOUND);
    }

    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, organizationId },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = [];
    let subtotal = 0n;
    for (let i = 0; i < input.items.length; i++) {
      const line = input.items[i]!;
      const product = byId.get(line.productId);
      if (!product) throw new BadRequestException(`Producto inválido: ${line.productId}`);
      const qty = Math.max(1, Math.round(line.qty));
      const last = await prisma.priceObservation.findFirst({
        where: { accountId: input.accountId, productId: product.id, organizationId },
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

    const count = await prisma.quote.count({ where: { organizationId } });
    const number = `COT-${String(count + 1).padStart(5, '0')}`;
    const quoteId = createId();
    const validUntil = new Date(Date.now() + 14 * 86400000);

    await prisma.quote.create({
      data: {
        id: quoteId,
        organizationId,
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

    await emitCommercialEvent(prisma as never, {
      id: createId(),
      type: 'quote.created',
      organizationId,
      accountId: account.id,
      actor: { kind: 'user', userId: account.ownerUserId },
      occurredAt: new Date(),
      title: `Cotización ${number} creada`,
      body: `${lines.length} líneas · ${money(subtotal).label}`,
      related: { type: 'quote', id: quoteId },
      metadata: { quoteId, totalCentavos: subtotal.toString() },
    });

    return this.loadQuote(quoteId, organizationId, prisma);
  }

  async sendQuote(id: string, session?: TrustedCommerceSession | null, db?: CommerceLookupDb | null) {
    const organizationId = requireOrganization(session);
    if (!session) throw new UnauthorizedException('AUTH_REQUIRED');
    denyQuoteMutation(session);
    return this.sendQuoteOwned(id, organizationId, db);
  }

  private async sendQuoteOwned(id: string, organizationId: string, db: CommerceLookupDb | null | undefined) {
    const prisma = lookupDb(db);
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const found = await prisma.quote.findFirst({
      where: ownedId(id, organizationId),
      include: { account: true, items: { include: { product: true } } },
    });
    const q = asSendQuote(found, organizationId);
    if (!q) throw new NotFoundException(QUOTE_NOT_FOUND);
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
          organizationId,
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

    await emitCommercialEvent(prisma as never, {
      id: createId(),
      type: 'quote.sent',
      organizationId,
      accountId: q.accountId,
      actor: { kind: 'user', userId: q.ownerUserId },
      occurredAt: new Date(),
      title: `Cotización ${q.number} enviada`,
      body: `PDF mock ${pdfBytes.byteLength} bytes · lista para WhatsApp`,
      related: { type: 'quote', id: q.id },
      metadata: { quoteId: q.id, pdfBytes: pdfBytes.byteLength },
    });

    return this.loadQuote(id, organizationId, prisma);
  }

  async acceptQuote(id: string, session?: TrustedCommerceSession | null, db?: CommerceLookupDb | null) {
    const organizationId = requireOrganization(session);
    if (!session) throw new UnauthorizedException('AUTH_REQUIRED');
    denyQuoteMutation(session);
    return this.acceptQuoteOwned(id, organizationId, db);
  }

  private async acceptQuoteOwned(id: string, organizationId: string, db: CommerceLookupDb | null | undefined) {
    const prisma = lookupDb(db);
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const found = await prisma.quote.findFirst({
      where: ownedId(id, organizationId),
      include: { items: true, orders: true },
    });
    const q = asAcceptQuote(found, organizationId);
    if (!q) throw new NotFoundException(QUOTE_NOT_FOUND);
    if (q.orders.length > 0) {
      return this.loadQuote(id, organizationId, prisma);
    }
    if (q.status === 'rejected' || q.status === 'expired') {
      throw new BadRequestException('Cotización no aceptable');
    }

    const orderId = createId();
    const invoiceId = createId();
    const orderCount = await prisma.order.count({ where: { organizationId } });
    const invoiceCount = await prisma.invoice.count({
      where: { organizationId },
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
          organizationId,
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
          organizationId,
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
      await emitCommercialEvent(tx as never, {
        id: createId(),
        type: 'quote.accepted',
        organizationId,
        accountId: q.accountId,
        actor: { kind: 'user', userId: q.ownerUserId },
        occurredAt: now,
        title: `Cotización ${q.number} aceptada`,
        body: 'Pedido y factura generados automáticamente',
        related: { type: 'quote', id: q.id },
        evidence: [
          { kind: 'entity', ref: { type: 'quote', id: q.id } },
          { kind: 'entity', ref: { type: 'order', id: orderId } },
          { kind: 'entity', ref: { type: 'invoice', id: invoiceId } },
        ],
        metadata: { quoteId: q.id, orderId, invoiceId },
      });
      await emitCommercialEvent(tx as never, {
        id: createId(),
        type: 'order.confirmed',
        organizationId,
        accountId: q.accountId,
        actor: { kind: 'user', userId: q.ownerUserId },
        occurredAt: now,
        title: 'Pedido confirmado',
        related: { type: 'order', id: orderId },
        metadata: { orderId, quoteId: q.id },
      });
      await emitCommercialEvent(tx as never, {
        id: createId(),
        type: 'invoice.issued',
        organizationId,
        accountId: q.accountId,
        actor: { kind: 'user', userId: q.ownerUserId },
        occurredAt: now,
        title: 'Factura emitida',
        related: { type: 'invoice', id: invoiceId },
        metadata: { invoiceId, orderId, quoteId: q.id },
      });
    });

    return this.loadQuote(id, organizationId, prisma);
  }

  async getInvoice(id: string, session?: TrustedCommerceSession | null, db?: CommerceLookupDb | null) {
    const organizationId = requireScope(session, COMMERCIAL_REFERENCE_READ_SCOPE);
    const prisma = lookupDb(db);
    if (!prisma) throw new NotFoundException(INVOICE_NOT_FOUND);
    return this.loadInvoice(id, organizationId, prisma);
  }

  async recordPayment(
    input: {
      invoiceId: string;
      amountCentavos: number;
      method?: string;
      reference?: string;
    },
    session?: TrustedCommerceSession | null,
    db?: CommerceLookupDb | null,
  ) {
    const organizationId = requireScope(session, PAYMENT_RECORD_SCOPE);
    const prisma = lookupDb(db);
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const amount = BigInt(Math.max(1, Math.round(input.amountCentavos)));
    const found = await prisma.invoice.findFirst({
      where: ownedId(input.invoiceId, organizationId),
    });
    const inv = asInvoiceCharge(found, organizationId);
    if (!inv) throw new NotFoundException(INVOICE_NOT_FOUND);
    if (inv.balanceCentavos <= 0n) throw new BadRequestException('Factura ya pagada');
    if (amount > inv.balanceCentavos) {
      throw new BadRequestException('El monto supera el saldo');
    }

    const paymentId = createId();
    const newBalance = inv.balanceCentavos - amount;
    const status = newBalance === 0n ? 'paid' : 'partial';

    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: ownedId(inv.accountId, organizationId),
      });
      if (!account || account.organizationId !== organizationId) {
        throw new NotFoundException(INVOICE_NOT_FOUND);
      }
      await tx.payment.create({
        data: {
          id: paymentId,
          organizationId,
          accountId: inv.accountId,
          amountCentavos: amount,
          method: input.method ?? 'transfer',
          paidAt: new Date(),
          reference: input.reference ?? `PAY-${paymentId.slice(0, 8)}`,
          recordedById: account.ownerUserId,
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
      await emitCommercialEvent(tx as never, {
        id: createId(),
        type: 'payment.allocated',
        organizationId,
        accountId: inv.accountId,
        actor: { kind: 'user', userId: account.ownerUserId },
        occurredAt: new Date(),
        title: `Pago ${money(amount).label} aplicado a ${inv.number}`,
        body: status === 'paid' ? 'Factura saldada' : `Saldo restante ${money(newBalance).label}`,
        related: { type: 'payment', id: paymentId },
        evidence: [
          { kind: 'entity', ref: { type: 'payment', id: paymentId } },
          { kind: 'entity', ref: { type: 'invoice', id: inv.id } },
        ],
        metadata: { paymentId, invoiceId: inv.id, amountCentavos: amount.toString() },
      });
    });

    return this.loadInvoice(inv.id, organizationId, prisma);
  }

  private async loadQuote(id: string, organizationId: string, db: CommerceLookupDb) {
    const row = await db.quote.findFirst({
      where: ownedId(id, organizationId),
      include: QUOTE_INCLUDE,
    });
    if (!quoteBelongsToOrganization(row, organizationId)) throw new NotFoundException(QUOTE_NOT_FOUND);
    return this.serializeQuote(row as Parameters<CommerceService['serializeQuote']>[0]);
  }

  private async loadInvoice(id: string, organizationId: string, db: CommerceLookupDb) {
    const row = await db.invoice.findFirst({
      where: ownedId(id, organizationId),
      include: INVOICE_INCLUDE,
    });
    const inv = asInvoiceView(row, organizationId);
    if (!inv) throw new NotFoundException(INVOICE_NOT_FOUND);
    return this.serializeInvoice(inv);
  }

  private serializeInvoice(inv: InvoiceView) {
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
      nextHref: inv.balanceCentavos > 0n ? null : `/personas/${inv.accountId}`,
    };
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
