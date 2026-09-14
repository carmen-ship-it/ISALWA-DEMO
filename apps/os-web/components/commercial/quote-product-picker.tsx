'use client';

import { useEffect, useState } from 'react';
import { Button, SearchField } from '@isalwa/ui';
import {
  ADD_LINE_NEXT_ACTION,
  CATALOG_NO_MATCH_COPY,
  CATALOG_SEARCH_LABEL,
  CATALOG_UNAVAILABLE_COPY,
  QUOTED_PRICE_HINT,
  QUOTED_PRICE_LABEL,
  SNAPSHOT_NOTE,
  SPECIAL_ITEM_LABEL,
  catalogIsAvailable,
  emptyProductSearchPort,
  searchCatalog,
  type CatalogProductHit,
  type ProductSearchPort,
} from '@/lib/commercial/product-picker';

const fieldClass =
  'mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type QuoteProductPickerProps = {
  organizationId: string;
  searchPort?: ProductSearchPort;
  onReadyChange?: (ready: boolean) => void;
};

type Selection =
  | { kind: 'catalog'; productId: string; name: string; detail: string }
  | { kind: 'special'; name: string; detail: string; note: string };

export function QuoteProductPicker({
  organizationId,
  searchPort = emptyProductSearchPort,
  onReadyChange,
}: QuoteProductPickerProps) {
  const catalogReady = catalogIsAvailable(searchPort);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CatalogProductHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  const ready = selection != null && selection.name.trim().length > 0;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [onReadyChange, ready]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setHits([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void searchCatalog(searchPort, { organizationId, text }).then((rows) => {
        if (cancelled) return;
        setHits(rows);
        setSearched(true);
        setSearching(false);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [organizationId, query, searchPort]);

  function selectHit(hit: CatalogProductHit) {
    setSelection({
      kind: 'catalog',
      productId: hit.productId,
      name: hit.name,
      detail: hit.description,
    });
    setQuery('');
    setHits([]);
    setSearched(false);
  }

  function startSpecial() {
    if (selection?.kind === 'special') return;
    setSelection({ kind: 'special', name: '', detail: '', note: '' });
    setQuery('');
    setHits([]);
    setSearched(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{ADD_LINE_NEXT_ACTION}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={catalogReady ? 'secondary' : 'primary'}
          aria-pressed={selection?.kind === 'special'}
          onClick={startSpecial}
        >
          {SPECIAL_ITEM_LABEL}
        </Button>
      </div>

      <div>
        <label htmlFor="quote-product-search" className="isalwa-section-label">
          {CATALOG_SEARCH_LABEL}
        </label>
        <SearchField
          id="quote-product-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selection?.kind === 'catalog') setSelection(null);
          }}
          placeholder="Nombre del producto"
          autoComplete="off"
          className="mt-2"
        />
        {catalogReady ? null : (
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{CATALOG_UNAVAILABLE_COPY}</p>
        )}
      </div>

      <div aria-live="polite">
        {searching ? <p className="text-sm text-[var(--isalwa-slate)]">Buscando…</p> : null}
        {catalogReady && searched && hits.length === 0 ? (
          <p className="text-sm text-[var(--isalwa-slate)]">{CATALOG_NO_MATCH_COPY}</p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Productos">
            {hits.map((hit) => (
              <li key={hit.productId}>
                <button
                  type="button"
                  className="w-full py-3 text-left"
                  onClick={() => selectHit(hit)}
                  aria-pressed={selection?.kind === 'catalog' && selection.productId === hit.productId}
                >
                  <span className="block font-medium text-[var(--isalwa-kiln)]">{hit.name}</span>
                  {hit.category ? (
                    <span className="mt-1 block text-sm text-[var(--isalwa-slate)]">{hit.category}</span>
                  ) : null}
                  {hit.description ? (
                    <span className="mt-1 block text-sm text-[var(--isalwa-slate)]">{hit.description}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selection ? (
        <div className="space-y-4 border-t border-[var(--isalwa-mist)] pt-5">
          <input type="hidden" name="lineKind" value={selection.kind} />
          <input
            type="hidden"
            name="productId"
            value={selection.kind === 'catalog' ? selection.productId : ''}
          />
          {selection.kind === 'catalog' ? (
            <p className="text-sm text-[var(--isalwa-slate)]">{SNAPSHOT_NOTE}</p>
          ) : (
            <p className="text-sm text-[var(--isalwa-slate)]">{SPECIAL_ITEM_LABEL}</p>
          )}
          <div>
            <label htmlFor="quote-item-name" className="isalwa-section-label">
              Nombre
            </label>
            <input
              id="quote-item-name"
              name="itemName"
              required
              value={selection.name}
              onChange={(event) => setSelection({ ...selection, name: event.target.value })}
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
              value={selection.detail}
              onChange={(event) => setSelection({ ...selection, detail: event.target.value })}
              className={fieldClass}
            />
          </div>
          {selection.kind === 'special' ? (
            <div>
              <label htmlFor="quote-item-note" className="isalwa-section-label">
                Nota
              </label>
              <input
                id="quote-item-note"
                name="provenanceNote"
                value={selection.note}
                onChange={(event) => setSelection({ ...selection, note: event.target.value })}
                className={fieldClass}
              />
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                Opcional. Queda como origen de este ítem.
              </p>
            </div>
          ) : (
            <input type="hidden" name="provenanceNote" value="" />
          )}
          {selection.kind === 'special' ? (
            <p className="text-sm text-[var(--isalwa-slate)]">{SNAPSHOT_NOTE}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-qty" className="isalwa-section-label">
                Cantidad
              </label>
              <input id="new-qty" name="quantity" required defaultValue="1" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="new-unit" className="isalwa-section-label">
                Unidad
              </label>
              <input id="new-unit" name="unitLabel" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="new-price" className="isalwa-section-label">
                {QUOTED_PRICE_LABEL}
              </label>
              <input id="new-price" name="unitPrice" required className={fieldClass} />
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{QUOTED_PRICE_HINT}</p>
            </div>
            <div>
              <label htmlFor="new-disc" className="isalwa-section-label">
                Descuento (Bs.)
              </label>
              <input id="new-disc" name="discount" className={fieldClass} />
            </div>
          </div>
        </div>
      ) : (
        <input type="hidden" name="lineKind" value="" />
      )}
    </div>
  );
}
