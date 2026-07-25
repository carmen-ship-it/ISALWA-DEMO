'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import {
  getFavorites,
  getRecentNav,
  pushRecentNav,
  toggleFavorite,
  type RecentItem,
} from '@/lib/preferences';

type SearchHit = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

type CmdItem = {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href?: string;
  keywords?: string[];
  action?: () => void;
  kbd?: string;
  favoritable?: boolean;
};

const NAV_ITEMS: CmdItem[] = [
  { id: 'nav-pulso', group: 'Navegación', title: 'Pulso', subtitle: 'Centro de mando', href: '/pulso', keywords: ['inicio', 'home'], kbd: 'G P', favoritable: true },
  { id: 'nav-radar', group: 'Navegación', title: 'Radar', subtitle: 'Oportunidades', href: '/radar', keywords: ['oportunidades'], kbd: 'G R', favoritable: true },
  { id: 'nav-personas', group: 'Navegación', title: 'Personas', subtitle: 'Clientes y contactos', href: '/personas', keywords: ['clientes', 'crm'], kbd: 'G C', favoritable: true },
  { id: 'nav-territorio', group: 'Navegación', title: 'Territorio', subtitle: 'Mapa comercial', href: '/territorio', keywords: ['mapa'], kbd: 'G T', favoritable: true },
  { id: 'nav-senal', group: 'Navegación', title: 'Señal', subtitle: 'Conversaciones', href: '/senal', keywords: ['whatsapp', 'mensajes'], kbd: 'G S', favoritable: true },
  { id: 'nav-cierre', group: 'Navegación', title: 'Cierre', subtitle: 'Cotizaciones y facturas', href: '/cierre', keywords: ['cotizaciones', 'facturas'], kbd: 'G X', favoritable: true },
  { id: 'nav-memoria', group: 'Navegación', title: 'Memoria', subtitle: 'Historia comercial', href: '/memoria', keywords: ['historial'], favoritable: true },
];

const COMMAND_ITEMS: CmdItem[] = [
  { id: 'cmd-new-opp', group: 'Comandos', title: 'Nueva oportunidad', subtitle: 'Abrir Radar listo para actuar', href: '/radar', keywords: ['crear', 'oportunidad'] },
  { id: 'cmd-quotes', group: 'Comandos', title: 'Ver cotizaciones', href: '/cierre', keywords: ['cotizacion', 'quote'] },
  { id: 'cmd-invoices', group: 'Comandos', title: 'Ver facturas', href: '/cierre', keywords: ['factura', 'invoice'] },
  {
    id: 'cmd-tour',
    group: 'Comandos',
    title: 'Iniciar recorrido guiado',
    keywords: ['tour', 'ayuda', 'onboarding'],
    action: () => window.dispatchEvent(new CustomEvent('isalwa:start-tour')),
  },
  {
    id: 'cmd-shortcuts',
    group: 'Comandos',
    title: 'Atajos de teclado',
    keywords: ['shortcuts', 'teclado', 'ayuda'],
    kbd: '?',
    action: () => window.dispatchEvent(new CustomEvent('isalwa:open-shortcuts')),
  },
];

function matchQuery(item: CmdItem, q: string) {
  if (!q) return true;
  const hay = [item.title, item.subtitle, ...(item.keywords ?? [])].join(' ').toLowerCase();
  return hay.includes(q);
}

function KbdHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px] leading-none">
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
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
      setHits([]);
      setActive(0);
      setLoading(false);
      return;
    }
    setRecent(getRecentNav());
    setFavorites(getFavorites());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/v1/search?q=${encodeURIComponent(term)}`);
        const json = (await res.json()) as { results: SearchHit[] };
        setHits(json.results ?? []);
        setActive(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [q, open]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const favSet = new Set(favorites);
    const pinned = NAV_ITEMS.filter((n) => n.href && favSet.has(n.href)).map((n) => ({
      ...n,
      group: 'Fijos',
      id: `fav-${n.id}`,
    }));

    const recentItems: CmdItem[] =
      !query
        ? recent.map((r) => ({
            id: `recent-${r.href}-${r.at}`,
            group: 'Recientes',
            title: r.title,
            subtitle: r.subtitle,
            href: r.href,
          }))
        : [];

    const nav = NAV_ITEMS.filter((n) => matchQuery(n, query));
    const cmds = COMMAND_ITEMS.filter((c) => matchQuery(c, query));
    const searchItems: CmdItem[] = hits.map((h) => ({
      id: `hit-${h.type}-${h.id}`,
      group: 'Resultados',
      title: h.title,
      subtitle: h.subtitle || h.type,
      href: h.href,
    }));

    if (query.length >= 2) {
      return [...searchItems, ...pinned, ...nav, ...cmds];
    }
    return [...pinned, ...recentItems, ...nav, ...cmds];
  }, [q, hits, recent, favorites]);

  function run(item: CmdItem) {
    if (item.action) {
      item.action();
      setOpen(false);
      return;
    }
    if (item.href) {
      pushRecentNav({ href: item.href, title: item.title, subtitle: item.subtitle });
      setOpen(false);
      router.push(item.href);
    }
  }

  if (!open) return null;

  let lastGroup = '';

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
                setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && items[active]) {
                e.preventDefault();
                run(items[active]!);
              }
            }}
            placeholder="Buscar clientes, navegar, comandos…"
            aria-label="Buscar en la paleta de comandos"
            aria-autocomplete="list"
            aria-controls="comando-results"
            className="w-full border-b border-[var(--isalwa-mist)] bg-transparent px-4 py-3.5 text-[var(--isalwa-text-base)] outline-none placeholder:text-[var(--isalwa-slate)]"
          />
          {loading ? (
            <span className="absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-[3px] text-[var(--isalwa-slate)]">
              <span className="isalwa-loading-dot" />
              <span className="isalwa-loading-dot" />
              <span className="isalwa-loading-dot" />
            </span>
          ) : null}
        </div>

        <ul id="comando-results" className="max-h-[min(380px,50vh)] overflow-auto p-2" role="listbox">
          {items.length === 0 ? (
            <li className="px-4 py-6">
              <p
                className="text-[var(--isalwa-text-lg)] text-[var(--isalwa-kiln)]"
                style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
              >
                Sin coincidencias
              </p>
              <p className="mt-2 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
                Pruebe «Cerámica», «Don Julio», «Pulso» o «cotizaciones».
              </p>
            </li>
          ) : (
            items.map((item, idx) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const isFav = item.href ? favorites.includes(item.href) : false;
              return (
                <li key={item.id}>
                  {showGroup ? (
                    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-slate)] opacity-55">
                      {item.group}
                    </div>
                  ) : null}
                  <div
                    role="option"
                    aria-selected={idx === active}
                    className={`group relative flex w-full cursor-pointer items-center gap-2 rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-left transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] ${
                      idx === active ? 'bg-[var(--isalwa-porcelain)]' : 'hover:bg-[var(--isalwa-porcelain)]'
                    }`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => run(item)}
                  >
                    {idx === active ? (
                      <span
                        className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--isalwa-glaze)]"
                        aria-hidden
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 pl-1">
                      <span className="block font-medium text-[var(--isalwa-kiln)]">{item.title}</span>
                      {item.subtitle ? (
                        <span className="block text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </div>
                    {item.favoritable && item.href ? (
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-[var(--isalwa-slate)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label={isFav ? 'Quitar de fijos' : 'Fijar en paleta'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFavorites(toggleFavorite(item.href!));
                        }}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    ) : null}
                    {item.kbd ? (
                      <span className="flex shrink-0 gap-0.5 opacity-60">
                        {item.kbd.split(' ').map((k) => (
                          <KbdHint key={k}>{k}</KbdHint>
                        ))}
                      </span>
                    ) : (
                      <span
                        className="shrink-0 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)] opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] group-hover:opacity-60"
                        aria-hidden
                      >
                        →
                      </span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-[var(--isalwa-mist)] px-4 py-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
          <span className="flex items-center gap-1.5">
            <KbdHint>↑</KbdHint>
            <KbdHint>↓</KbdHint>
            <span>navegar</span>
            <span className="opacity-30">·</span>
            <KbdHint>⏎</KbdHint>
            <span>abrir</span>
            <span className="opacity-30">·</span>
            <KbdHint>Esc</KbdHint>
            <span>cerrar</span>
          </span>
          <button
            type="button"
            className="opacity-50 transition-opacity hover:opacity-100"
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent('isalwa:open-shortcuts'));
            }}
          >
            Atajos <KbdHint>?</KbdHint>
          </button>
        </div>
      </div>
    </div>
  );
}
