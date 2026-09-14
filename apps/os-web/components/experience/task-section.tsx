'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button, ContextDrawer } from '@isalwa/ui';
import { WorkState } from '@/components/experience/work-state';
import type { WorkStateKind } from '@/lib/experience/work-state';

type TaskSectionProps = {
  title: ReactNode;
  kicker?: string;
  drawerLabel?: string;
  drawerTitle: string;
  drawer: ReactNode;
  children: ReactNode;
  id?: string;
  /** Ready shows children. Any other kind replaces the body with WorkState. */
  state?: 'ready' | WorkStateKind;
  stateTitle?: string;
  stateDescription?: string;
  stateAction?: ReactNode;
  /** Always visible. Do not hide row actions until hover. */
  actions?: ReactNode;
};

/**
 * Compact operating section. The title stays sticky, the drawer trigger stays visible, and Escape closes the shared ContextDrawer.
 * Closing the drawer returns focus to the trigger. Pass a WorkState kind for empty, no-results, or permission instead of a marketing card.
 * The section does not load data of its own.
 */
export function TaskSection({
  title,
  kicker,
  drawerLabel = 'Abrir detalle',
  drawerTitle,
  drawer,
  children,
  id,
  state = 'ready',
  stateTitle,
  stateDescription,
  stateAction,
  actions,
}: TaskSectionProps) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();

  function returnFocus() {
    const node = document.getElementById(triggerId);
    if (node instanceof HTMLElement) node.focus();
  }

  function closeDrawer() {
    setOpen(false);
    window.setTimeout(() => returnFocus(), 0);
    window.setTimeout(() => returnFocus(), 60);
  }

  return (
    <section
      id={id}
      className="overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)]"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_88%,white)] px-2 py-2">
        <div className="min-w-0">
          {kicker ? <p className="isalwa-kicker">{kicker}</p> : null}
          <div className="truncate text-[var(--isalwa-text-sm)] font-semibold text-[var(--isalwa-kiln)]">
            {title}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {actions}
          <Button id={triggerId} type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {drawerLabel}
          </Button>
        </div>
      </header>
      <div className="px-2 py-2">
        {state === 'ready' ? (
          children
        ) : (
          <WorkState
            kind={state}
            title={stateTitle}
            description={stateDescription}
            action={stateAction}
          />
        )}
      </div>
      <ContextDrawer open={open} title={drawerTitle} onClose={closeDrawer}>
        {drawer}
      </ContextDrawer>
    </section>
  );
}
