'use client';

import type { ReactNode } from 'react';
import type { GuideViewer } from '@/lib/walkthrough/journeys';
import { GuidePanel } from './guide-panel';
import { GuideProvider } from './guide-provider';
import { IntroWelcome } from './intro-welcome';
import { IntroCoach } from './intro-coach';

/**
 * Persistent onboarding shell with first-use intro and journey panel.
 * Children stay mounted — this is not a tooltip overlay that unmounts when
 * a page target disappears.
 * 
 * Renders:
 * - IntroWelcome: welcome card on first eligible login (before welcomeSeen)
 * - IntroCoach: compact coach during first-use sequence (after welcome, before completed/skipped)
 * - GuidePanel: legacy multi-journey panel (for replay from Ayuda)
 * 
 * Optional `viewer` hides a journey the viewer cannot open.
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
      <IntroWelcome />
      <IntroCoach />
      <GuidePanel />
    </GuideProvider>
  );
}
