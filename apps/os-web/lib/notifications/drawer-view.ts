import { notificationReadState, notificationResolution, type InternalNotification } from '@isalwa/os-contracts';
import { dueTimingBand, dueTimingEmphasis, dueTimingLabel, type DueTimingBand } from '@/lib/anticipation/due-timing';
import { NOTIFICATION_COPY, notificationKindLabel } from '@/lib/notifications/copy';
import { notificationLinkLabel, notificationRecordHref } from '@/lib/notifications/links';
import { notificationRowView, type NotificationRowView } from '@/lib/notifications/view';

export type NotificationDrawerRow = NotificationRowView & {
  section: 'new' | 'earlier';
  createdAt: string;
  timeLabel: string;
  dueBand: DueTimingBand | null;
  dueLabel: string | null;
  emphasis: 'none' | 'amber' | 'urgent';
};

export type NotificationDrawerSections = {
  newItems: NotificationDrawerRow[];
  earlierItems: NotificationDrawerRow[];
  unreadCount: number;
};

export function formatNotificationTime(iso: string, nowMs: number): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return '';
  const delta = nowMs - parsed;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return 'Ahora';
  if (delta < hour) return `Hace ${Math.floor(delta / minute)} min`;
  if (delta < day) return `Hace ${Math.floor(delta / hour)} h`;
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

function drawerRow(
  notification: InternalNotification,
  nowMs: number,
  dueAt?: string | null,
): NotificationDrawerRow | null {
  const base = notificationRowView(notification);
  if (!base) return null;
  const readState = notificationReadState(notification);
  const resolved = notificationResolution(notification) === 'resolved';
  const section = readState === 'unread' && !resolved ? 'new' : 'earlier';
  const dueBand = dueAt !== undefined ? dueTimingBand(dueAt, nowMs) : null;
  return {
    ...base,
    section,
    createdAt: notification.createdAt,
    timeLabel: formatNotificationTime(notification.createdAt, nowMs),
    dueBand,
    dueLabel: dueLabelForRow(notification, dueBand),
    emphasis: dueTimingEmphasis(dueBand),
  };
}

function dueLabelForRow(notification: InternalNotification, band: DueTimingBand | null): string | null {
  if (notification.kind === 'work_overdue' || notification.kind === 'commitment_overdue') {
    return dueTimingLabel('past_due');
  }
  if (notification.kind === 'work_due' || notification.kind === 'commitment_due') {
    return dueTimingLabel(band) ?? notificationKindLabel(notification.kind);
  }
  return dueTimingLabel(band);
}

export function presentNotificationDrawer(
  items: readonly InternalNotification[],
  input: { nowMs: number; dueAtByNotificationId?: Readonly<Record<string, string | null>> },
): NotificationDrawerSections {
  const rows = items.flatMap((item) => {
    const dueAt = input.dueAtByNotificationId?.[item.id];
    const row = drawerRow(item, input.nowMs, dueAt ?? null);
    return row ? [row] : [];
  });
  const newItems = rows.filter((row) => row.section === 'new');
  const earlierItems = rows.filter((row) => row.section === 'earlier');
  const unreadCount = newItems.length;
  return { newItems, earlierItems, unreadCount };
}

export function drawerSectionTitle(section: 'new' | 'earlier'): string {
  return section === 'new' ? NOTIFICATION_COPY.sectionNew : NOTIFICATION_COPY.sectionEarlier;
}

export function notificationRecordHrefOrThrow(source: InternalNotification['source']): string {
  const href = notificationRecordHref(source);
  if (!href) throw new Error('notification_missing_href');
  return href;
}

export function drawerCtaLabel(recordType: InternalNotification['source']['recordType']): string {
  if (recordType === 'approval_request') return NOTIFICATION_COPY.ctaReview;
  return notificationLinkLabel(recordType);
}
