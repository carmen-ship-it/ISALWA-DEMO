'use client';

import { useState } from 'react';
import type { InternalNotification } from '@isalwa/os-contracts';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationDrawer } from '@/components/notifications/notification-drawer';
import { countUnreadOpen } from '@/lib/notifications/view';

export type NotificationBellTriggerProps = {
  items: readonly InternalNotification[];
  dueAtByNotificationId?: Readonly<Record<string, string | null>>;
};

/** Shell mount: bell + unread badge + right-side notification drawer. */
export function NotificationBellTrigger({ items, dueAtByNotificationId }: NotificationBellTriggerProps) {
  const [open, setOpen] = useState(false);
  const unread = countUnreadOpen(items);

  return (
    <>
      <NotificationBell unreadCount={unread} onClick={() => setOpen(true)} pressed={open} />
      <NotificationDrawer
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        dueAtByNotificationId={dueAtByNotificationId}
      />
    </>
  );
}
