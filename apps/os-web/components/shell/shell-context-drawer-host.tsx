'use client';

import type { ReactNode } from 'react';

export const SHELL_CONTEXT_DRAWER_HOST_ID = 'shell-context-drawer-host';

/**
 * Global mount for quick-view / context drawer previews.
 * Route surfaces render drawers via QuickViewHost; this host keeps a stable shell anchor.
 */
export function ShellContextDrawerHost({ children }: { children?: ReactNode }) {
  return (
    <div
      id={SHELL_CONTEXT_DRAWER_HOST_ID}
      data-shell-context-drawer-host
      className="contents"
    >
      {children}
    </div>
  );
}
