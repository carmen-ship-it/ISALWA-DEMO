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
    if (!open) return;
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/v1/search?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { results: Result[] };
        setResults(json.results ?? []);
      } catch {
        setResults([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q, open]);

  const emptyHint = useMemo(
    () => 'Pruebe “Cerámica”, “Don Julio”, “Valle Andino”…',
    [],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[color-mix(in_srgb,var(--isalwa-kiln)_45%,transparent)] px-4 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-soft)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Comando ISALWA"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar o ir a un cliente…"
          className="w-full border-b border-[var(--isalwa-mist)] bg-transparent px-4 py-3 text-[var(--isalwa-text-base)] outline-none"
        />
        <ul className="max-h-80 overflow-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">{emptyHint}</li>
          ) : (
            results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-[var(--isalwa-radius-control)] px-3 py-2 text-left hover:bg-[var(--isalwa-porcelain)]"
                  onClick={() => {
                    setOpen(false);
                    router.push(r.href);
                  }}
                >
                  <span className="font-medium text-[var(--isalwa-kiln)]">{r.title}</span>
                  <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{r.subtitle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-[var(--isalwa-mist)] px-4 py-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
          ⌘K / Ctrl+K · Esc cierra
        </div>
      </div>
    </div>
  );
}
