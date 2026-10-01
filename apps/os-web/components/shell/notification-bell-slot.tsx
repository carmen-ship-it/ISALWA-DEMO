'use client';

import type { ReactNode } from 'react';

/**
 * Mount point for UX-5 NotificationBell. Shell owns layout only — no notification logic here.
 */
export function NotificationBellSlot({ children }: { children?: ReactNode }) {
  return (
    <div
      data-shell-slot="notification-bell"
      className="flex shrink-0 items-center"
      aria-hidden={children ? undefined : true}
    >
      {children ?? (
        <span className="sr-only" data-shell-slot-placeholder="notification-bell">
          Notificaciones
        </span>
      )}
    </div>
  );
}
