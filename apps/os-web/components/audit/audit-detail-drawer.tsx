'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ContextDrawer, StatusPill } from '@isalwa/ui';
import { AuditAiAskStub } from '@/components/audit/audit-ai-ask-stub';
import { formatAuditSnapshot, snapshotSectionTitle } from '@/lib/audit/format-snapshot';
import { presentAuditActionLabel, presentAuditResourceLabel } from '@/lib/audit/present';
import { auditResourceHrefForEntry } from '@/lib/audit/resource-href';
import type { AuditLogItem } from '@/lib/audit/types';
import { auditoriaHrefCloseEntry, type AuditQueryState } from '@/lib/audit/url-state';
import { partyHref } from '@/lib/party/navigation';

type AuditDetailDrawerProps = {
  path?: string;
  open: boolean;
  entry: AuditLogItem | null;
  listState: AuditQueryState;
  actorLabel: string;
  clientLabel?: string;
};

export function AuditDetailDrawer({
  path = '/auditoria',
  open,
  entry,
  listState,
  actorLabel,
  clientLabel,
}: AuditDetailDrawerProps) {
  const router = useRouter();
  const closeHref = auditoriaHrefCloseEntry(path, listState);
  const actionLabel = entry ? presentAuditActionLabel(entry) : 'Registro de auditoría';
  const resourceLabel = entry ? presentAuditResourceLabel(entry) : '';
  const resourceHref = entry
    ? auditResourceHrefForEntry({
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        beforeJson: entry.beforeJson,
        afterJson: entry.afterJson,
      })
    : null;

  function closeDrawer() {
    router.push(closeHref);
  }

  return (
    <ContextDrawer
      open={open && Boolean(entry)}
      title={actionLabel}
      onClose={closeDrawer}
    >
      {entry ? (
        <div className="space-y-5 text-sm text-[var(--isalwa-kiln)]">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                Fecha
              </dt>
              <dd className="mt-1">
                <time dateTime={entry.occurredAt}>
                  {new Date(entry.occurredAt).toLocaleString('es-BO', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                Persona
              </dt>
              <dd className="mt-1">{actorLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                Tipo
              </dt>
              <dd className="mt-1">{resourceLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                Acción
              </dt>
              <dd className="mt-1">{actionLabel}</dd>
            </div>
            {clientLabel ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                  Cliente
                </dt>
                <dd className="mt-1">
                  <Link
                    href={partyHref(entry.resourceId)}
                    className="font-medium text-[var(--isalwa-glaze)] hover:underline"
                  >
                    {clientLabel}
                  </Link>
                </dd>
              </div>
            ) : null}
            {resourceHref && entry.resourceType !== 'party' ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                  Recurso
                </dt>
                <dd className="mt-1">
                  <Link
                    href={resourceHref}
                    className="font-medium text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Abrir {resourceLabel.toLocaleLowerCase('es')}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                Correlación
              </dt>
              <dd className="mt-1 font-mono text-xs text-[var(--isalwa-slate)]">{entry.correlationId}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {entry.hasBefore ? <StatusPill tone="neutral">Antes</StatusPill> : null}
            {entry.hasAfter ? <StatusPill tone="neutral">Después</StatusPill> : null}
          </div>

          {entry.beforeJson != null ? (
            <section aria-label={snapshotSectionTitle('before')}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                {snapshotSectionTitle('before')}
              </h3>
              <pre className="mt-2 max-h-48 overflow-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-3 text-xs text-[var(--isalwa-kiln)]">
                {formatAuditSnapshot(entry.beforeJson)}
              </pre>
            </section>
          ) : null}

          {entry.afterJson != null ? (
            <section aria-label={snapshotSectionTitle('after')}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
                {snapshotSectionTitle('after')}
              </h3>
              <pre className="mt-2 max-h-48 overflow-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-3 text-xs text-[var(--isalwa-kiln)]">
                {formatAuditSnapshot(entry.afterJson)}
              </pre>
            </section>
          ) : null}

          <AuditAiAskStub entryId={entry.id} />

          <Link
            href={closeHref}
            className="inline-flex text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
          >
            Cerrar detalle
          </Link>
        </div>
      ) : null}
    </ContextDrawer>
  );
}
