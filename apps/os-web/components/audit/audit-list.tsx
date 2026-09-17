import Link from 'next/link';
import { ListRow } from '@isalwa/ui';
import type { AuditLogItem } from '@/lib/audit/types';
import { auditoriaEntryHref, type AuditQueryState } from '@/lib/audit/url-state';

type AuditListProps = {
  path?: string;
  items: AuditLogItem[];
  listState: AuditQueryState;
  memberLabels: Map<string, string>;
  partyLabels: Map<string, string>;
  selectedEntryId?: string;
};

function actorLabel(
  item: AuditLogItem,
  memberLabels: Map<string, string>,
): string {
  if (!item.actorMemberId) return 'Sistema';
  return memberLabels.get(item.actorMemberId) ?? 'Persona';
}

function clientLabel(
  item: AuditLogItem,
  partyLabels: Map<string, string>,
): string | null {
  if (item.resourceType !== 'party') return null;
  return partyLabels.get(item.resourceId) ?? 'Cliente';
}

export function AuditList({
  path = '/auditoria',
  items,
  listState,
  memberLabels,
  partyLabels,
  selectedEntryId,
}: AuditListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]">
      {items.map((item) => {
        const selected = item.id === selectedEntryId;
        const cliente = clientLabel(item, partyLabels);
        return (
          <ListRow key={item.id} as="li" className={selected ? 'bg-[color-mix(in_srgb,var(--isalwa-mist)_35%,white)]' : undefined}>
            <Link
              href={auditoriaEntryHref(path, listState, item.id)}
              className="flex min-w-0 flex-1 flex-col gap-1 outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              aria-current={selected ? 'true' : undefined}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{item.actionLabel}</p>
                <time className="shrink-0 text-xs text-[var(--isalwa-slate)]" dateTime={item.occurredAt}>
                  {new Date(item.occurredAt).toLocaleString('es-BO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
              <p className="text-sm text-[var(--isalwa-slate)]">
                {item.resourceLabel}
                {cliente ? ` · ${cliente}` : null}
                {' · '}
                {actorLabel(item, memberLabels)}
              </p>
              {(item.hasBefore || item.hasAfter) && (
                <p className="text-xs text-[var(--isalwa-slate)]">
                  {item.hasBefore && item.hasAfter
                    ? 'Incluye estado anterior y posterior'
                    : item.hasAfter
                      ? 'Incluye estado posterior'
                      : 'Incluye estado anterior'}
                </p>
              )}
            </Link>
          </ListRow>
        );
      })}
    </ul>
  );
}
