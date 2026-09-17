import { notificationReadState, type InternalNotification } from '@isalwa/os-contracts';
import { presentNotificationRows, type NotificationRowView } from '@/lib/notifications/view';

export type NotificationSections = {
  nuevas: NotificationRowView[];
  anteriores: NotificationRowView[];
};

export function partitionNotificationRows(items: readonly InternalNotification[]): NotificationSections {
  const rows = presentNotificationRows(items);
  const nuevas: NotificationRowView[] = [];
  const anteriores: NotificationRowView[] = [];
  for (const row of rows) {
    const unreadOpen = row.readState === 'unread' && !row.resolved;
    if (unreadOpen) nuevas.push(row);
    else anteriores.push(row);
  }
  return { nuevas, anteriores };
}

export function isUnreadOpen(notification: Pick<InternalNotification, 'readAt' | 'resolvedAt'>): boolean {
  return notificationReadState(notification) === 'unread' && notification.resolvedAt === null;
}
