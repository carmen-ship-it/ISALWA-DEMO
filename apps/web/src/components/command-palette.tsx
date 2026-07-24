'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

type Result = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ('');
      setResults([]);
      setActive(0);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/v1/search?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { results: Result[] };
        setResults(json.results ?? []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 90);
    return () => clearTimeout(t);
  }, [q, open]);

  const emptyHint = useMemo(
    () => 'Pruebe "Cerámica", "Don Julio", "Valle Andino", "Negocia"…',
    [],
  );

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[color-mix(in_srgb,var(--isalwa-kiln)_50%,transparent)] px-4 pt-[11vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="isalwa-whisper w-full max-w-xl overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-lift)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Comando ISALWA"
        aria-modal="true"
      >
        {/* Search input */}
        <div className="relative">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                go(results[active]!.href);
              }
            }}
            placeholder="Buscar o ir a un cliente…"
            aria-label="Buscar clientes o ir a cualquier pantalla"
            aria-autocomplete="list"
            aria-controls="comando-results"
            className="w-full border-b border-[var(--isalwa-mist)] bg-transparent px-4 py-3.5 text-[var(--isalwa-text-base)] outline-none placeholder:text-[var(--isalwa-slate)]"
          />
          {/* Loading indicator — three dots instead of ellipsis */}
          {loading ? (
            <span className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-[3px] text-[var(--isalwa-slate)]">
              <span className="isalwa-loading-dot" />
              <span className="isalwa-loading-dot" />
              <span className="isalwa-loading-dot" />
            </span>
          ) : null}
        </div>

        {/* Results list */}
        <ul id="comando-results" className="max-h-80 overflow-auto p-2" role="listbox">
          {results.length === 0 ? (
            <li className="px-4 py-6">
              {q.trim() ? (
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-base opacity-30" aria-hidden>◎</span>
                  <span className="text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
                    Sin coincidencias — pruebe otro nombre o código H-.
                  </span>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-slate)] opacity-50">
                    Pruebe buscar
                  </p>
                  <p className="text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)] leading-relaxed">
                    {emptyHint}
                  </p>
                </div>
              )}
            </li>
          ) : (
            results.map((r, idx) => (
              <li key={`${r.type}-${r.id}`} role="option" aria-selected={idx === active}>
                <button
                  type="button"
                  className={`group relative flex w-full items-center gap-3 rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-left cursor-pointer transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] ${
                    idx === active
                      ? 'bg-[var(--isalwa-porcelain)]'
                      : 'hover:bg-[var(--isalwa-porcelain)]'
                  }`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(r.href)}
                >
                  {/* Active accent bar */}
                  {idx === active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--isalwa-glaze)]"
                      aria-hidden
                    />
                  )}
                  {/* Title + subtitle */}
                  <div className="min-w-0 flex-1 pl-1">
                    <span className="block font-medium text-[var(--isalwa-kiln)]">{r.title}</span>
                    <span className="block text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                      {r.subtitle}
                    </span>
                  </div>
                  {/* Navigate arrow — appears on hover/active */}
                  <span
                    className="shrink-0 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)] opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] group-hover:opacity-60"
                    aria-hidden
                  >
                    →
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer — keyboard hints */}
        <div className="flex items-center justify-between border-t border-[var(--isalwa-mist)] px-4 py-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px] leading-none">↑</kbd>
            <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px] leading-none">↓</kbd>
            <span>navegar</span>
            <span className="opacity-30">·</span>
            <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px] leading-none">⏎</kbd>
            <span>abrir</span>
            <span className="opacity-30">·</span>
            <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px] leading-none">Esc</kbd>
            <span>cerrar</span>
          </span>
          <span className="opacity-40 font-[var(--isalwa-font-mono)] text-[10px]">⌘K</span>
        </div>
      </div>
    </div>
  );
}
