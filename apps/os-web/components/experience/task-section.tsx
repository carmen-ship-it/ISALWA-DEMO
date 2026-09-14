'use client';

import { useState, type ReactNode } from 'react';
import { Button, ContextDrawer } from '@isalwa/ui';

type TaskSectionProps = {
  title: ReactNode;
  kicker?: string;
  drawerLabel?: string;
  drawerTitle: string;
  drawer: ReactNode;
  children: ReactNode;
  id?: string;
};

/**
 * Use TaskSection to group a compact block under a sticky title slot.
 * Pass the title and the drawer body; the header trigger opens the shared ContextDrawer and does not load or display data of its own.
 */
export function TaskSection({
  title,
  kicker,
  drawerLabel = 'Abrir detalle',
  drawerTitle,
  drawer,
  children,
  id,
}: TaskSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      id={id}
      className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-soft)]"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_88%,white)] px-4 py-2 backdrop-blur-md">
        <div className="min-w-0">
          {kicker ? <p className="isalwa-kicker">{kicker}</p> : null}
          <div className="truncate text-[var(--isalwa-text-sm)] font-semibold text-[var(--isalwa-kiln)]">
            {title}
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {drawerLabel}
        </Button>
      </header>
      <div className="px-3 py-2">{children}</div>
      <ContextDrawer open={open} title={drawerTitle} onClose={() => setOpen(false)}>
        {drawer}
      </ContextDrawer>
    </section>
  );
}
