'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Panel, StatusPill } from '@isalwa/ui';
import { API_BASE } from '@/lib/api';

type Product = {
  id: string;
  sku: string;
  name: string;
  listPrice: { centavos: number; label: string };
};

type LastPrice = {
  productId: string;
  name: string;
  listPrice: { label: string; centavos: number };
  lastPrice: { label: string; centavos: number } | null;
  lastObservedAt: string | null;
  suggestedUnitPriceCentavos: number;
};

type Line = {
  key: string;
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPriceCentavos: number;
  lastPriceLabel: string | null;
  whisper: string | null;
};

type Quote = {
  id: string;
  number: string;
  status: string;
  total: { label: string };
  invoiceId: string | null;
};

function formatBob(centavos: number) {
  const whole = Math.trunc(centavos / 100);
  const frac = Math.abs(centavos % 100)
    .toString()
    .padStart(2, '0');
  return `Bs ${whole.toLocaleString('es-BO')},${frac}`;
}

export function QuoteCanvas({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whisperFlash, setWhisperFlash] = useState<string | null>(null);
  const [created, setCreated] = useState<Quote | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/v1/products${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        );
        const json = (await res.json()) as { items: Product[] };
        setProducts(json.items ?? []);
      } catch {
        setProducts([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  const totalCentavos = useMemo(
    () => lines.reduce((s, l) => s + l.unitPriceCentavos * l.qty, 0),
    [lines],
  );

  async function addProduct(p: Product) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/accounts/${accountId}/products/${p.id}/last-price`);
      const lp = (await res.json()) as LastPrice;
      const unit = lp.suggestedUnitPriceCentavos;
      const whisper = lp.lastPrice
        ? `Último precio a este cliente: ${lp.lastPrice.label}${
            lp.lastObservedAt
              ? ` · ${new Date(lp.lastObservedAt).toLocaleDateString('es-BO')}`
              : ''
          }`
        : `Sin historial — lista ${lp.listPrice.label}`;
      setWhisperFlash(whisper);
      setTimeout(() => setWhisperFlash(null), 4200);
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === p.id);
        if (existing) {
          return prev.map((l) =>
            l.productId === p.id ? { ...l, qty: l.qty + 1, whisper } : l,
          );
        }
        return [
          ...prev,
          {
            key: `${p.id}-${Date.now()}`,
            productId: p.id,
            name: p.name,
            sku: p.sku,
            qty: 1,
            unitPriceCentavos: unit,
            lastPriceLabel: lp.lastPrice?.label ?? null,
            whisper,
          },
        ];
      });
    } catch {
      setError('No se pudo cargar el precio sugerido.');
    }
  }

  async function createAndSend(acceptAfter: boolean) {
    if (!lines.length) {
      setError('Agregue al menos un producto.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const createRes = await fetch(`${API_BASE}/v1/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          items: lines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            unitPriceCentavos: l.unitPriceCentavos,
          })),
          notes: 'Creada desde Cierre · ISALWA OS',
        }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      let quote = (await createRes.json()) as Quote;

      const sendRes = await fetch(`${API_BASE}/v1/quotes/${quote.id}/send`, { method: 'POST' });
      if (!sendRes.ok) throw new Error(await sendRes.text());
      quote = (await sendRes.json()) as Quote;

      if (acceptAfter) {
        const acceptRes = await fetch(`${API_BASE}/v1/quotes/${quote.id}/accept`, {
          method: 'POST',
        });
        if (!acceptRes.ok) throw new Error(await acceptRes.text());
        quote = (await acceptRes.json()) as Quote;
      }

      setCreated(quote);
      if (quote.invoiceId) {
        router.push(`/cierre/facturas/${quote.invoiceId}`);
      } else {
        router.push(`/cierre/cotizaciones/${quote.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear cotización');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Cliente</p>
            <h2 className="text-[var(--isalwa-text-xl)] font-semibold">{accountName}</h2>
          </div>
          <StatusPill tone="info">Lienzo vivo</StatusPill>
        </div>

        <label className="mt-5 block">
          <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Buscar producto</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Inodoro, tanque, lavamanos…"
            className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--isalwa-glaze)]"
            aria-label="Buscar producto"
          />
        </label>

        <ul className="mt-3 max-h-56 space-y-1 overflow-auto" role="listbox" aria-label="Catálogo">
          {products.slice(0, 12).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[var(--isalwa-radius-control)] px-3 py-2 text-left hover:bg-[var(--isalwa-porcelain)]"
                onClick={() => void addProduct(p)}
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{p.sku}</span>
                </span>
                <span style={{ fontFamily: 'var(--isalwa-font-mono)' }} className="text-[var(--isalwa-text-sm)]">
                  {p.listPrice.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="relative overflow-hidden p-5">
        <h2 className="font-semibold">Líneas</h2>
        {whisperFlash ? (
          <div
            className="isalwa-whisper mt-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-glaze)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)] px-3 py-3 text-[var(--isalwa-text-md)]"
            role="status"
            aria-live="polite"
          >
            {whisperFlash}
          </div>
        ) : null}

        <ul className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.key} className="border-b border-[var(--isalwa-mist)] pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{l.sku}</p>
                  {l.whisper ? (
                    <p className="mt-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)]">{l.whisper}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)]"
                  onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                >
                  Quitar
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-[var(--isalwa-text-sm)]">
                  Cant.
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.key === l.key ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x,
                        ),
                      )
                    }
                    className="w-16 rounded border border-[var(--isalwa-mist)] px-2 py-1"
                  />
                </label>
                <span style={{ fontFamily: 'var(--isalwa-font-mono)' }}>
                  {formatBob(l.unitPriceCentavos * l.qty)}
                </span>
              </div>
            </li>
          ))}
          {lines.length === 0 ? (
            <li className="text-[var(--isalwa-slate)]">
              Agregue un producto. El susurro de último precio aparece al instante — ese es el momento.
            </li>
          ) : null}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[var(--isalwa-mist)] pt-4">
          <div>
            <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Total</p>
            <p className="text-[var(--isalwa-text-2xl)] font-semibold" style={{ fontFamily: 'var(--isalwa-font-mono)' }}>
              {formatBob(totalCentavos)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy || !lines.length} onClick={() => void createAndSend(false)}>
              Enviar
            </Button>
            <Button disabled={busy || !lines.length} onClick={() => void createAndSend(true)}>
              Enviar y aceptar
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-[var(--isalwa-text-sm)] text-[var(--isalwa-copper)]" role="alert">
            {error}
          </p>
        ) : null}
        {created ? (
          <p className="mt-3 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
            {created.number} · {created.status}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
