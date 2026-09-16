import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
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
          const href = timelineEntryHref(entry);
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
            </li>
          );
        })}
      </ol>
    </>
  );
}
