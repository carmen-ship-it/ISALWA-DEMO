'use client';

import type { ReactNode } from 'react';
import type { GuideViewer } from '@/lib/walkthrough/journeys';
import { GuidePanel } from './guide-panel';
import { GuideProvider } from './guide-provider';
import { IntroWelcome } from './intro-welcome';
import { IntroCoach } from './intro-coach';
import { MicroTourCoach } from './micro-tour-coach';

/**
 * Persistent onboarding shell with first-use intro and journey panel.
 * Children stay mounted — this is not a tooltip overlay that unmounts when
 * a page target disappears.
 * 
 * Renders:
 * - IntroWelcome: welcome card on first eligible login (before welcomeSeen)
 * - IntroCoach: compact coach during first-use sequence (after welcome, before completed/skipped)
 * - MicroTourCoach: contextual page tours after intro is done/skipped
 * - GuidePanel: legacy multi-journey panel (for replay from Ayuda)
 * 
 * Optional `viewer` hides a journey the viewer cannot open.
 */
export function WalkthroughShell({
  children,
  viewer,
  storageScopeKey = null,
}: {
  children: ReactNode;
  viewer?: GuideViewer;
  /** Trusted shell actorKey — scopes onboarding localStorage per member. */
  storageScopeKey?: string | null;
}) {
  return (
    <GuideProvider viewer={viewer} storageScopeKey={storageScopeKey}>
      {children}
      <IntroWelcome />
      <IntroCoach />
      <MicroTourCoach />
      <GuidePanel />
    </GuideProvider>
  );
}
