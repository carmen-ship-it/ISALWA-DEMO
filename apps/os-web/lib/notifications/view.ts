import {
  notificationReadState,
  notificationResolution,
  type InternalNotification,
  type NotificationReadState,
} from '@isalwa/os-contracts';
import { notificationKindLabel, notificationReadLabel } from '@/lib/notifications/copy';
import { notificationLinkLabel, notificationRecordHref } from '@/lib/notifications/links';

export type NotificationTone = 'neutral' | 'info' | 'success';

export type NotificationRowView = {
  id: string;
  title: string;
  body: string | null;
  kindLabel: string;
  readState: NotificationReadState;
  readLabel: string;
  readTone: NotificationTone;
  resolved: boolean;
  href: string;
  linkLabel: string;
};

export function notificationRowView(notification: InternalNotification): NotificationRowView | null {
  const href = notificationRecordHref(notification.source);
  if (!href) return null;
  const readState = notificationReadState(notification);
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    kindLabel: notificationKindLabel(notification.kind),
    readState,
    readLabel: notificationReadLabel(readState),
    readTone: readState === 'unread' ? 'info' : 'neutral',
    resolved: notificationResolution(notification) === 'resolved',
    href,
    linkLabel: notificationLinkLabel(notification.source.recordType),
  };
}

export function presentNotificationRows(items: readonly InternalNotification[]): NotificationRowView[] {
  return items.flatMap((item) => {
    const row = notificationRowView(item);
    return row ? [row] : [];
  });
}

export function countUnreadOpen(items: readonly InternalNotification[]): number {
  return presentNotificationRows(items).filter((row) => row.readState === 'unread' && !row.resolved).length;
}
