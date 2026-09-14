'use client';

import { useState } from 'react';
import { Button, EmptyState, SectionHeader } from '@isalwa/ui';
import type { InternalNotification } from '@isalwa/os-contracts';
import { NotificationList } from '@/components/notifications/notification-list';
import { NOTIFICATION_COPY, unreadCountLabel } from '@/lib/notifications/copy';
import { notificationPersistence } from '@/lib/notifications/persistence';
import { countUnreadOpen, presentNotificationRows } from '@/lib/notifications/view';

type NotificationCenterProps = {
  items: readonly InternalNotification[];
};

export function NotificationCenter({ items }: NotificationCenterProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const visible = presentNotificationRows(items);
  const unread = unreadCountLabel(countUnreadOpen(items));

  async function onMarkRead(notificationId: string) {
    const result = await notificationPersistence().markRead(notificationId, new Date().toISOString());
    if (!result.persisted) setNotice(NOTIFICATION_COPY.notMarkedRead);
  }

  return (
    <section data-persistence="not_persisted" aria-labelledby="notification-heading">
      <SectionHeader
        kicker={NOTIFICATION_COPY.kicker}
        title={
          <h2 id="notification-heading" className="font-[var(--isalwa-font-display)] text-lg text-[var(--isalwa-kiln)] italic">
            {NOTIFICATION_COPY.title}
          </h2>
        }
        action={<span className="text-sm text-[var(--isalwa-slate)]">{unread}</span>}
      />
      <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.notStored}</p>
      {notice ? (
        <p className="mb-4 text-sm text-[var(--isalwa-slate)]" role="status">
          {notice}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <EmptyState title={NOTIFICATION_COPY.empty} />
      ) : (
        <>
          <NotificationList items={items} />
          <div className="mt-4 flex flex-wrap gap-2">
            {visible
              .filter((row) => row.readState === 'unread' && !row.resolved)
              .map((row) => (
                <Button key={row.id} variant="secondary" size="sm" type="button" onClick={() => onMarkRead(row.id)}>
                  {NOTIFICATION_COPY.markRead}
                  <span className="sr-only">: {row.title}</span>
                </Button>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
