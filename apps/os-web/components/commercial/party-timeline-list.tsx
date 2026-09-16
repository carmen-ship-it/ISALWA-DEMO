import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import { formatTimestamp } from '@/lib/commercial/labels';
import {
  HISTORIAL_SCOPE_COPY,
  timelineEntrySummary,
  timelineEventLabel,
} from '@/lib/commercial/timeline-labels';

type PartyTimelineListProps = {
  items: PartyTimelineEntryReadModel[];
  memberLabels?: Map<string, string>;
};

export function PartyTimelineList({ items, memberLabels }: PartyTimelineListProps) {
  return (
    <>
      <p className="mb-4 text-sm text-[var(--isalwa-slate)]">{HISTORIAL_SCOPE_COPY}</p>
      <ol
        className="divide-y divide-[var(--isalwa-mist)]"
        aria-label="Actividad del cliente, comercial, trabajo y aprobaciones, más reciente primero"
      >
        {items.map((entry) => {
          const actor =
            entry.actorMemberId && memberLabels
              ? memberLabels.get(entry.actorMemberId)
              : null;
          return (
            <li key={entry.entryId} className="bg-white py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-[var(--isalwa-kiln)]">
                  {timelineEventLabel(entry.eventType, entry.facts)}
                </p>
                <time
                  className="text-sm text-[var(--isalwa-slate)]"
                  dateTime={entry.occurredAt}
                >
                  {formatTimestamp(entry.occurredAt)}
                </time>
              </div>
              {actor ? (
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Por {actor}</p>
              ) : null}
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                {timelineEntrySummary(entry)}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
