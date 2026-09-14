import { ListRow, StatusPill } from '@isalwa/ui';
import type { InternalNotification } from '@isalwa/os-contracts';
import { NOTIFICATION_COPY } from '@/lib/notifications/copy';
import { presentNotificationRows } from '@/lib/notifications/view';

type NotificationListProps = {
  items: readonly InternalNotification[];
};

export function NotificationList({ items }: NotificationListProps) {
  const rows = presentNotificationRows(items);
  if (rows.length === 0) return null;
  return (
    <ul className="min-w-0" aria-label="Avisos">
      {rows.map((row) => (
        <ListRow key={row.id} as="li">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.title}</p>
            {row.body ? <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.body}</p> : null}
            <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.kindLabel}</p>
            <a href={row.href} className="mt-2 inline-block text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
              {row.linkLabel}
            </a>
            {row.resolved ? (
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.resolvedWhy}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusPill tone={row.readTone}>{row.readLabel}</StatusPill>
            {row.resolved ? <StatusPill tone="success">{NOTIFICATION_COPY.resolved}</StatusPill> : null}
          </div>
        </ListRow>
      ))}
    </ul>
  );
}
