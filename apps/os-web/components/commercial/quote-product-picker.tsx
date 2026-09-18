'use client';

import { useEffect, useState } from 'react';
import { Button } from '@isalwa/ui';
import { DEMO_PRICE_COPY, getDemoUnitPrice } from '@/lib/commercial/demo-starter-prices';
import { emptyProductSearchPort, SPECIAL_ITEM_LABEL } from '@/lib/commercial/product-picker';
import {
  ADD_LINE_HEADING,
  KNOWN_PRODUCT_MODE_LABEL,
  PRODUCT_DATA_HEADING,
  PRODUCT_FIELD_LABEL,
  PRODUCT_PLACEHOLDER,
  SPECIAL_ITEM_HELPER,
  STARTER_LIST_COPY,
  STARTER_PRODUCT_CATEGORIES,
  UNIT_PRICE_LABEL,
  activeStarterQuoteProducts,
  starterProductsByCategory,
  blankLineEntry,
  prefillFromStarterProduct,
  starterProductByKey,
  type StarterLineEntry,
} from '@/lib/commercial/starter-quote-products';

const fieldClass =
  'mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type LineMode = 'known' | 'special';

type QuoteProductPickerProps = {
  organizationId: string;
  searchPort?: typeof emptyProductSearchPort;
  /** Demo fixture prices. Real must stay false so no synthetic price prefills. */
  demoPrices?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

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
  const [entry, setEntry] = useState<StarterLineEntry>(blankLineEntry);

  const selected = mode === 'known' ? starterProductByKey(productKey) : null;
  const showFields = mode === 'special' || selected != null;
  const ready =
    entry.name.trim().length > 0 && (mode === 'special' || selected != null);

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
    applyEntry(blankLineEntry());
  }

  function selectProduct(key: string) {
    setProductKey(key);
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
          {SPECIAL_ITEM_LABEL}
        </Button>
      </div>

      {mode === 'known' ? (
        <div>
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{STARTER_LIST_COPY}</p>
          <label htmlFor="quote-starter-product" className="isalwa-section-label mt-4 block">
            {PRODUCT_FIELD_LABEL}
          </label>
          <select
            id="quote-starter-product"
            className={fieldClass}
            value={productKey}
            onChange={(event) => selectProduct(event.target.value)}
          >
            <option value="">{PRODUCT_PLACEHOLDER}</option>
            {STARTER_PRODUCT_CATEGORIES.map((category) => (
              <optgroup key={category} label={category}>
                {starterProductsByCategory(category).map((product) => (
                  <option key={product.key} value={product.key}>
                    {product.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{SPECIAL_ITEM_HELPER}</p>
      )}

      {showFields ? (
        <div className="space-y-4 border-t border-[var(--isalwa-mist)] pt-5">
          <input type="hidden" name="lineKind" value={mode === 'known' ? 'catalog' : 'special'} />
          <input type="hidden" name="productId" value={mode === 'known' ? productKey : ''} />
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
              rows={3}
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
                Cantidad
              </label>
              <input
                id="new-qty"
                name="quantity"
                required
                inputMode="numeric"
                value={entry.quantity}
                onChange={(event) => patch({ quantity: event.target.value })}
                className={fieldClass}
              />
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
            <div>
              <label htmlFor="new-price" className="isalwa-section-label">
                {UNIT_PRICE_LABEL}
              </label>
              {demoPrices && mode === 'known' ? (
                <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">{DEMO_PRICE_COPY}</p>
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
