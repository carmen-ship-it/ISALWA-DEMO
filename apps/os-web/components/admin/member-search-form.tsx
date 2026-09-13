'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';
import { cx, Button, SearchField } from '@isalwa/ui';
import {
  FILTERABLE_ACCESS_STATUSES,
  FILTERABLE_EMPLOYMENT_STATUSES,
  formatAccessStatus,
  formatEmploymentStatus,
} from '@/lib/workforce/labels';
import { equipoHref } from '@/lib/workforce/navigation';

type MemberSearchFormProps = {
  initialQuery?: string;
  initialAccessStatus?: string;
  initialEmploymentStatus?: string;
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

export function MemberSearchForm({
  initialQuery = '',
  initialAccessStatus,
  initialEmploymentStatus,
}: MemberSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      equipoHref({
        q: query.trim() || undefined,
        accessStatus: initialAccessStatus,
        employmentStatus: initialEmploymentStatus,
      }),
    );
  }

  const hasFilters = Boolean(initialQuery || initialAccessStatus || initialEmploymentStatus);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="member-search"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]"
          >
            Buscar empleados
          </label>
          <SearchField
            id="member-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, correo…"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="primary" className="shrink-0">
          Buscar
        </Button>
        {hasFilters ? (
          <Link
            href={equipoHref()}
            className="isalwa-t-fast inline-flex h-10 shrink-0 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)]"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por acceso">
        <FilterChip
          href={equipoHref({ q: initialQuery, employmentStatus: initialEmploymentStatus })}
          active={!initialAccessStatus}
        >
          Todos los accesos
        </FilterChip>
        {FILTERABLE_ACCESS_STATUSES.map((status) => (
          <FilterChip
            key={status}
            href={equipoHref({
              q: initialQuery,
              accessStatus: status,
              employmentStatus: initialEmploymentStatus,
            })}
            active={initialAccessStatus === status}
          >
            {formatAccessStatus(status)}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por relación laboral">
        <FilterChip
          href={equipoHref({ q: initialQuery, accessStatus: initialAccessStatus })}
          active={!initialEmploymentStatus}
        >
          Todas las relaciones
        </FilterChip>
        {FILTERABLE_EMPLOYMENT_STATUSES.map((status) => (
          <FilterChip
            key={status}
            href={equipoHref({
              q: initialQuery,
              accessStatus: initialAccessStatus,
              employmentStatus: status,
            })}
            active={initialEmploymentStatus === status}
          >
            {formatEmploymentStatus(status)}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
