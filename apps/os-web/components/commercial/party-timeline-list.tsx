import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import type { ReactNode } from 'react';
import { Timeline, type TimelineItem } from '@isalwa/ui';
import { formatTimestamp } from '@/lib/commercial/labels';
import { timelineEntryHref } from '@/lib/commercial/pedido-timeline';
import {
  HISTORIAL_SCOPE_COPY,
  timelineEntrySummary,
  timelineEventLabel,
} from '@/lib/commercial/timeline-labels';

type PartyTimelineListProps = {
  items: PartyTimelineEntryReadModel[];
  memberLabels?: Map<string, string>;
};

function toneForEvent(eventType: string): string {
  if (eventType.includes('approv') || eventType.includes('pending')) {
    return 'var(--isalwa-warning)';
  }
  if (
    eventType.includes('cancel') ||
    eventType.includes('reject') ||
    eventType.includes('fail') ||
    eventType.includes('block')
  ) {
    return 'var(--isalwa-danger)';
  }
  if (
    eventType.includes('deliver') ||
    eventType.includes('convert') ||
    eventType.includes('accept') ||
    eventType.includes('complete') ||
    eventType.includes('confirm')
  ) {
    return 'var(--isalwa-success)';
  }
  return 'var(--isalwa-glaze)';
}

function toTimelineItems(
  items: PartyTimelineEntryReadModel[],
  memberLabels?: Map<string, string>,
): TimelineItem[] {
  return items.map((entry) => {
    const actor =
      entry.actorMemberId && memberLabels ? memberLabels.get(entry.actorMemberId) : null;
    const href = timelineEntryHref(entry);
    const meta: ReactNode = (
      <time className="text-sm text-[var(--isalwa-slate)]" dateTime={entry.occurredAt}>
        {formatTimestamp(entry.occurredAt)}
      </time>
    );
    const body: ReactNode = (
      <>
        {actor ? <p className="text-sm text-[var(--isalwa-slate)]">Por {actor}</p> : null}
        <p className={actor ? 'mt-1 text-sm text-[var(--isalwa-slate)]' : 'text-sm text-[var(--isalwa-slate)]'}>
          {timelineEntrySummary(entry)}
        </p>
        {href ? (
          <p className="mt-2">
            <a
              href={href}
              className="isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
            >
              Abrir
            </a>
          </p>
        ) : null}
      </>
    );

    return {
      id: entry.entryId,
      label: timelineEventLabel(entry.eventType, entry.facts),
      tone: toneForEvent(entry.eventType),
      meta,
      body,
    };
  });
}

export function PartyTimelineList({ items, memberLabels }: PartyTimelineListProps) {
  return (
    <div aria-label="Actividad del cliente, comercial, trabajo y aprobaciones, más reciente primero">
      <p className="mb-4 text-sm text-[var(--isalwa-slate)]">{HISTORIAL_SCOPE_COPY}</p>
      <Timeline items={toTimelineItems(items, memberLabels)} />
    </div>
  );
}
