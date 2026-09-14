/**
 * Versioned price list. Not a field on Product.
 * Not exported from the package barrel in this lane.
 * Do not invent an amount. A PriceEntry exists only when a source prints an amount
 * with an explicit context. The advisor quoted price is not a list price.
 */

import { z } from 'zod';
import {
  resolveCatalogRead,
  type CatalogReadDecision,
  type CatalogResource,
  type CatalogSession,
} from './product-catalog';

export const PRICE_LIST_SCHEMA_VERSION = '1' as const;
export const PRICE_CURRENCY = 'BOB' as const;

/** Printed contexts. Do not rename or add a fifth. */
export const PRICE_CONTEXTS = [
  'Showroom',
  'Más de 10 unidades',
  'Calidad Segunda',
  'Viajes',
] as const;

export type PriceContext = (typeof PRICE_CONTEXTS)[number];

export const PRICE_CONTEXT_MEANINGS: Record<PriceContext, string> = {
  Showroom: 'Venta de showroom',
  'Más de 10 unidades': 'Cantidad mayor a 10',
  'Calidad Segunda': 'Producto imperfecto',
  Viajes: 'Ventas de viaje (Trópico y otras ubicaciones)',
};

export const SHOWROOM_CONTEXT: PriceContext = 'Showroom';
export const QUANTITY_CONTEXT: PriceContext = 'Más de 10 unidades';
export const QUANTITY_CONTEXT_ABOVE = 10;

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const PriceSourceSchema = z
  .object({
    filename: z.string().min(1),
    sha256: Sha256,
    page: z.number().int().positive().nullable(),
    printedContext: z.string().min(1),
    excerpt: z.string().min(1),
  })
  .strict();

export type PriceSource = z.infer<typeof PriceSourceSchema>;

export const PriceListSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    version: z.string().min(1),
    currency: z.literal(PRICE_CURRENCY),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().nullable(),
    source: PriceSourceSchema,
  })
  .strict();

export type PriceList = z.infer<typeof PriceListSchema>;

export const PriceEntrySchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    priceListId: z.string().min(1),
    productId: z.string().min(1),
    context: z.enum(PRICE_CONTEXTS),
    currency: z.literal(PRICE_CURRENCY),
    amountCentavos: z.string().regex(/^[1-9]\d*$/),
    source: PriceSourceSchema,
  })
  .strict();

export type PriceEntry = z.infer<typeof PriceEntrySchema>;

export const PRICE_MATCH_REVIEW = 'REVIEW_REQUIRED' as const;

export const PriceMatchReviewSchema = z
  .object({
    status: z.literal(PRICE_MATCH_REVIEW),
    reason: z.string().min(1),
    productId: z.string().min(1).nullable(),
    context: z.enum(PRICE_CONTEXTS).nullable(),
    sourceFilename: z.string().min(1).nullable(),
    page: z.number().int().positive().nullable(),
    excerpt: z.string().min(1).nullable(),
  })
  .strict();

export type PriceMatchReview = z.infer<typeof PriceMatchReviewSchema>;

export type PrintedPriceObservation = {
  sourceFilename: string;
  sourceSha256: string;
  page: number | null;
  excerpt: string;
  printedContext: string | null;
  amountCentavos: string | null;
  productId: string | null;
};

const AMOUNT_IN_TEXT = /(?:bs\.?|bob)\s*\d|\d[\d.]*,\d{2}/i;

export function observationHasExplicitAmount(observation: PrintedPriceObservation): boolean {
  if (!observation.amountCentavos || !/^[1-9]\d*$/.test(observation.amountCentavos)) return false;
  return AMOUNT_IN_TEXT.test(observation.excerpt);
}

export function observationHasExplicitContext(
  observation: PrintedPriceObservation,
): observation is PrintedPriceObservation & { printedContext: PriceContext } {
  if (!observation.printedContext) return false;
  if (!(PRICE_CONTEXTS as readonly string[]).includes(observation.printedContext)) return false;
  const label = observation.printedContext;
  return observation.excerpt.includes(label) || observation.excerpt.toLowerCase().includes(label.toLowerCase());
}

export function applicablePriceContext(quantity: number): PriceContext {
  return quantity > QUANTITY_CONTEXT_ABOVE ? QUANTITY_CONTEXT : SHOWROOM_CONTEXT;
}

/**
 * Quantity above 10 can select Más de 10 unidades.
 * Calidad Segunda and Viajes are chosen only when the caller names that context.
 * A missing entry is null. It is not replaced by another context's amount.
 */
export function selectApplicablePriceEntry(
  entries: readonly PriceEntry[],
  quantity: number,
  context?: PriceContext | null,
): PriceEntry | null {
  const chosen = context ?? applicablePriceContext(quantity);
  return entries.find((entry) => entry.context === chosen) ?? null;
}

export type QuotedPriceGovernance = {
  /** The typed amount is never stored or labeled as a list price. */
  quotedIsListPrice: false;
  blocksQuote: false;
  approval: 'not_applicable' | 'not_required' | 'pending';
  governedCentavos: string | null;
};

/**
 * Below a governed source price is pending approval.
 * The threshold is that comparison only. No governed price is not invented and does not block.
 */
export function governQuotedPrice(input: {
  quotedCentavos: string | null;
  governedCentavos: string | null;
}): QuotedPriceGovernance {
  const governed = input.governedCentavos?.trim() || null;
  if (!governed) {
    return {
      quotedIsListPrice: false,
      blocksQuote: false,
      approval: 'not_applicable',
      governedCentavos: null,
    };
  }
  const quoted = input.quotedCentavos?.trim() || null;
  const pending =
    quoted != null &&
    /^[0-9]+$/.test(quoted) &&
    /^[1-9]\d*$/.test(governed) &&
    BigInt(quoted) < BigInt(governed);
  return {
    quotedIsListPrice: false,
    blocksQuote: false,
    approval: pending ? 'pending' : 'not_required',
    governedCentavos: governed,
  };
}

export type PriceMatchResult = {
  entries: PriceEntry[];
  reviews: PriceMatchReview[];
};

/**
 * Creates a PriceEntry only when the observation prints an amount and an explicit context.
 * Anything else is REVIEW_REQUIRED and does not become a price.
 */
export function matchPriceObservation(
  observation: PrintedPriceObservation,
  priceList: Pick<PriceList, 'id' | 'organizationId' | 'currency'>,
  entryId: string,
): PriceMatchResult {
  const reviewBase = {
    status: PRICE_MATCH_REVIEW,
    productId: observation.productId,
    context: null as PriceContext | null,
    sourceFilename: observation.sourceFilename,
    page: observation.page,
    excerpt: observation.excerpt || null,
  };

  if (!observationHasExplicitAmount(observation) || !observationHasExplicitContext(observation)) {
    return {
      entries: [],
      reviews: [
        PriceMatchReviewSchema.parse({
          ...reviewBase,
          reason: 'No printed amount with an explicit price context. No price entry was created.',
          context: observationHasExplicitContext(observation) ? observation.printedContext : null,
        }),
      ],
    };
  }
  if (!observation.productId) {
    return {
      entries: [],
      reviews: [
        PriceMatchReviewSchema.parse({
          ...reviewBase,
          reason: 'Amount and context were printed, but no reviewed product matched. No price entry was created.',
          context: observation.printedContext,
        }),
      ],
    };
  }

  const entry = PriceEntrySchema.parse({
    id: entryId,
    organizationId: priceList.organizationId,
    priceListId: priceList.id,
    productId: observation.productId,
    context: observation.printedContext,
    currency: priceList.currency,
    amountCentavos: observation.amountCentavos,
    source: {
      filename: observation.sourceFilename,
      sha256: observation.sourceSha256,
      page: observation.page,
      printedContext: observation.printedContext,
      excerpt: observation.excerpt,
    },
  });
  return { entries: [entry], reviews: [] };
}

export type AccessDenied = {
  ok: false;
  denial: Exclude<CatalogReadDecision, { allowed: true }>['denial'];
};

export type AccessAllowed<T> = {
  ok: true;
  organizationId: string;
  value: T;
};

export type AccessResult<T> = AccessAllowed<T> | AccessDenied;

export type IsolatedProduct = {
  id: string;
  organizationId: string;
  businessCode: string | null;
  name: string;
  category: string;
  description: string | null;
  aliases: string[];
  attributeValues: string[];
};

export type CatalogDashboard = {
  productCount: number;
  priceListCount: number;
  priceEntryCount: number;
  priceEntryAmountCentavosTotal: string;
};

const SUGGESTION_LIMIT = 8;
const RECENT_LIMIT = 5;

function denied(decision: Exclude<CatalogReadDecision, { allowed: true }>): AccessDenied {
  return { ok: false, denial: decision.denial };
}

function gate(
  session: CatalogSession | null | undefined,
  requestedOrganizationId?: string | null,
): AccessResult<never> | { ok: true; organizationId: string } {
  const decision = resolveCatalogRead(session, requestedOrganizationId);
  if (!decision.allowed) return denied(decision);
  return { ok: true, organizationId: decision.organizationId };
}

function matches(haystack: string, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (needle.length < 2) return false;
  return haystack.toLowerCase().includes(needle);
}

function productHaystack(product: IsolatedProduct): string {
  return [product.name, product.category, product.description ?? '', ...product.aliases, ...product.attributeValues]
    .join(' ');
}

function listHaystack(list: PriceList): string {
  return [list.version, list.source.filename, list.source.excerpt, list.source.printedContext].join(' ');
}

function entryHaystack(entry: PriceEntry, product: IsolatedProduct | undefined): string {
  return [entry.context, entry.amountCentavos, product?.name ?? '', product?.category ?? ''].join(' ');
}

function sumCentavos(entries: readonly PriceEntry[]): string {
  return entries.reduce((total, entry) => total + BigInt(entry.amountCentavos), BigInt(0)).toString();
}

/**
 * In-memory tenant store. Does not import a database and does not invent a Vitri price.
 * Search, suggestions, quick view, recent, and dashboard never include another tenant.
 */
export class TenantCommercialCatalog {
  private readonly products: IsolatedProduct[] = [];
  private readonly lists: PriceList[] = [];
  private readonly entries: PriceEntry[] = [];
  private readonly recentKeys: Record<CatalogResource, string[]> = {
    product: [],
    price_list: [],
    price_entry: [],
  };

  registerProduct(product: IsolatedProduct): void {
    if (!product.organizationId.trim() || !product.id.trim() || !product.name.trim()) {
      throw new Error('invalid_product');
    }
    this.products.push({ ...product, businessCode: product.businessCode });
    this.remember('product', product.organizationId, product.id);
  }

  registerPriceList(list: PriceList): void {
    const parsed = PriceListSchema.parse(list);
    this.lists.push(parsed);
    this.remember('price_list', parsed.organizationId, parsed.id);
  }

  registerPriceEntry(entry: PriceEntry): void {
    const parsed = PriceEntrySchema.parse(entry);
    const list = this.lists.find(
      (item) => item.organizationId === parsed.organizationId && item.id === parsed.priceListId,
    );
    if (!list) throw new Error('price_list_not_in_organization');
    const product = this.products.find(
      (item) => item.organizationId === parsed.organizationId && item.id === parsed.productId,
    );
    if (!product) throw new Error('product_not_in_organization');
    this.entries.push(parsed);
    this.remember('price_entry', parsed.organizationId, parsed.id);
  }

  readProduct(
    session: CatalogSession | null | undefined,
    productId: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<IsolatedProduct | null> {
    return this.readOne('product', session, productId, requestedOrganizationId);
  }

  readPriceList(
    session: CatalogSession | null | undefined,
    priceListId: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<PriceList | null> {
    return this.readOne('price_list', session, priceListId, requestedOrganizationId);
  }

  readPriceEntry(
    session: CatalogSession | null | undefined,
    priceEntryId: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<PriceEntry | null> {
    return this.readOne('price_entry', session, priceEntryId, requestedOrganizationId);
  }

  search(
    session: CatalogSession | null | undefined,
    resource: CatalogResource,
    text: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<Array<{ id: string; label: string }>> {
    const opened = gate(session, requestedOrganizationId);
    if (!opened.ok) return opened;
    return {
      ok: true,
      organizationId: opened.organizationId,
      value: this.matchResource(opened.organizationId, resource, text).map((item) => ({
        id: item.id,
        label: item.label,
      })),
    };
  }

  suggest(
    session: CatalogSession | null | undefined,
    resource: CatalogResource,
    text: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<Array<{ id: string; label: string }>> {
    const found = this.search(session, resource, text, requestedOrganizationId);
    if (!found.ok) return found;
    return { ...found, value: found.value.slice(0, SUGGESTION_LIMIT) };
  }

  quickView(
    session: CatalogSession | null | undefined,
    resource: CatalogResource,
    id: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<Record<string, unknown> | null> {
    const opened = gate(session, requestedOrganizationId);
    if (!opened.ok) return opened;
    const row = this.rowInOrg(opened.organizationId, resource, id);
    if (!row) return { ok: true, organizationId: opened.organizationId, value: null };
    if (resource === 'product') {
      const product = row as IsolatedProduct;
      return {
        ok: true,
        organizationId: opened.organizationId,
        value: {
          id: product.id,
          name: product.name,
          category: product.category,
          businessCode: product.businessCode,
          description: product.description,
          attributes: product.attributeValues,
          priceEntries: this.entries
            .filter((entry) => entry.organizationId === opened.organizationId && entry.productId === product.id)
            .map(publicEntry),
        },
      };
    }
    if (resource === 'price_list') {
      const list = row as PriceList;
      return {
        ok: true,
        organizationId: opened.organizationId,
        value: {
          id: list.id,
          version: list.version,
          currency: list.currency,
          effectiveFrom: list.effectiveFrom,
          entries: this.entries
            .filter((entry) => entry.organizationId === opened.organizationId && entry.priceListId === list.id)
            .map(publicEntry),
        },
      };
    }
    return {
      ok: true,
      organizationId: opened.organizationId,
      value: publicEntry(row as PriceEntry),
    };
  }

  recent(
    session: CatalogSession | null | undefined,
    resource: CatalogResource,
    requestedOrganizationId?: string | null,
  ): AccessResult<Array<{ id: string; label: string }>> {
    const opened = gate(session, requestedOrganizationId);
    if (!opened.ok) return opened;
    const items = this.recentKeys[resource]
      .filter((key) => key.startsWith(`${opened.organizationId}\0`))
      .slice(-RECENT_LIMIT)
      .reverse()
      .map((key) => key.split('\0')[1] ?? '')
      .map((id) => this.rowInOrg(opened.organizationId, resource, id))
      .filter((row): row is IsolatedProduct | PriceList | PriceEntry => row != null)
      .map((row) => ({
        id: row.id,
        label: 'name' in row ? row.name : 'version' in row ? row.version : row.context,
      }));
    return { ok: true, organizationId: opened.organizationId, value: items };
  }

  dashboard(
    session: CatalogSession | null | undefined,
    requestedOrganizationId?: string | null,
  ): AccessResult<CatalogDashboard> {
    const opened = gate(session, requestedOrganizationId);
    if (!opened.ok) return opened;
    const entries = this.entries.filter((entry) => entry.organizationId === opened.organizationId);
    return {
      ok: true,
      organizationId: opened.organizationId,
      value: {
        productCount: this.products.filter((item) => item.organizationId === opened.organizationId).length,
        priceListCount: this.lists.filter((item) => item.organizationId === opened.organizationId).length,
        priceEntryCount: entries.length,
        priceEntryAmountCentavosTotal: sumCentavos(entries),
      },
    };
  }

  private readOne<T extends IsolatedProduct | PriceList | PriceEntry>(
    resource: CatalogResource,
    session: CatalogSession | null | undefined,
    id: string,
    requestedOrganizationId?: string | null,
  ): AccessResult<T | null> {
    const opened = gate(session, requestedOrganizationId);
    if (!opened.ok) return opened;
    const row = this.rowInOrg(opened.organizationId, resource, id) as T | null;
    return { ok: true, organizationId: opened.organizationId, value: row };
  }

  private rowInOrg(
    organizationId: string,
    resource: CatalogResource,
    id: string,
  ): IsolatedProduct | PriceList | PriceEntry | null {
    if (resource === 'product') {
      return this.products.find((item) => item.organizationId === organizationId && item.id === id) ?? null;
    }
    if (resource === 'price_list') {
      return this.lists.find((item) => item.organizationId === organizationId && item.id === id) ?? null;
    }
    return this.entries.find((item) => item.organizationId === organizationId && item.id === id) ?? null;
  }

  private matchResource(
    organizationId: string,
    resource: CatalogResource,
    text: string,
  ): Array<{ id: string; label: string }> {
    if (resource === 'product') {
      return this.products
        .filter((item) => item.organizationId === organizationId && matches(productHaystack(item), text))
        .map((item) => ({ id: item.id, label: item.name }));
    }
    if (resource === 'price_list') {
      return this.lists
        .filter((item) => item.organizationId === organizationId && matches(listHaystack(item), text))
        .map((item) => ({ id: item.id, label: item.version }));
    }
    return this.entries
      .filter((item) => item.organizationId === organizationId)
      .filter((item) =>
        matches(
          entryHaystack(
            item,
            this.products.find(
              (product) => product.organizationId === organizationId && product.id === item.productId,
            ),
          ),
          text,
        ),
      )
      .map((item) => ({ id: item.id, label: item.context }));
  }

  private remember(resource: CatalogResource, organizationId: string, id: string): void {
    this.recentKeys[resource].push(`${organizationId}\0${id}`);
  }
}

function publicEntry(entry: PriceEntry): Record<string, unknown> {
  return {
    id: entry.id,
    productId: entry.productId,
    context: entry.context,
    currency: entry.currency,
    amountCentavos: entry.amountCentavos,
  };
}
