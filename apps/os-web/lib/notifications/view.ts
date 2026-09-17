import {
  notificationReadState,
  notificationResolution,
  type InternalNotification,
  type NotificationReadState,
} from '@isalwa/os-contracts';
import { NOTIFICATION_COPY, notificationKindLabel, notificationReadLabel } from '@/lib/notifications/copy';
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
  urgencyTone: NotificationTone;
  resolved: boolean;
  href: string;
  linkLabel: string;
  ctaLabel: string;
};

export function notificationRowView(notification: InternalNotification): NotificationRowView | null {
  const href = notificationRecordHref(notification.source);
  if (!href) return null;
  const readState = notificationReadState(notification);
  const overdue = notification.kind === 'work_overdue' || notification.body?.includes('Vencido');
  const dueSoon =
    notification.kind === 'work_due' &&
    (notification.body?.includes('Vence pronto') || notification.body?.includes('Vence ahora'));
  const urgencyTone: NotificationTone = overdue ? 'neutral' : dueSoon ? 'info' : 'neutral';
  const ctaLabel =
    notification.source.recordType === 'approval_request'
      ? NOTIFICATION_COPY.ctaReview
      : notificationLinkLabel(notification.source.recordType);
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    kindLabel: notificationKindLabel(notification.kind),
    readState,
    readLabel: notificationReadLabel(readState),
    readTone: readState === 'unread' ? 'info' : 'neutral',
    urgencyTone,
    resolved: notificationResolution(notification) === 'resolved',
    href,
    linkLabel: notificationLinkLabel(notification.source.recordType),
    ctaLabel,
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
