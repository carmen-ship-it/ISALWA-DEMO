'use client';

import { useMemo, useState } from 'react';
import { EmptyState, SectionHeader } from '@isalwa/ui';
import type { InternalNotification } from '@isalwa/os-contracts';
import { NotificationList } from '@/components/notifications/notification-list';
import { NOTIFICATION_COPY, unreadCountLabel } from '@/lib/notifications/copy';
import { notificationPersistence } from '@/lib/notifications/persistence';
import { partitionNotificationRows } from '@/lib/notifications/partition';
import { countUnreadOpen } from '@/lib/notifications/view';

type NotificationCenterProps = {
  items: readonly InternalNotification[];
};

export function NotificationCenter({ items }: NotificationCenterProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Map<string, string>>(() => new Map());

  const merged = useMemo(() => {
    if (overlay.size === 0) return items;
    return items.map((item) => {
      const readAt = overlay.get(item.id);
      return readAt ? { ...item, readAt } : item;
    });
  }, [items, overlay]);

  const sections = partitionNotificationRows(merged);
  const unread = unreadCountLabel(countUnreadOpen(merged));

  async function onMarkRead(notificationId: string) {
    const readAt = new Date().toISOString();
    const result = await notificationPersistence().markRead(notificationId, readAt);
    setOverlay((prev) => new Map(prev).set(notificationId, readAt));
    if (!result.persisted) setNotice(NOTIFICATION_COPY.notMarkedRead);
  }

  const hasRows = sections.nuevas.length + sections.anteriores.length > 0;

  return (
    <section data-persistence="not_persisted" aria-labelledby="notification-heading">
      <SectionHeader
        kicker={NOTIFICATION_COPY.kicker}
        title={
          <h2
            id="notification-heading"
            className="font-[var(--isalwa-font-display)] text-lg text-[var(--isalwa-kiln)] italic"
          >
            {NOTIFICATION_COPY.title}
          </h2>
        }
        action={<span className="text-sm text-[var(--isalwa-slate)]">{unread}</span>}
      />
      <p className="mb-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.inProductOnly}</p>
      <p className="mb-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.readDoesNotCompleteWork}</p>
      <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.notStored}</p>
      {notice ? (
        <p className="mb-4 text-sm text-[var(--isalwa-slate)]" role="status">
          {notice}
        </p>
      ) : null}
      {!hasRows ? (
        <EmptyState title={NOTIFICATION_COPY.empty} />
      ) : (
        <div className="space-y-8">
          {sections.nuevas.length > 0 ? (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-slate)]">
                {NOTIFICATION_COPY.sectionNew}
              </h3>
              <NotificationList rows={sections.nuevas} onMarkRead={onMarkRead} />
            </div>
          ) : null}
          {sections.anteriores.length > 0 ? (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-slate)]">
                {NOTIFICATION_COPY.sectionEarlier}
              </h3>
              <NotificationList rows={sections.anteriores} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
