import Link from 'next/link';
import { EmptyState, OperatingRow, PageSection, SectionHeader } from '@isalwa/ui';
import type { MemoryChangeItem } from '@/lib/audit/types';

const ROW_CAP = 8;

export function InicioWhatChanged({
  items,
  windowLabel,
}: {
  items: readonly MemoryChangeItem[];
  windowLabel: string;
}) {
  const rows = items.slice(0, ROW_CAP);
  return (
    <PageSection card className="min-w-0 p-3 md:p-4">
      <SectionHeader
        title="Qué cambió"
        action={
          <Link
            href="/auditoria"
            className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
          >
            Ver auditoría
          </Link>
        }
        className="mb-2"
      />
      <p className="mb-2 px-3 text-xs text-[var(--isalwa-slate)]">{windowLabel}</p>
      {rows.length === 0 ? (
        <EmptyState
          title="Sin cambios en esta ventana"
          description="Cuando ocurran eventos de la empresa que usted pueda ver, aparecerán aquí."
        />
      ) : (
        <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Qué cambió">
          {rows.map((item) => (
            <li key={item.id} className="list-none">
              <OperatingRow
                density="compact"
                subject={item.eventLabel}
                meta={[item.entityLabel, formatOccurredAt(item.occurredAt)].filter(Boolean).join(' · ')}
              />
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

function formatOccurredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
