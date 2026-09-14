import { PRICE_CONTEXTS, PRICE_CONTEXT_MEANINGS, type PriceContext } from '../../os-contracts/src/price-list';

export type CatalogCard = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  businessCode: string | null;
  reviewStatus: string;
  attributeValues: string[];
  aliases: string[];
};

export type CatalogSurface =
  | 'loading'
  | 'denied'
  | 'empty'
  | 'no-match'
  | 'ready';

export function catalogSurface(input: {
  status: 'loading' | 'ready' | 'denied';
  products: readonly CatalogCard[];
  query: string;
  category: string | null;
}): { state: CatalogSurface; items: CatalogCard[] } {
  if (input.status === 'denied') return { state: 'denied', items: [] };
  if (input.status === 'loading') return { state: 'loading', items: [] };
  if (input.products.length === 0) return { state: 'empty', items: [] };

  const needle = input.query.trim().toLowerCase();
  const items = input.products.filter((product) => {
    if (input.category && product.category !== input.category) return false;
    if (needle.length < 2) return true;
    const haystack = [
      product.name,
      product.category,
      product.description ?? '',
      ...product.aliases,
      ...product.attributeValues,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
  return { state: items.length === 0 ? 'no-match' : 'ready', items };
}

export function labeledPriceContexts(
  entries: readonly { productId: string; context: PriceContext; amountCentavos: string }[],
  productId: string,
): Array<{ context: PriceContext; meaning: string; amountCentavos: string | null }> {
  const mine = entries.filter((entry) => entry.productId === productId);
  return PRICE_CONTEXTS.map((context) => ({
    context,
    meaning: PRICE_CONTEXT_MEANINGS[context],
    amountCentavos: mine.find((entry) => entry.context === context)?.amountCentavos ?? null,
  }));
}

export function productHasSourcedPrice(
  entries: readonly { productId: string }[],
  productId: string,
): boolean {
  return entries.some((entry) => entry.productId === productId);
}
