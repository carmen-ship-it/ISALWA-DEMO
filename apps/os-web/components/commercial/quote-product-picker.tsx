'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, SearchField, cx } from '@isalwa/ui';
import { QuantityStepper } from '@/components/commercial/quantity-stepper';
import { DEMO_PRICE_COPY, getDemoUnitPrice } from '@/lib/commercial/demo-starter-prices';
import { emptyProductSearchPort, SPECIAL_ITEM_LABEL } from '@/lib/commercial/product-picker';
import {
  ADD_LINE_HEADING,
  KNOWN_PRODUCT_MODE_LABEL,
  PRODUCT_DATA_HEADING,
  PRODUCT_FIELD_LABEL,
  SPECIAL_ITEM_HELPER,
  STARTER_LIST_COPY,
  STARTER_PRODUCT_CATEGORIES,
  UNIT_PRICE_LABEL,
  activeStarterQuoteProducts,
  blankLineEntry,
  prefillFromStarterProduct,
  starterProductByKey,
  type StarterLineEntry,
  type StarterProductCategory,
  type StarterQuoteProduct,
} from '@/lib/commercial/starter-quote-products';

const fieldClass =
  'mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const SPECIAL_ACTION_LABEL = '+ Agregar artículo especial';

type LineMode = 'known' | 'special';

type QuoteProductPickerProps = {
  organizationId: string;
  searchPort?: typeof emptyProductSearchPort;
  /** Demo fixture prices. Real must stay false so no synthetic price prefills. */
  demoPrices?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

function matchesProduct(product: StarterQuoteProduct, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('es');
  if (!q) return true;
  const haystack = [product.name, product.category, product.description ?? '']
    .join(' ')
    .toLocaleLowerCase('es');
  return haystack.includes(q);
}

export function QuoteProductPicker({
  organizationId: _organizationId,
  searchPort: _searchPort = emptyProductSearchPort,
  demoPrices = false,
  onReadyChange,
}: QuoteProductPickerProps) {
  const products = activeStarterQuoteProducts();
  const knownAvailable = products.length > 0;
  const [mode, setMode] = useState<LineMode>(knownAvailable ? 'known' : 'special');
  const [productKey, setProductKey] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<StarterProductCategory | 'Todas'>('Todas');
  const [entry, setEntry] = useState<StarterLineEntry>(blankLineEntry);

  const selected = mode === 'known' ? starterProductByKey(productKey) : null;
  const showFields = mode === 'special' || selected != null;
  const ready =
    entry.name.trim().length > 0 && (mode === 'special' || selected != null);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (category !== 'Todas' && product.category !== category) return false;
      return matchesProduct(product, search);
    });
  }, [products, category, search]);

  useEffect(() => {
    onReadyChange?.(ready);
  }, [onReadyChange, ready]);

  function applyEntry(next: StarterLineEntry) {
    setEntry(next);
  }

  function switchMode(next: LineMode) {
    if (next === 'known' && !knownAvailable) return;
    setMode(next);
    setProductKey('');
    setSearch('');
    setCategory('Todas');
    applyEntry(blankLineEntry());
  }

  function selectProduct(key: string) {
    setProductKey(key);
    setMode('known');
    const product = starterProductByKey(key);
    const demoUnitPrice = demoPrices ? getDemoUnitPrice(key) : null;
    applyEntry(product ? prefillFromStarterProduct(product, { demoUnitPrice }) : blankLineEntry());
  }

  function patch(partial: Partial<StarterLineEntry>) {
    setEntry((current) => ({ ...current, ...partial }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label={ADD_LINE_HEADING}>
        {knownAvailable ? (
          <Button
            type="button"
            variant={mode === 'known' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'known'}
            onClick={() => switchMode('known')}
          >
            {KNOWN_PRODUCT_MODE_LABEL}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={mode === 'special' ? 'primary' : 'secondary'}
          aria-pressed={mode === 'special'}
          onClick={() => switchMode('special')}
        >
          {mode === 'special' ? SPECIAL_ITEM_LABEL : SPECIAL_ACTION_LABEL}
        </Button>
      </div>

      {mode === 'known' ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{STARTER_LIST_COPY}</p>

          <div>
            <label htmlFor="quote-product-search" className="isalwa-section-label">
              Buscar producto
            </label>
            <SearchField
              id="quote-product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o categoría"
              className="mt-2"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías">
            <Chip type="button" active={category === 'Todas'} onClick={() => setCategory('Todas')}>
              Todas
            </Chip>
            {STARTER_PRODUCT_CATEGORIES.map((item) => (
              <Chip
                key={item}
                type="button"
                active={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </Chip>
            ))}
          </div>

          <div>
            <p className="isalwa-section-label">{PRODUCT_FIELD_LABEL}</p>
            <ul
              className="mt-2 max-h-64 overflow-y-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white"
              aria-label="Productos para cotizar"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-sm text-[var(--isalwa-slate)]">
                  Ningún producto coincide. Puede agregar un artículo especial.
                </li>
              ) : (
                filtered.map((product) => {
                  const active = product.key === productKey;
                  return (
                    <li key={product.key} className="border-b border-[var(--isalwa-mist)] last:border-b-0">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectProduct(product.key)}
                        className={cx(
                          'flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition-colors',
                          active
                            ? 'bg-[var(--isalwa-teal-100)]'
                            : 'hover:bg-[color-mix(in_srgb,var(--isalwa-sky-200)_55%,white)]',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--isalwa-kiln)]">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--isalwa-slate)]">
                            {product.category}
                            {product.description ? ` · ${product.description}` : ''}
                          </span>
                        </span>
                        <span
                          className={cx(
                            'shrink-0 text-xs font-medium',
                            active ? 'text-[var(--isalwa-glaze-deep)]' : 'text-[var(--isalwa-glaze)]',
                          )}
                        >
                          {active ? 'Seleccionado' : 'Agregar'}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {/* Keep a named productId for form posts; selection drives the value. */}
            <input type="hidden" name="productId" value={productKey} />
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{SPECIAL_ITEM_HELPER}</p>
      )}

      {showFields ? (
        <div className="space-y-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky-200)_35%,white)] p-4 md:p-5">
          <input type="hidden" name="lineKind" value={mode === 'known' ? 'catalog' : 'special'} />
          {mode === 'special' ? <input type="hidden" name="productId" value="" /> : null}
          {mode === 'known' ? (
            <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
              {PRODUCT_DATA_HEADING}
            </h3>
          ) : null}
          <div>
            <label htmlFor="quote-item-name" className="isalwa-section-label">
              Nombre
            </label>
            <input
              id="quote-item-name"
              name="itemName"
              required
              value={entry.name}
              onChange={(event) => patch({ name: event.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="quote-item-detail" className="isalwa-section-label">
              Detalle
            </label>
            <textarea
              id="quote-item-detail"
              name="itemDetail"
              rows={2}
              value={entry.detail}
              onChange={(event) => patch({ detail: event.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="quote-item-note" className="isalwa-section-label">
              Nota
            </label>
            <input
              id="quote-item-note"
              name="provenanceNote"
              value={entry.note}
              onChange={(event) => patch({ note: event.target.value })}
              className={fieldClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-qty" className="isalwa-section-label">
                Cantidad cotizada
              </label>
              <div className="mt-2">
                <QuantityStepper
                  id="new-qty"
                  name="quantity"
                  value={entry.quantity}
                  onChange={(quantity) => patch({ quantity })}
                />
              </div>
            </div>
            <div>
              <label htmlFor="new-unit" className="isalwa-section-label">
                Unidad
              </label>
              <input
                id="new-unit"
                name="unitLabel"
                value={entry.unit}
                onChange={(event) => patch({ unit: event.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="new-price" className="isalwa-section-label">
                {UNIT_PRICE_LABEL} (Bs.)
              </label>
              {demoPrices && mode === 'known' ? (
                <p
                  className="mt-2 rounded-[var(--isalwa-radius-control)] border border-[color-mix(in_srgb,var(--isalwa-warning)_28%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-warning)_10%,white)] px-3 py-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]"
                  role="note"
                >
                  {DEMO_PRICE_COPY}
                </p>
              ) : null}
              {!demoPrices && mode === 'known' ? (
                <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  Escriba el precio unitario. No se toma de un listado de precios.
                </p>
              ) : null}
              <input
                id="new-price"
                name="unitPrice"
                required
                value={entry.unitPrice}
                onChange={(event) => patch({ unitPrice: event.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
        </div>
      ) : (
        <input type="hidden" name="lineKind" value="" />
      )}
    </div>
  );
}
