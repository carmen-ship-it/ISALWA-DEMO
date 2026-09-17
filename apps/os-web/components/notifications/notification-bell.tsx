'use client';

import { Bell } from 'lucide-react';
import { NOTIFICATION_COPY, unreadCountLabel } from '@/lib/notifications/copy';

type NotificationBellProps = {
  unreadCount: number;
  onClick: () => void;
  pressed?: boolean;
};

export function NotificationBell({ unreadCount, onClick, pressed = false }: NotificationBellProps) {
  const label =
    unreadCount > 0
      ? `${NOTIFICATION_COPY.bellLabel}. ${unreadCountLabel(unreadCount)}`
      : NOTIFICATION_COPY.bellLabel;

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={pressed}
      aria-haspopup="dialog"
      data-tour="shell-notifications"
      className="isalwa-t-fast relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-slate)] outline-none hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
      onClick={onClick}
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--isalwa-glaze)] px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
