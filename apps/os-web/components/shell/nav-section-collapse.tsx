'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@isalwa/ui';
import { navSectionIsOpen } from '@/lib/navigation/nav-active';
import type { NavGroup } from '@/lib/navigation/nav-config';

const STORAGE_KEY = 'isalwa.nav.collapsedGroups';

type NavSectionCollapseProps = {
  group: NavGroup;
  label: string;
  /** True when any item in this section is the active route. */
  containsActive: boolean;
  /** Mobile drawer defaults non-active groups collapsed. */
  mobile?: boolean;
  /** Icon-rail mode — no section chrome. */
  collapsedRail?: boolean;
  children: ReactNode;
};

function readStored(): Partial<Record<NavGroup, boolean>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<NavGroup, boolean>>;
  } catch {
    return {};
  }
}

function writeStored(next: Partial<Record<NavGroup, boolean>>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/**
 * Collapsible sidebar section. Active group always expands.
 * Session preference for manually collapsed inactive groups.
 */
export function NavSectionCollapse({
  group,
  label,
  containsActive,
  mobile = false,
  collapsedRail = false,
  children,
}: NavSectionCollapseProps) {
  const [manualCollapsed, setManualCollapsed] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (typeof stored[group] === 'boolean') {
      setManualCollapsed(stored[group]!);
      return;
    }
    // Mobile default: collapse inactive groups to reduce vertical bloat.
    if (mobile && !containsActive && group !== 'inicio') {
      setManualCollapsed(true);
    }
  }, [group, mobile, containsActive]);

  const open = useMemo(() => navSectionIsOpen(containsActive, manualCollapsed), [containsActive, manualCollapsed]);

  if (collapsedRail) {
    return <div className="flex flex-col gap-1">{children}</div>;
  }

  function toggle() {
    if (containsActive) return;
    const next = !manualCollapsed;
    setManualCollapsed(next);
    const stored = readStored();
    stored[group] = next;
    writeStored(stored);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={cx(
          'flex w-full items-center justify-between gap-2 rounded-[var(--isalwa-radius-control)] px-3.5 py-1 text-left outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
          'text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-white)] hover:text-[var(--isalwa-kiln)]',
        )}
        aria-expanded={open}
        onClick={toggle}
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden
          className={cx('shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
        />
      </button>
      {open ? children : null}
    </div>
  );
}
