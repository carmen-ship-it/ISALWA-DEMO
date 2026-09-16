import { EmptyPanel, PageSection, Timeline, type TimelineItem } from '@isalwa/ui';
import type { MemberAccessHistoryEntryReadModel } from '@isalwa/os-contracts';
import { formatTimestamp } from '@/lib/workforce/labels';
import { directoryMemberLabel } from '@/lib/workforce/member-labels';

type MemberAccessHistoryPanelProps = {
  items: MemberAccessHistoryEntryReadModel[];
  directory: Map<string, string>;
};

export function MemberAccessHistoryPanel({ items, directory }: MemberAccessHistoryPanelProps) {
  const timeline: TimelineItem[] = items.map((entry) => ({
    id: entry.id,
    label: entry.label,
    meta: formatTimestamp(entry.occurredAt),
    body: (
      <div className="space-y-1 text-sm text-[var(--isalwa-slate)]">
        {entry.detail ? <p>{entry.detail}</p> : null}
        {entry.actorMemberId ? (
          <p className="text-[var(--isalwa-text-xs)]">
            Registrado por {directoryMemberLabel(directory, entry.actorMemberId)}
          </p>
        ) : null}
      </div>
    ),
  }));

  return (
    <PageSection card className="p-8">
      <p className="isalwa-section-label">Historial de acceso</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Cambios recientes de rol, responsable, suspensión y delegación en esta organización.
      </p>
      <div className="mt-8">
        {timeline.length > 0 ? (
          <Timeline items={timeline} />
        ) : (
          <EmptyPanel title="Sin registros recientes" description="Aún no hay eventos de acceso para mostrar." />
        )}
      </div>
    </PageSection>
  );
}
