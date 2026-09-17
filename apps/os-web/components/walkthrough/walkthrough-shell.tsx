'use client';

import type { ReactNode } from 'react';
import type { GuideViewer } from '@/lib/walkthrough/journeys';
import { GuideProvider } from './guide-provider';
import { IntroWelcome } from './intro-welcome';
import { IntroCoach } from './intro-coach';
import { MicroTourCoach } from './micro-tour-coach';

/**
 * Persistent onboarding shell with first-use intro and contextual coaches.
 * Children stay mounted — this is not a tooltip overlay that unmounts when
 * a page target disappears.
 *
 * Renders:
 * - IntroWelcome: welcome card on first eligible login (before welcomeSeen)
 * - IntroCoach: compact coach during first-use sequence (after welcome, before completed/skipped)
 * - MicroTourCoach: contextual page tours after intro is done/skipped
 *
 * The legacy floating multi-journey "Mostrar recorrido" / GuidePanel was removed.
 * The canonical full owner walkthrough is Story Mode ("Ver recorrido completo").
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
    </GuideProvider>
  );
}
