'use client';

import type { ReactNode } from 'react';
import type { GuideViewer } from '@/lib/walkthrough/journeys';
import { GuidePanel } from './guide-panel';
import { GuideProvider } from './guide-provider';

/**
 * Persistent journey panel. Children stay mounted — this is not a tooltip
 * overlay and it does not target page elements.
 * Optional `viewer.roleKeys` hides floor journeys from a finance-only viewer.
 * App shell does not pass role keys; nav links still hide a page missing from the nav.
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
