import { ListRow, StatusPill } from '@isalwa/ui';
import type { NotificationRowView } from '@/lib/notifications/view';
import { NOTIFICATION_COPY } from '@/lib/notifications/copy';

type NotificationListProps = {
  rows: readonly NotificationRowView[];
  onMarkRead?: (notificationId: string) => void;
};

export function NotificationList({ rows, onMarkRead }: NotificationListProps) {
  if (rows.length === 0) return null;
  return (
    <ul className="min-w-0" aria-label="Avisos">
      {rows.map((row) => (
        <ListRow key={row.id} as="li" className={row.readState === 'unread' && !row.resolved ? 'bg-[var(--isalwa-sky)]' : undefined} data-notification-unread={row.readState === 'unread' && !row.resolved ? 'true' : undefined}>
          <div className="min-w-0">
            <p className="isalwa-section-label">{row.kindLabel}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--isalwa-kiln)]">{row.title}</p>
            {row.body ? <p className="mt-1 line-clamp-2 text-sm text-[var(--isalwa-slate)]">{row.body}</p> : null}
            <a
              href={row.href}
              className="mt-2 inline-block text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
            >
              {row.ctaLabel}
            </a>
            {row.resolved ? (
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.resolvedWhy}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {row.body?.includes('Vence pronto') || row.body?.includes('Vence ahora') ? (
              <StatusPill tone={row.urgencyTone}>{row.body.split(' · ')[0]}</StatusPill>
            ) : null}
            <StatusPill tone={row.readTone}>{row.readLabel}</StatusPill>
            {row.resolved ? <StatusPill tone="success">{NOTIFICATION_COPY.resolved}</StatusPill> : null}
            {onMarkRead && row.readState === 'unread' && !row.resolved ? (
              <button
                type="button"
                className="text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
                onClick={() => onMarkRead(row.id)}
              >
                {NOTIFICATION_COPY.markRead}
              </button>
            ) : null}
          </div>
        </ListRow>
      ))}
    </ul>
  );
}
