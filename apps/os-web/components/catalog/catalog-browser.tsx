'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Chip, EmptyState, Panel, SearchField, StatusPill } from '@isalwa/ui';
import { catalogSurface } from '../../../../packages/os-catalog/src/browse';
import type {
  CatalogProductCard,
  FieldSource,
  PriceDisplay,
} from '../../../../packages/os-catalog/src/presentation';
import type { ProductCategory } from '../../../../packages/os-contracts/src/product-catalog';
import { CATALOG_COPY } from '@/lib/catalog/copy';
import { formatBobDisplay } from '@/lib/experience/format';

type CatalogBrowserProps = {
  cards: CatalogProductCard[];
  categories: Array<{ key: ProductCategory; label: string }>;
};

export function CatalogBrowser({ cards, categories }: CatalogBrowserProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);

  const surface = useMemo(
    () => catalogSurface({ status: 'ready', products: cards, query, category, activeOnly }),
    [activeOnly, cards, category, query],
  );

  return (
    <div className="space-y-4">
      <SearchField
        id="productos-buscar"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={CATALOG_COPY.searchPlaceholder}
        aria-label={CATALOG_COPY.searchLabel}
        autoComplete="off"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label={CATALOG_COPY.categoryGroupLabel}>
        <Chip active={category == null} onClick={() => setCategory(null)}>
          {CATALOG_COPY.allCategories}
        </Chip>
        {categories.map((item) => (
          <Chip key={item.key} active={category === item.key} onClick={() => setCategory(item.key)}>
            {item.label}
          </Chip>
        ))}
        <Chip active={activeOnly} onClick={() => setActiveOnly((value) => !value)}>
          {CATALOG_COPY.activeOnly}
        </Chip>
      </div>

      {surface.state === 'empty' ? (
        <EmptyState title={CATALOG_COPY.emptyTitle} description={CATALOG_COPY.emptyDescription} />
      ) : null}

      {surface.state === 'no-match' ? (
        <EmptyState title={CATALOG_COPY.noMatchTitle} description={CATALOG_COPY.noMatchDescription} />
      ) : null}

      {surface.state === 'ready' ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {surface.items.map((card) => (
            <li key={card.id}>
              <CatalogProductCardView card={card} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CatalogProductCardView({ card }: { card: CatalogProductCard }) {
  return (
    <Panel className="flex h-full flex-col overflow-hidden p-0">
      {card.approvedImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- approved image URLs are not known at build time
        <img
          src={card.approvedImage.src}
          alt={card.approvedImage.alt}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : null}
      <div className="bg-[var(--isalwa-teal-100)] px-4 py-3">
        <h3 className="m-0 text-[var(--isalwa-text-md)] font-semibold text-[var(--isalwa-kiln)]">
          {card.name}
        </h3>
        <p className="mt-1 inline-flex rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-sky)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--isalwa-kiln)] uppercase">
          {card.categoryLabel}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <p className="m-0 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{card.variantsLabel}</p>
        <CatalogPrice display={card.priceDisplay} />
        {card.pendingFieldCount > 0 ? (
          <StatusPill tone="warning">{CATALOG_COPY.pendingFields(card.pendingFieldCount)}</StatusPill>
        ) : null}
        <p className="m-0 mt-auto text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
          {CATALOG_COPY.sourceLabel}: {summarizeSources(card.nameSources)}
        </p>
      </div>
      <div className="px-4 pb-4">
        <Link
          href={card.href}
          className="inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--isalwa-glaze)]"
          aria-label={`Ver ficha: ${card.name}`}
        >
          Ver ficha
        </Link>
      </div>
    </Panel>
  );
}

export function CatalogPrice({ display }: { display: PriceDisplay }) {
  if (display.kind === 'to_confirm') {
    return <StatusPill tone="muted">{display.label}</StatusPill>;
  }
  return (
    <ul className="m-0 list-none space-y-1 p-0">
      {display.entries.map((entry) => (
        <li key={`${entry.priceListId}-${entry.context}`} className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)]">
          <span className="font-semibold">{formatBobDisplay(entry.amountCentavos)}</span> · {entry.context}
        </li>
      ))}
    </ul>
  );
}

function summarizeSources(sources: FieldSource[]): string {
  const pages = new Map<string, number[]>();
  for (const source of sources) {
    if (source.page === null) continue;
    pages.set(source.document, [...(pages.get(source.document) ?? []), source.page]);
  }
  if (pages.size === 0) return sources[0] ? sources[0].document : '—';
  return [...pages.entries()]
    .map(([document, list]) => `${document} p. ${[...new Set(list)].sort((a, b) => a - b).join(', ')}`)
    .join(' · ');
}
