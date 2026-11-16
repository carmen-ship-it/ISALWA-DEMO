'use client';

import { useMemo, useState } from 'react';
import { EmptyState, SectionHeader } from '@isalwa/ui';
import type { InternalNotification } from '@isalwa/os-contracts';
import { NotificationList } from '@/components/notifications/notification-list';
import { NOTIFICATION_COPY, unreadCountLabel } from '@/lib/notifications/copy';
import { acknowledgeNotificationAction, markNotificationReadAction } from '@/lib/notifications/actions';
import { partitionNotificationRows } from '@/lib/notifications/partition';
import { countUnreadOpen } from '@/lib/notifications/view';

type NotificationCenterProps = {
  items: readonly InternalNotification[];
};

export function NotificationCenter({ items }: NotificationCenterProps) {
  const [notice, setNotice] = useState<string | null>(null);
  // What the member just did in this session, until the next load brings the stored state.
  const [overlay, setOverlay] = useState<Map<string, { readAt?: string; acknowledgedAt?: string }>>(() => new Map());

  const merged = useMemo(() => {
    if (overlay.size === 0) return items;
    return items.map((item) => {
      const local = overlay.get(item.id);
      return local ? { ...item, ...local } : item;
    });
  }, [items, overlay]);

  const sections = partitionNotificationRows(merged);
  const unread = unreadCountLabel(countUnreadOpen(merged));

  function remember(notificationId: string, patch: { readAt?: string; acknowledgedAt?: string }) {
    setOverlay((prev) => new Map(prev).set(notificationId, { ...prev.get(notificationId), ...patch }));
  }

  async function onMarkRead(notificationId: string) {
    setNotice(null);
    // Rows computed from Attention and Work are not stored; only the view changes.
    if (notificationId.startsWith('proj:')) {
      remember(notificationId, { readAt: new Date().toISOString() });
      setNotice(NOTIFICATION_COPY.notMarkedRead);
      return;
    }
    const result = await markNotificationReadAction(notificationId);
    if (!result.ok) {
      setNotice(NOTIFICATION_COPY.markFailed);
      return;
    }
    remember(notificationId, { readAt: result.item.readAt ?? undefined });
  }

  async function onAcknowledge(notificationId: string) {
    setNotice(null);
    const result = await acknowledgeNotificationAction(notificationId);
    if (!result.ok) {
      setNotice(NOTIFICATION_COPY.markFailed);
      return;
    }
    remember(notificationId, { acknowledgedAt: result.item.acknowledgedAt ?? undefined });
  }

  const hasRows = sections.nuevas.length + sections.anteriores.length > 0;

  return (
    <section aria-labelledby="notification-heading">
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
      <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">{NOTIFICATION_COPY.persistedNote}</p>
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
              <NotificationList rows={sections.nuevas} onMarkRead={onMarkRead} onAcknowledge={onAcknowledge} />
            </div>
          ) : null}
          {sections.anteriores.length > 0 ? (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-slate)]">
                {NOTIFICATION_COPY.sectionEarlier}
              </h3>
              <NotificationList rows={sections.anteriores} onAcknowledge={onAcknowledge} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
