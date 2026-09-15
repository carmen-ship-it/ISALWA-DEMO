'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';
import { cx } from '@isalwa/ui';
import { Button, SearchField } from '@isalwa/ui';
import { FILTERABLE_ROLE_KEYS, formatPartyRole } from '@/lib/party/labels';
import { clientesSearchHref } from '@/lib/party/navigation';

/** CROSS_LANE: add 'clientesSearch' to TOUR_TARGET in lib/walkthrough/targets.ts */
const CLIENTES_SEARCH_TARGET = 'clientes-search';

type PartySearchFormProps = {
  initialQuery?: string;
  initialRoleKey?: string;
  initialStatus?: string;
};

function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx('isalwa-chip inline-flex', active && 'is-active')}
      aria-current={active ? 'true' : undefined}
    >
      {children}
    </Link>
  );
}

function filterRoleChips(): Array<{ label: string; roleKey: string; roleKeys: string[] }> {
  const byLabel = new Map<string, string[]>();
  for (const roleKey of FILTERABLE_ROLE_KEYS) {
    const label = formatPartyRole(roleKey);
    const existing = byLabel.get(label) ?? [];
    existing.push(roleKey);
    byLabel.set(label, existing);
  }
  return [...byLabel.entries()].map(([label, roleKeys]) => ({
    label,
    roleKey: roleKeys[0] ?? '',
    roleKeys,
  }));
}

export function PartySearchForm({
  initialQuery = '',
  initialRoleKey,
  initialStatus,
}: PartySearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      clientesSearchHref({
        q: query.trim() || undefined,
        roleKey: initialRoleKey,
        status: initialStatus,
      }),
    );
  }

  const hasFilters = Boolean(initialQuery || initialRoleKey || initialStatus);

  return (
    <div className="space-y-4" data-tour={CLIENTES_SEARCH_TARGET}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="party-search"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]"
          >
            Buscar clientes y contactos
          </label>
          <SearchField
            id="party-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, contacto o teléfono"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="primary" className="shrink-0">
          Buscar
        </Button>
        {hasFilters ? (
          <Link
            href="/clientes"
            className="inline-flex h-10 shrink-0 items-center text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por relación">
        <FilterChip href={clientesSearchHref({ q: initialQuery, status: initialStatus })} active={!initialRoleKey}>
          Todas
        </FilterChip>
        {filterRoleChips().map((chip) => (
          <FilterChip
            key={chip.label}
            href={clientesSearchHref({ q: initialQuery, roleKey: chip.roleKey, status: initialStatus })}
            active={chip.roleKeys.includes(initialRoleKey ?? '')}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
