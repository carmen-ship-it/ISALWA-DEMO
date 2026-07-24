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
    () => 'Pruebe “Cerámica”, “Don Julio”, “Valle Andino”, “Negocia”…',
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
            className="w-full border-b border-[var(--isalwa-mist)] bg-transparent px-4 py-3.5 text-[var(--isalwa-text-base)] outline-none placeholder:text-[var(--isalwa-slate)]"
            aria-autocomplete="list"
            aria-controls="comando-results"
          />
          {loading ? (
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
              …
            </span>
          ) : null}
        </div>
        <ul id="comando-results" className="max-h-80 overflow-auto p-2" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-5 text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
              {q.trim() ? 'Sin coincidencias — pruebe otro nombre o código H-.' : emptyHint}
            </li>
          ) : (
            results.map((r, idx) => (
              <li key={`${r.type}-${r.id}`} role="option" aria-selected={idx === active}>
                <button
                  type="button"
                  className={`flex w-full flex-col rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-left transition-colors ${
                    idx === active ? 'bg-[var(--isalwa-porcelain)]' : 'hover:bg-[var(--isalwa-porcelain)]'
                  }`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(r.href)}
                >
                  <span className="font-medium text-[var(--isalwa-kiln)]">{r.title}</span>
                  <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{r.subtitle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-[var(--isalwa-mist)] px-4 py-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
          <span>↑↓ navegar · Enter abrir · Esc cerrar</span>
          <span>Comando</span>
        </div>
      </div>
    </div>
  );
}
