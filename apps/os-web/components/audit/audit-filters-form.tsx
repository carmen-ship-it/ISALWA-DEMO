'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button, SearchField } from '@isalwa/ui';
import { auditActionOptions, auditResourceTypeOptions } from '@/lib/audit/filter-options';
import {
  auditoriaHrefWithoutCursor,
  type AuditQueryState,
} from '@/lib/audit/url-state';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { ServerPartyTypeahead } from '@/components/operating/server-party-typeahead';

const fieldLabel =
  'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type AuditFiltersFormProps = {
  path?: string;
  initial: AuditQueryState;
  actorLabel?: string;
  partyLabel?: string;
};

export function AuditFiltersForm({
  path = '/auditoria',
  initial,
  actorLabel = '',
  partyLabel = '',
}: AuditFiltersFormProps) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q ?? '');
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [action, setAction] = useState(initial.action ?? '');
  const [resourceType, setResourceType] = useState(initial.resourceType ?? '');
  const [resourceId, setResourceId] = useState(initial.resourceId ?? '');
  const [partyDisplay, setPartyDisplay] = useState(partyLabel);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const read = (key: string) => String(data.get(key) ?? '').trim();
    const state: AuditQueryState = {
      q: read('q') || undefined,
      from: read('from') || undefined,
      to: read('to') || undefined,
      action: read('action') || undefined,
      resourceType: read('resourceType') || undefined,
      actorMemberId: read('actorMemberId') || undefined,
      resourceId: read('resourceId') || undefined,
    };
    router.push(auditoriaHrefWithoutCursor(path, state));
  }

  const hasFilters = Boolean(
    initial.q ||
      initial.from ||
      initial.to ||
      initial.action ||
      initial.resourceType ||
      initial.actorMemberId ||
      initial.resourceId,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-3">
          <label htmlFor="audit-q" className={fieldLabel}>
            Buscar
          </label>
          <SearchField
            id="audit-q"
            name="q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Acción, tipo, referencia o correlación…"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="audit-from" className={fieldLabel}>
            Fecha desde
          </label>
          <input
            id="audit-from"
            name="from"
            type="date"
            className={fieldClass}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="audit-to" className={fieldLabel}>
            Fecha hasta
          </label>
          <input
            id="audit-to"
            name="to"
            type="date"
            className={fieldClass}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="audit-actor" className={fieldLabel}>
            Persona
          </label>
          <ServerMemberTypeahead
            id="audit-actor"
            name="actorMemberId"
            mode="admin"
            placeholder="Buscar persona (mín. 2 letras)"
            defaultMemberId={initial.actorMemberId ?? ''}
            defaultLabel={actorLabel}
          />
        </div>

        <div>
          <input type="hidden" name="resourceId" value={resourceId} />
          <ServerPartyTypeahead
            id="audit-party"
            label="Cliente"
            value={resourceId}
            displayLabel={partyDisplay}
            onChange={(next) => {
              setResourceId(next.partyId);
              setPartyDisplay(next.label);
            }}
          />
        </div>

        <div>
          <label htmlFor="audit-resource-type" className={fieldLabel}>
            Tipo
          </label>
          <select
            id="audit-resource-type"
            name="resourceType"
            className={fieldClass}
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
          >
            <option value="">Todos</option>
            {auditResourceTypeOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="audit-action" className={fieldLabel}>
            Acción
          </label>
          <select
            id="audit-action"
            name="action"
            className={fieldClass}
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="">Todas</option>
            {auditActionOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          Aplicar filtros
        </Button>
        {hasFilters ? (
          <Link
            href={path}
            className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)]"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
