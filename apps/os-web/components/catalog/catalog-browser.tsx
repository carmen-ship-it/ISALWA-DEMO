'use client';

import { useMemo, useState } from 'react';
import {
  Chip,
  ContextDrawer,
  EmptyState,
  Panel,
  SearchField,
  Skeleton,
  StatusPill,
} from '@isalwa/ui';
import {
  catalogSurface,
  labeledPriceContexts,
  productHasSourcedPrice,
  type CatalogCard,
} from '../../../../packages/os-catalog/src/browse';

const CATEGORY_LABEL: Record<string, string> = {
  sanitarios: 'Sanitarios',
  tanques: 'Tanques',
  lavamanos: 'Lavamanos',
  urinarios: 'Urinarios',
};

const REVIEW_LABEL: Record<string, string> = {
  spec_page: 'Ficha en página',
  dimensions_unspecified: 'Medidas no impresas',
  named_only: 'Solo nombre en página',
  comparison_row_only: 'Solo fila comparativa',
};

type SourcedEntry = {
  productId: string;
  context: 'Showroom' | 'Más de 10 unidades' | 'Calidad Segunda' | 'Viajes';
  amountCentavos: string;
  currency: 'BOB';
};

type CatalogBrowserProps = {
  status: 'loading' | 'ready' | 'denied';
  products: CatalogCard[];
  priceEntries: SourcedEntry[];
};

export function CatalogBrowser({ status, products, priceEntries }: CatalogBrowserProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const surface = useMemo(
    () => catalogSurface({ status, products, query, category }),
    [category, products, query, status],
  );
  const open = products.find((product) => product.id === openId) ?? null;
  const categories = [...new Set(products.map((product) => product.category))];

  if (surface.state === 'denied') {
    return (
      <EmptyState
        title="Sin permiso"
        description="No tiene permiso para ver productos de esta empresa."
      />
    );
  }

  if (surface.state === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Cargando productos…</p>
        <Skeleton h={72} rounded="panel" />
        <Skeleton h={72} rounded="panel" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchField
        id="productos-buscar"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre, categoría o detalle técnico"
        aria-label="Buscar productos"
        autoComplete="off"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
        <Chip active={category == null} onClick={() => setCategory(null)}>
          Todas
        </Chip>
        {categories.map((item) => (
          <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
            {CATEGORY_LABEL[item] ?? item}
          </Chip>
        ))}
      </div>

      {surface.state === 'empty' ? (
        <EmptyState
          title="Sin productos"
          description="Todavía no hay productos en esta vista. No se inventan."
        />
      ) : null}

      {surface.state === 'no-match' ? (
        <EmptyState
          title="Sin coincidencias"
          description="Ningún producto coincide con la búsqueda."
        />
      ) : null}

      {surface.state === 'ready' ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {surface.items.map((product) => (
            <li key={product.id}>
              <Panel className="h-full p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[var(--isalwa-text-md)] font-semibold text-[var(--isalwa-kiln)]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                      {CATEGORY_LABEL[product.category] ?? product.category}
                    </p>
                  </div>
                  <ProductCardExceptions productId={product.id} entries={priceEntries} />
                </div>
                <button
                  type="button"
                  className="mt-4 text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-kiln)] underline-offset-2 hover:underline"
                  onClick={() => setOpenId(product.id)}
                >
                  Ver ficha
                </button>
              </Panel>
            </li>
          ))}
        </ul>
      ) : null}

      <ContextDrawer
        open={open != null}
        title={open?.name ?? 'Producto'}
        onClose={() => setOpenId(null)}
      >
        {open ? (
          <ProductQuickView product={open} entries={priceEntries} />
        ) : null}
      </ContextDrawer>
    </div>
  );
}

function ProductCardExceptions({
  productId,
  entries,
}: {
  productId: string;
  entries: SourcedEntry[];
}) {
  const sourced = productHasSourcedPrice(entries, productId);
  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <StatusPill tone="neutral">Sin código comercial</StatusPill>
      {!sourced ? (
        <StatusPill tone="muted">Precio no disponible</StatusPill>
      ) : (
        <StatusPill tone="manual">Precio con origen</StatusPill>
      )}
    </div>
  );
}

function ProductQuickView({
  product,
  entries,
}: {
  product: CatalogCard;
  entries: SourcedEntry[];
}) {
  const contexts = labeledPriceContexts(entries, product.id);
  return (
    <div className="space-y-4">
      <StatusPill tone={product.reviewStatus === 'spec_page' ? 'info' : 'warning'}>
        {REVIEW_LABEL[product.reviewStatus] ?? product.reviewStatus}
      </StatusPill>
      {product.description ? (
        <p className="text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
          {product.description}
        </p>
      ) : null}
      <div>
        <p className="isalwa-section-label">Precio de origen</p>
        {productHasSourcedPrice(entries, product.id) ? (
          <ul className="mt-2 m-0 list-none space-y-2 p-0">
            {contexts
              .filter((item) => item.amountCentavos)
              .map((item) => (
                <li key={item.context}>
                  <p className="font-medium text-[var(--isalwa-kiln)]">{item.context}</p>
                  <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{item.meaning}</p>
                </li>
              ))}
          </ul>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
              Precio no disponible. Hay contextos, pero sin monto con origen.
            </p>
            <ul className="m-0 list-none space-y-2 p-0">
              {contexts.map((item) => (
                <li key={item.context}>
                  <p className="font-medium text-[var(--isalwa-kiln)]">{item.context}</p>
                  <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{item.meaning}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <details className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
        <summary className="cursor-pointer text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-kiln)]">
          Detalle técnico
        </summary>
        {product.attributeValues.length === 0 ? (
          <p className="mt-2 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
            No hay medidas impresas en la ficha.
          </p>
        ) : (
          <ul className="mt-2 m-0 list-none space-y-1 p-0">
            {product.attributeValues.map((value) => (
              <li key={value} className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                {value}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

function formatFixtureCentavos(centavos: string | null): string {
  if (!centavos || !/^\d+$/.test(centavos)) return '—';
  const value = BigInt(centavos);
  const whole = value / BigInt(100);
  const frac = (value % BigInt(100)).toString().padStart(2, '0');
  return `Bs. ${whole.toString()},${frac}`;
}
