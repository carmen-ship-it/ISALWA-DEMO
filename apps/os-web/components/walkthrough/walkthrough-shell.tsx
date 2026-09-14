'use client';

import type { ReactNode } from 'react';
import type { GuideViewer } from '@/lib/walkthrough/journeys';
import { GuidePanel } from './guide-panel';
import { GuideProvider } from './guide-provider';

/**
 * Persistent journey panel. Children stay mounted — this is not a tooltip
 * overlay that unmounts when a page target disappears.
 * Optional `viewer` hides a journey the viewer cannot open. The shell does
 * not pass it yet; nav links still hide a concrete page missing from the nav.
 */
export function WalkthroughShell({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer?: GuideViewer;
}) {
  return (
    <GuideProvider viewer={viewer}>
      {children}
      <GuidePanel />
    </GuideProvider>
  );
}
