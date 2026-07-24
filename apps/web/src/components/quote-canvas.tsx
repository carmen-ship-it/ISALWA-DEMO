'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  listPrice: { centavos: number; label: string };
};

type LastPrice = {
  listPrice: { centavos: number; label: string };
  lastPrice: { centavos: number; label: string } | null;
  lastObservedAt: string | null;
  suggestedUnitPriceCentavos: number;
};

type Line = {
  key: string;
  productId: string;
  name: string;
  sku: string;
  category: string;
  qty: number;
  unitPriceCentavos: number;
  listPriceCentavos: number;
  lastPriceLabel: string | null;
  lastObservedAt: string | null;
};

type Quote = {
  id: string;
  number: string;
  status: string;
  invoiceId: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBob(centavos: number): string {
  const whole = Math.trunc(centavos / 100);
  const frac  = Math.abs(centavos % 100).toString().padStart(2, '0');
  return `Bs ${whole.toLocaleString('es-BO')},${frac}`;
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30)  return `hace ${days} días`;
  const mo = Math.floor(days / 30);
  return `hace ${mo} mes${mo !== 1 ? 'es' : ''}`;
}

function discountPct(unitCentavos: number, listCentavos: number): number | null {
  if (listCentavos <= 0 || unitCentavos >= listCentavos) return null;
  return Math.round(((listCentavos - unitCentavos) / listCentavos) * 100);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuoteCanvas({
  accountId,
  accountName,
  accountCode,
}: {
  accountId: string;
  accountName: string;
  accountCode?: string;
}) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [products, setProducts]     = useState<Product[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [query, setQuery]           = useState('');
  const [category, setCategory]     = useState<string | null>(null);
  const [lines, setLines]           = useState<Line[]>([]);
  const [adding, setAdding]         = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showNotes, setShowNotes]   = useState(false);
  const [notes, setNotes]           = useState('');
  const searchRef                   = useRef<HTMLInputElement>(null);

  // Fetch products (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingCat(true);
      try {
        const res  = await fetch(
          `${API_BASE}/v1/products${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        );
        const json = (await res.json()) as { items: Product[] };
        setProducts(json.items ?? []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingCat(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const visibleProducts = useMemo(() => {
    let list = products;
    if (category) list = list.filter((p) => p.category === category);
    return list.slice(0, 14);
  }, [products, category]);

  const inQuoteIds = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);

  const totalCentavos = useMemo(
    () => lines.reduce((s, l) => s + l.unitPriceCentavos * l.qty, 0),
    [lines],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function addProduct(p: Product) {
    if (adding) return;
    setAdding(p.id);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/v1/accounts/${accountId}/products/${p.id}/last-price`,
      );
      const lp = (await res.json()) as LastPrice;

      setLines((prev) => {
        const existing = prev.find((l) => l.productId === p.id);
        if (existing) {
          return prev.map((l) =>
            l.productId === p.id ? { ...l, qty: l.qty + 1 } : l,
          );
        }
        return [
          ...prev,
          {
            key:               `${p.id}-${Date.now()}`,
            productId:         p.id,
            name:              p.name,
            sku:               p.sku,
            category:          p.category,
            qty:               1,
            unitPriceCentavos: lp.suggestedUnitPriceCentavos,
            listPriceCentavos: lp.listPrice.centavos,
            lastPriceLabel:    lp.lastPrice?.label ?? null,
            lastObservedAt:    lp.lastObservedAt ?? null,
          },
        ];
      });
    } catch {
      setError('No se pudo cargar el precio sugerido.');
    } finally {
      setAdding(null);
    }
  }

  function updateQty(key: string, delta: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, qty: Math.max(1, l.qty + delta) } : l,
      ),
    );
  }

  function updatePrice(key: string, centavos: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? { ...l, unitPriceCentavos: Math.max(1, isNaN(centavos) ? l.unitPriceCentavos : centavos) }
          : l,
      ),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function submit(acceptAfter: boolean) {
    if (!lines.length) {
      setError('Agregue al menos un producto.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const createRes = await fetch(`${API_BASE}/v1/quotes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          accountId,
          items: lines.map((l) => ({
            productId:         l.productId,
            qty:               l.qty,
            unitPriceCentavos: l.unitPriceCentavos,
          })),
          notes: notes.trim() || 'Creada desde Cierre · ISALWA OS',
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

      if (quote.invoiceId) router.push(`/cierre/facturas/${quote.invoiceId}`);
      else                 router.push(`/cierre/cotizaciones/${quote.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar cotización');
    } finally {
      setBusy(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const TOKEN = {
    glaze:    'var(--isalwa-glaze)',
    kiln:     'var(--isalwa-kiln)',
    slate:    'var(--isalwa-slate)',
    mist:     'var(--isalwa-mist)',
    porcelain:'var(--isalwa-porcelain)',
    success:  'var(--isalwa-success)',
    danger:   'var(--isalwa-danger)',
    warning:  'var(--isalwa-warning)',
    info:     'var(--isalwa-info)',
    mono:     'var(--isalwa-font-mono)',
    display:  'var(--isalwa-font-display)',
    sans:     'var(--isalwa-font-sans)',
    panel:    'var(--isalwa-radius-panel)',
    control:  'var(--isalwa-radius-control)',
    pill:     'var(--isalwa-radius-pill)',
    lift:     'var(--isalwa-shadow-lift)',
    soft:     'var(--isalwa-shadow-soft)',
  } as const;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.15fr',
        gap: 16,
        alignItems: 'start',
      }}
      // Single column on narrow viewports handled via className
      className="cierre-grid"
    >

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* LEFT — Product Catalog                               */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        data-tour="cierre-catalog"
        style={{
          background:   'white',
          border:       `1px solid ${TOKEN.mist}`,
          borderRadius: TOKEN.panel,
          boxShadow:    TOKEN.soft,
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
        }}
      >
        {/* Panel header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${TOKEN.mist}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKEN.slate, marginBottom: 12 }}>
            Catálogo
          </p>

          {/* Search */}
          <input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCategory(null); }}
            placeholder="Buscar — inodoro, lavamanos, repuesto…"
            aria-label="Buscar producto"
            style={{
              width:        '100%',
              padding:      '9px 14px',
              fontSize:     13,
              fontFamily:   TOKEN.sans,
              border:       `1px solid ${TOKEN.mist}`,
              borderRadius: TOKEN.control,
              outline:      'none',
              color:        TOKEN.kiln,
              background:   TOKEN.porcelain,
              boxSizing:    'border-box',
              transition:   'border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), box-shadow var(--isalwa-motion-fast) var(--isalwa-ease-out)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = TOKEN.glaze)}
            onBlur={(e)  => (e.currentTarget.style.borderColor = TOKEN.mist)}
          />

          {/* Category pills */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
              {[null, ...categories].map((cat) => {
                const isActive = category === cat;
                const label    = cat ?? 'Todos';
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      padding:      '3px 9px',
                      borderRadius: TOKEN.pill,
                      border:       isActive ? 'none' : `1px solid ${TOKEN.mist}`,
                      background:   isActive ? TOKEN.kiln : 'white',
                      color:        isActive ? 'white' : TOKEN.slate,
                      fontSize:     10,
                      fontWeight:   600,
                      cursor:       'pointer',
                      letterSpacing:'0.03em',
                      transition:   'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out), border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                      lineHeight:   1,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product list */}
        <ul
          role="listbox"
          aria-label="Catálogo de productos"
          style={{
            listStyle:  'none',
            margin:     0,
            padding:    '8px 0',
            overflowY:  'auto',
            maxHeight:  440,
            flex:       1,
          }}
        >
          {loadingCat && !visibleProducts.length ? (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div className="isalwa-skeleton" style={{ height: 13, width: `${62 + (i % 3) * 14}%`, marginBottom: 5 }} />
                    <div className="isalwa-skeleton" style={{ height: 9, width: '40%' }} />
                  </div>
                  <div className="isalwa-skeleton" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} />
                </li>
              ))}
            </>
          ) : visibleProducts.length === 0 ? (
            <li style={{ padding: '24px 20px', color: TOKEN.slate, fontSize: 12, textAlign: 'center', opacity: 0.5 }}>
              Sin resultados
            </li>
          ) : (
            visibleProducts.map((p) => {
              const inQ    = inQuoteIds.has(p.id);
              const isAdding = adding === p.id;
              return (
                <li key={p.id} role="option" aria-selected={inQ}>
                  <button
                    type="button"
                    onClick={() => void addProduct(p)}
                    disabled={isAdding}
                    style={{
                      width:         '100%',
                      display:       'flex',
                      alignItems:    'center',
                      justifyContent:'space-between',
                      gap:           12,
                      padding:       '10px 20px',
                      background:    'transparent',
                      border:        'none',
                      cursor:        isAdding ? 'default' : 'pointer',
                      textAlign:     'left',
                      transition:    'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                    }}
                    onMouseEnter={(e) => { if (!isAdding) e.currentTarget.style.backgroundColor = TOKEN.porcelain; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    aria-label={`Agregar ${p.name}`}
                  >
                    {/* Product identity */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize:     13,
                        fontWeight:   inQ ? 600 : 500,
                        color:        inQ ? TOKEN.glaze : TOKEN.kiln,
                        letterSpacing:'-0.01em',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        margin:       0,
                      }}>
                        {p.name}
                      </p>
                      <p style={{ fontSize: 10, fontFamily: TOKEN.mono, color: TOKEN.slate, marginTop: 1 }}>
                        {p.sku} · {p.category}
                      </p>
                    </div>

                    {/* Price + add indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontFamily: TOKEN.mono, fontSize: 12, color: TOKEN.slate }}>
                        {p.listPrice.label}
                      </span>
                      <span style={{
                        width:         22,
                        height:        22,
                        borderRadius:  '50%',
                        display:       'flex',
                        alignItems:    'center',
                        justifyContent:'center',
                        fontSize:      isAdding ? 11 : 15,
                        fontWeight:    600,
                        lineHeight:    1,
                        flexShrink:    0,
                        background:    inQ
                          ? 'color-mix(in srgb, var(--isalwa-success) 12%, white)'
                          : TOKEN.porcelain,
                        color:         inQ ? TOKEN.success : TOKEN.slate,
                        border:        `1px solid ${inQ ? 'color-mix(in srgb, var(--isalwa-success) 25%, white)' : TOKEN.mist}`,
                        transition:    'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out), border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                      }}>
                        {isAdding ? '…' : inQ ? '✓' : '+'}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer: product count */}
        <div style={{ padding: '8px 20px 12px', borderTop: `1px solid ${TOKEN.mist}` }}>
          <p style={{ fontSize: 10, color: TOKEN.slate, fontFamily: TOKEN.mono, opacity: 0.6 }}>
            {visibleProducts.length} de {products.length} productos
            {category ? ` · ${category}` : ''}
          </p>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* RIGHT — Quote Builder                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          background:   'white',
          border:       `1px solid ${TOKEN.mist}`,
          borderRadius: TOKEN.panel,
          boxShadow:    TOKEN.lift,
          display:      'flex',
          flexDirection:'column',
        }}
      >
        {/* Total header — always visible */}
        <div style={{ padding: '20px 24px 18px', borderBottom: `1px solid ${TOKEN.mist}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKEN.slate, margin: 0 }}>
            Total cotización
          </p>
          <p style={{
            fontFamily:    TOKEN.display,
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(1.6rem, 3vw, 2.3rem)',
            color:         totalCentavos > 0 ? TOKEN.kiln : TOKEN.slate,
            marginTop:     6,
            letterSpacing: '-0.01em',
            lineHeight:    1,
            opacity:       totalCentavos > 0 ? 1 : 0.3,
            transition:    'color var(--isalwa-motion-base) var(--isalwa-ease-out), opacity var(--isalwa-motion-base) var(--isalwa-ease-out)',
          }}>
            {formatBob(totalCentavos)}
          </p>
          <p style={{ fontSize: 11, fontFamily: TOKEN.mono, color: TOKEN.slate, marginTop: 5, opacity: 0.7 }}>
            {lines.length === 0 ? 'Sin líneas' : `${lines.length} ${lines.length === 1 ? 'línea' : 'líneas'}`}
            {' · '}{accountName}
            {accountCode ? ` · ${accountCode}` : ''}
          </p>
        </div>

        {/* Empty state */}
        {lines.length === 0 && (
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '56px 32px',
            flex:           1,
          }}>
            <div style={{ fontSize: 44, opacity: 0.08, marginBottom: 16, lineHeight: 1 }}>◎</div>
            <p style={{
              fontFamily: TOKEN.display,
              fontStyle:  'italic',
              fontSize:   '1.2rem',
              color:      TOKEN.slate,
              fontWeight: 400,
            }}>
              Seleccione un producto
            </p>
            <p style={{ fontSize: 12, color: TOKEN.slate, marginTop: 8, opacity: 0.55, textAlign: 'center', maxWidth: 210, lineHeight: 1.5 }}>
              El precio de memoria aparece al instante — ese es el momento
            </p>
          </div>
        )}

        {/* Line items — the pricing table */}
        {lines.length > 0 && (
          <ul
            role="list"
            aria-label="Líneas de cotización"
            style={{ listStyle: 'none', margin: 0, padding: '4px 0 0', overflowY: 'auto', maxHeight: 480 }}
          >
            {lines.map((l, idx) => {
              const disc   = discountPct(l.unitPriceCentavos, l.listPriceCentavos);
              const memory = l.lastPriceLabel
                ? `Memoria: ${l.lastPriceLabel}${l.lastObservedAt ? ` · ${relativeDate(l.lastObservedAt)}` : ''}`
                : `Primera venta · lista ${formatBob(l.listPriceCentavos)}`;
              const memoryHasHistory = !!l.lastPriceLabel;

              return (
                <li
                  key={l.key}
                  className="isalwa-enter"
                  style={{
                    animationDelay:  `${idx * 35}ms`,
                    borderBottom:    `1px solid ${TOKEN.mist}`,
                    padding:         '16px 24px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                    {/* ── Product identity ── */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', color: TOKEN.kiln, margin: 0 }}>
                        {l.name}
                      </p>
                      <p style={{ fontFamily: TOKEN.mono, fontSize: 10, color: TOKEN.slate, marginTop: 2 }}>
                        {l.sku} · {l.category}
                      </p>

                      {/* Whisper — always visible */}
                      <p style={{
                        fontSize:    11,
                        fontStyle:   'italic',
                        color:       memoryHasHistory ? TOKEN.glaze : TOKEN.slate,
                        marginTop:   5,
                        lineHeight:  1.4,
                        opacity:     memoryHasHistory ? 1 : 0.65,
                      }}>
                        {memory}
                      </p>

                      {/* Discount badge */}
                      {disc !== null && (
                        <span style={{
                          display:       'inline-block',
                          marginTop:     5,
                          fontSize:      10,
                          fontWeight:    700,
                          background:    'color-mix(in srgb, var(--isalwa-success) 12%, white)',
                          color:         TOKEN.success,
                          border:        '1px solid color-mix(in srgb, var(--isalwa-success) 22%, white)',
                          borderRadius:  4,
                          padding:       '1px 6px',
                          letterSpacing: '0.01em',
                        }}>
                          −{disc}%
                        </span>
                      )}
                    </div>

                    {/* ── Controls ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>

                      {/* Qty stepper */}
                      <div style={{
                        display:      'flex',
                        alignItems:   'center',
                        border:       `1px solid ${TOKEN.mist}`,
                        borderRadius: TOKEN.control,
                        overflow:     'hidden',
                        height:       30,
                      }}>
                        <button
                          type="button"
                          onClick={() => updateQty(l.key, -1)}
                          aria-label="Reducir cantidad"
                          style={{ width: 28, height: '100%', fontSize: 16, color: TOKEN.slate, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        >
                          −
                        </button>
                        <span style={{ width: 32, textAlign: 'center', fontFamily: TOKEN.mono, fontSize: 13, fontWeight: 600, color: TOKEN.kiln }}>
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(l.key, +1)}
                          aria-label="Aumentar cantidad"
                          style={{ width: 28, height: '100%', fontSize: 16, color: TOKEN.slate, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        >
                          +
                        </button>
                      </div>

                      {/* Unit price (editable) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 10, color: TOKEN.slate, letterSpacing: '0.04em' }}>c/u</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={(l.unitPriceCentavos / 100).toFixed(2)}
                          onChange={(e) =>
                            updatePrice(l.key, Math.round(parseFloat(e.target.value || '0') * 100))
                          }
                          aria-label={`Precio unitario de ${l.name}`}
                          style={{
                            width:         80,
                            fontFamily:    TOKEN.mono,
                            fontSize:      13,
                            fontWeight:    500,
                            textAlign:     'right',
                            border:        'none',
                            borderBottom:  `1px dashed ${TOKEN.mist}`,
                            background:    'transparent',
                            outline:       'none',
                            color:         TOKEN.kiln,
                            padding:       '0 0 2px',
                            boxSizing:     'border-box',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderBottomColor = TOKEN.glaze)}
                          onBlur={(e)  => (e.currentTarget.style.borderBottomColor = TOKEN.mist)}
                        />
                      </div>

                      {/* Line total */}
                      <p style={{
                        fontFamily:    TOKEN.mono,
                        fontWeight:    700,
                        fontSize:      15,
                        color:         TOKEN.kiln,
                        margin:        0,
                        letterSpacing: '-0.02em',
                      }}>
                        {formatBob(l.unitPriceCentavos * l.qty)}
                      </p>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        aria-label={`Quitar ${l.name}`}
                        style={{
                          fontSize:   11,
                          color:      TOKEN.slate,
                          background: 'none',
                          border:     'none',
                          cursor:     'pointer',
                          padding:    '0 2px',
                          opacity:    0.45,
                          transition: 'opacity var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                          letterSpacing: '0.02em',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Actions ─────────────────────────────────────────── */}
        <div style={{
          padding:    '18px 24px 22px',
          borderTop:  lines.length > 0 ? `1px solid ${TOKEN.mist}` : 'none',
          marginTop:  lines.length === 0 ? 'auto' : 0,
        }}>
          {/* Notes */}
          {lines.length > 0 && (
            showNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condiciones especiales, notas de entrega, descuentos acordados…"
                rows={2}
                style={{
                  width:        '100%',
                  fontSize:     12,
                  fontFamily:   TOKEN.sans,
                  color:        TOKEN.kiln,
                  border:       `1px solid ${TOKEN.mist}`,
                  borderRadius: TOKEN.control,
                  padding:      '9px 12px',
                  resize:       'vertical',
                  outline:      'none',
                  marginBottom: 12,
                  boxSizing:    'border-box',
                  lineHeight:   1.5,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = TOKEN.glaze)}
                onBlur={(e)  => (e.currentTarget.style.borderColor = TOKEN.mist)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                style={{
                  fontSize:      11,
                  color:         TOKEN.slate,
                  background:    'none',
                  border:        'none',
                  cursor:        'pointer',
                  padding:       0,
                  marginBottom:  12,
                  display:       'block',
                  letterSpacing: '0.04em',
                  opacity:       0.6,
                }}
              >
                + Agregar nota interna
              </button>
            )
          )}

          {/* Error */}
          {error && (
            <p role="alert" style={{ fontSize: 12, color: TOKEN.danger, marginBottom: 10 }}>
              {error}
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: lines.length > 0 ? 'flex-end' : 'center' }}>
            {lines.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit(false)}
                style={{
                  padding:      '9px 20px',
                  borderRadius: TOKEN.control,
                  border:       `1px solid ${TOKEN.mist}`,
                  background:   'white',
                  color:        TOKEN.kiln,
                  fontSize:     13,
                  fontWeight:   600,
                  cursor:       busy ? 'not-allowed' : 'pointer',
                  opacity:      busy ? 0.5 : 1,
                  letterSpacing:'-0.01em',
                  transition:   'border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                }}
                onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = TOKEN.glaze; e.currentTarget.style.backgroundColor = TOKEN.porcelain; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKEN.mist; e.currentTarget.style.backgroundColor = 'white'; }}
              >
                Enviar
              </button>
            )}
            <button
              type="button"
              disabled={busy || !lines.length}
              onClick={() => void submit(true)}
              style={{
                padding:      '9px 24px',
                borderRadius: TOKEN.control,
                border:       'none',
                background:   busy ? TOKEN.slate : TOKEN.glaze,
                color:        'white',
                fontSize:     13,
                fontWeight:   600,
                cursor:       busy || !lines.length ? 'not-allowed' : 'pointer',
                opacity:      lines.length === 0 ? 0.35 : 1,
                letterSpacing:'-0.01em',
                transition:   'background-color var(--isalwa-motion-base) var(--isalwa-ease-out), opacity var(--isalwa-motion-base) var(--isalwa-ease-out), transform var(--isalwa-motion-fast) var(--isalwa-ease-out)',
              }}
            >
              {busy ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span className="isalwa-loading-dot" />
                  <span className="isalwa-loading-dot" />
                  <span className="isalwa-loading-dot" />
                </span>
              ) : 'Enviar y aceptar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
