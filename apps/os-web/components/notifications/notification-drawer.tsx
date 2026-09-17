'use client';

import { useMemo, useState } from 'react';
import { ContextDrawer } from '@isalwa/ui';
import type { AttentionItemReadModel, InternalNotification, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { NOTIFICATION_COPY } from '@/lib/notifications/copy';
import { projectInboxFromAttention } from '@/lib/notifications/project';
import { countUnreadOpen } from '@/lib/notifications/view';

export type NotificationDrawerHostProps = {
  organizationId: string;
  recipientMemberId: string;
  attention: readonly AttentionItemReadModel[];
  work?: readonly WorkSummaryReadModel[];
  /** Pre-projected items override Attention projection when supplied. */
  items?: readonly InternalNotification[];
};

/**
 * Shell mount: bell + right drawer. Projects Attention/Work — no external channel.
 */
export function NotificationDrawerHost({
  organizationId,
  recipientMemberId,
  attention,
  work,
  items,
}: NotificationDrawerHostProps) {
  const [open, setOpen] = useState(false);

  const inbox = useMemo(() => {
    if (items) return items;
    return projectInboxFromAttention({
      organizationId,
      recipientMemberId,
      attention,
      work,
    });
  }, [items, organizationId, recipientMemberId, attention, work]);

  const unreadCount = countUnreadOpen(inbox);

  return (
    <>
      <NotificationBell unreadCount={unreadCount} onClick={() => setOpen(true)} pressed={open} />
      <ContextDrawer open={open} title={NOTIFICATION_COPY.drawerTitle} onClose={() => setOpen(false)}>
        <NotificationCenter items={inbox} />
      </ContextDrawer>
    </>
  );
}

export type NotificationDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: readonly InternalNotification[];
  dueAtByNotificationId?: Readonly<Record<string, string | null>>;
};

/** Drawer body for a pre-projected inbox (shell may supply Attention projection upstream). */
export function NotificationDrawer({ open, onClose, items }: NotificationDrawerProps) {
  return (
    <ContextDrawer open={open} title={NOTIFICATION_COPY.drawerTitle} onClose={onClose}>
      <NotificationCenter items={items} />
    </ContextDrawer>
  );
}

export { NotificationBell, NotificationCenter };
