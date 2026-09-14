'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { SearchField } from '@isalwa/ui';
import { CoverageSummaryPanel } from '@/components/productivity/coverage-summary';
import { WhatChangedList } from '@/components/productivity/what-changed-list';
import { extendPaletteSearch, loadWhatChanged, lookupCustomers } from '@/lib/productivity/actions';
import { parseUsefulRecents, rememberUsefulRecent } from '@/lib/productivity/recents';
import { mergePaletteSearch } from '@/lib/productivity/search-extensions';
import {
  canonicalViewHref,
  labelForViewHref,
  listSavedViews,
  parsePinnedViews,
  pinCurrentView,
  savedViewsStorageKey,
  type SavedView,
} from '@/lib/productivity/saved-views';
import type { WhatChangedItem } from '@/lib/productivity/what-changed';
import { searchPalette } from '@/lib/shell/command-search';
import {
  applyPick,
  contextualPaletteActions,
  groupPaletteItems,
  matchesPaletteQuery,
  paletteActions,
  paletteNav,
  palettePathContext,
  PALETTE_MIN_QUERY,
  recentsStorageKey,
  type PaletteItem,
  type PalettePick,
} from '@/lib/shell/command-palette';

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAdmin: boolean;
  canCreateCustomer: boolean;
  actorKey: string | null;
  returnFocusRef: React.RefObject<HTMLElement | null>;
};

type PaletteMode = 'search' | 'coverage' | 'changed';

type ChangedView = {
  customer: string;
  items: WhatChangedItem[];
  partial: boolean;
};

const PICK_HINT: Record<PalettePick, string> = {
  'customer-opportunity': 'Elija el cliente para la nueva oportunidad.',
  'customer-follow-up': 'Elija el cliente para registrar el seguimiento.',
  'opportunity-quote': 'Elija la oportunidad para crear la cotización.',
};

export function CommandPalette({
  open,
  onOpenChange,
  showAdmin,
  canCreateCustomer,
  actorKey,
  returnFocusRef,
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pick, setPick] = useState<PalettePick | null>(null);
  const [remote, setRemote] = useState<PaletteItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'partial' | 'empty' | 'error' | 'session'>('idle');
  const [recents, setRecents] = useState<PaletteItem[]>([]);
  const [mode, setMode] = useState<PaletteMode>('search');
  const [changed, setChanged] = useState<ChangedView | null>(null);
  const [changedStatus, setChangedStatus] = useState<'idle' | 'loading' | 'error' | 'session'>('idle');
  const [pinned, setPinned] = useState<SavedView[]>([]);
  const [currentHref, setCurrentHref] = useState('');
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const storageKey = actorKey ? recentsStorageKey(actorKey) : null;
  const viewsKey = actorKey ? savedViewsStorageKey(actorKey) : null;

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery('');
    setPick(null);
    setMode('search');
    setChanged(null);
    setChangedStatus('idle');
    setRemote([]);
    setStatus('idle');
    setActive(0);
    setSavedNote(null);
    returnFocusRef.current?.focus();
  }, [onOpenChange, returnFocusRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      if (storageKey) setRecents(parseUsefulRecents(window.localStorage.getItem(storageKey)));
      if (viewsKey) setPinned(parsePinnedViews(window.localStorage.getItem(viewsKey)));
      setCurrentHref(`${window.location.pathname}${window.location.search}`);
      queueMicrotask(() => document.getElementById('command-palette-input')?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open, storageKey, viewsKey]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (mode === 'coverage' || (mode === 'changed' && changed)) return;
    if (q.length < PALETTE_MIN_QUERY) {
      setRemote([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (cancelled) return;
      setStatus('loading');
      if (mode === 'changed') {
        void lookupCustomers(q).then((result) => {
          if (!open || cancelled) return;
          if (!result.ok) {
            setRemote([]);
            setStatus(result.reason === 'session' ? 'session' : 'error');
            return;
          }
          setRemote(result.items.map(changedCustomerItem));
          setStatus(result.items.length === 0 ? 'empty' : 'idle');
        });
        return;
      }
      void searchPalette(q).then(async (result) => {
        if (!open || cancelled) return;
        if (!result.ok) {
          setRemote([]);
          setStatus(result.reason === 'session' ? 'session' : 'error');
          return;
        }
        const extra = await extendPaletteSearch(q);
        if (!open || cancelled) return;
        if (!extra.ok) {
          setRemote(result.items);
          setStatus(extra.reason === 'session' ? 'session' : result.partial || result.items.length > 0 ? 'partial' : 'error');
          return;
        }
        const merged = mergePaletteSearch(result.items, extra.items);
        setRemote(merged);
        const incomplete = result.partial || extra.partial;
        setStatus(merged.length === 0 ? 'empty' : incomplete ? 'partial' : 'idle');
      });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [changed, mode, open, query]);

  const items = useMemo(() => {
    const q = query.trim();
    const access = { canCreateCustomer, canInvite: showAdmin };
    const actions = (
      pathname && palettePathContext(pathname)
        ? contextualPaletteActions(pathname, access)
        : paletteActions(access)
    ).filter((item) => matchesPaletteQuery(item, q));
    const nav = paletteNav(showAdmin).filter((item) => matchesPaletteQuery(item, q));
    if (pick) {
      return remote
        .map((item) => applyPick(item, pick))
        .filter((item): item is PaletteItem => item !== null);
    }
    if (mode === 'changed' && !changed) return remote;
    if (mode === 'coverage' || changed) return [];
    if (q.length < PALETTE_MIN_QUERY) {
      return [...actions, ...recents, ...nav];
    }
    return [...actions, ...remote, ...nav.filter((item) => matchesPaletteQuery(item, q))];
  }, [canCreateCustomer, changed, mode, pathname, pick, query, recents, remote, showAdmin]);

  const extraGroups = useMemo(() => {
    if (pick || mode !== 'search') return [];
    const q = query.trim();
    const savable = canonicalViewHref(currentHref);
    const productivity: PaletteItem[] = [
      {
        key: 'productivity:coverage',
        kind: 'action',
        label: 'Cobertura de ausencia',
        detail: 'Resumen autorizado, sin reasignar',
        href: '/trabajo',
      },
      {
        key: 'productivity:changed',
        kind: 'action',
        label: 'Qué cambió',
        detail: 'Historial de un cliente',
        href: '/clientes',
      },
    ];
    if (savable) {
      productivity.push({
        key: 'productivity:save-view',
        kind: 'action',
        label: 'Guardar esta vista',
        detail: labelForViewHref(savable) ?? 'En este navegador',
        href: savable,
      });
    }
    const views: PaletteItem[] = listSavedViews(pinned).map((view) => ({
      key: `view:${view.id}`,
      kind: 'nav',
      label: view.label,
      detail: view.detail,
      href: view.href,
    }));
    return [
      { id: 'productivity', label: 'Productividad', items: productivity.filter((item) => matchesPaletteQuery(item, q)) },
      { id: 'views', label: 'Vistas', items: views.filter((item) => matchesPaletteQuery(item, q)) },
    ].filter((group) => group.items.length > 0);
  }, [currentHref, mode, pick, pinned, query]);

  const groups = useMemo(() => [...extraGroups, ...groupPaletteItems(items)], [extraGroups, items]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    setActive(0);
  }, [query, pick, mode, flat.length]);

  async function openChanged(partyId: string) {
    setChangedStatus('loading');
    setChanged(null);
    const result = await loadWhatChanged(partyId);
    if (!result.ok) {
      setChangedStatus(result.reason === 'session' ? 'session' : 'error');
      return;
    }
    setChanged({ customer: result.customer, items: result.items, partial: result.partial });
    setChangedStatus('idle');
  }

  function pinView() {
    if (!viewsKey) return;
    const next = pinCurrentView(pinned, currentHref);
    if (!next) {
      setSavedNote('Esta página no se puede guardar como vista.');
      return;
    }
    window.localStorage.setItem(viewsKey, JSON.stringify(next));
    setPinned(next);
    setSavedNote('Vista guardada en este navegador.');
  }

  function activate(item: PaletteItem | undefined) {
    if (!item) return;
    if (item.key === 'productivity:coverage') {
      setMode('coverage');
      setQuery('');
      setStatus('idle');
      return;
    }
    if (item.key === 'productivity:changed') {
      setMode('changed');
      setChanged(null);
      setChangedStatus('idle');
      setQuery('');
      setRemote([]);
      document.getElementById('command-palette-input')?.focus();
      return;
    }
    if (item.key === 'productivity:save-view') {
      pinView();
      return;
    }
    if (mode === 'changed' && !changed && item.partyId) {
      void openChanged(item.partyId);
      return;
    }
    if (item.pick) {
      setPick(item.pick);
      setQuery('');
      setRemote([]);
      document.getElementById('command-palette-input')?.focus();
      return;
    }
    if (storageKey && item.kind !== 'action' && item.kind !== 'nav') {
      const stored = rememberUsefulRecent(recents, item);
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
    }
    close();
    router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activate(flat[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (changed) {
        setChanged(null);
        setChangedStatus('idle');
        return;
      }
      if (mode !== 'search') {
        setMode('search');
        setQuery('');
        return;
      }
      if (pick) {
        setPick(null);
        return;
      }
      close();
    }
  }

  let cursor = -1;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Buscar"
      className="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-[color-mix(in_srgb,var(--isalwa-kiln)_28%,transparent)] open:flex sm:m-auto sm:h-auto sm:max-h-[min(32rem,80dvh)] sm:w-[min(40rem,calc(100vw-2rem))]"
      onCancel={(event) => {
        event.preventDefault();
        if (changed) {
          setChanged(null);
          setChangedStatus('idle');
          return;
        }
        if (mode !== 'search') {
          setMode('search');
          setQuery('');
          return;
        }
        if (pick) {
          setPick(null);
          return;
        }
        close();
      }}
      onClose={close}
    >
      <div
        className="flex h-full w-full flex-col bg-[var(--isalwa-white)] sm:h-auto sm:max-h-[min(32rem,70vh)] sm:rounded-[var(--isalwa-radius-panel)] sm:shadow-[var(--isalwa-shadow-soft)]"
        onKeyDown={onKeyDown}
      >
        <div className="border-b border-[var(--isalwa-mist)] px-4 py-3">
          <label htmlFor="command-palette-input" className="sr-only">
            Buscar clientes, cotizaciones o trabajo
          </label>
          <SearchField
            id="command-palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat[active] ? optionId(flat[active].key) : undefined}
            aria-autocomplete="list"
            value={query}
            placeholder={
              mode === 'changed'
                ? 'Cliente para ver qué cambió'
                : pick
                  ? PICK_HINT[pick]
                  : 'Cliente, teléfono, cotización…'
            }
            type="text"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          {mode === 'changed' ? (
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Elija un cliente. Esc vuelve a la búsqueda.</p>
          ) : pick ? (
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{PICK_HINT[pick]} Esc cancela la acción.</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
              Busque sin recorrer menús. Vencido, en Inicio, significa que la fecha ya pasó.
            </p>
          )}
        </div>
        <div id={listId} role="listbox" aria-label="Resultados" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {status === 'loading' ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-slate)]" role="status">
              Buscando…
            </p>
          ) : null}
          {status === 'session' ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-kiln)]" role="alert">
              Su sesión venció. Vuelva a iniciar sesión.
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-kiln)]" role="alert">
              No se pudo completar la búsqueda. Intente de nuevo.
            </p>
          ) : null}
          {status === 'partial' && mode === 'search' ? (
            <p className="px-3 py-2 text-sm text-[var(--isalwa-slate)]" role="status">
              La búsqueda puede estar incompleta. No se agregaron coincidencias inventadas.
            </p>
          ) : null}
          {savedNote ? (
            <p className="px-3 py-2 text-sm text-[var(--isalwa-slate)]" role="status">
              {savedNote}
            </p>
          ) : null}
          {mode === 'coverage' ? <CoverageSummaryPanel onNavigate={(href) => { close(); router.push(href); }} /> : null}
          {mode === 'changed' && changedStatus === 'loading' ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-slate)]" role="status">Consultando el historial…</p>
          ) : null}
          {mode === 'changed' && changedStatus === 'session' ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-kiln)]" role="alert">Su sesión venció. Vuelva a iniciar sesión.</p>
          ) : null}
          {mode === 'changed' && changedStatus === 'error' ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-kiln)]" role="alert">No se pudo leer el historial de ese cliente.</p>
          ) : null}
          {mode === 'changed' && changed ? (
            <WhatChangedList
              customer={changed.customer}
              items={changed.items}
              partial={changed.partial}
              onNavigate={(href) => {
                close();
                router.push(href);
              }}
            />
          ) : null}
          {status === 'empty' && flat.length === 0 && mode !== 'coverage' && !changed ? (
            <p className="px-3 py-4 text-sm text-[var(--isalwa-slate)]" role="status">
              No hay coincidencias. Pruebe el nombre comercial, un teléfono o el número de cotización.
            </p>
          ) : null}
          {groups.map((group) => (
            <div key={group.id} className="mb-2">
              <p className="isalwa-section-label px-3 py-2">{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  cursor += 1;
                  const index = cursor;
                  const selected = index === active;
                  return (
                    <li key={item.key}>
                      <button
                        id={optionId(item.key)}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`flex w-full min-w-0 flex-col rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-left outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] ${
                          selected ? 'bg-[var(--isalwa-mist)]' : 'hover:bg-[var(--isalwa-porcelain)]'
                        }`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => activate(item)}
                      >
                        <span className="whitespace-normal break-words text-sm font-medium text-[var(--isalwa-kiln)]">{item.label}</span>
                        {item.detail ? (
                          <span className="whitespace-normal break-words text-sm text-[var(--isalwa-slate)]">{item.detail}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}

function optionId(key: string): string {
  return `palette-option-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function changedCustomerItem(option: { value: string; label: string }): PaletteItem {
  return {
    key: `changed:${option.value}`,
    kind: 'customer',
    label: option.label,
    detail: 'Qué cambió',
    href: `/clientes/${encodeURIComponent(option.value)}`,
    partyId: option.value,
  };
}

export function CommandPaletteTrigger({
  onOpen,
  buttonRef,
}: {
  onOpen: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="inline-flex h-10 min-w-0 items-center gap-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-3 text-sm text-[var(--isalwa-slate)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Buscar</span>
      <span className="hidden text-xs text-[var(--isalwa-slate)] md:inline">⌘K</span>
    </button>
  );
}
