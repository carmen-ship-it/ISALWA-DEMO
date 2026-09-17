'use client';

import type { ReactNode } from 'react';
import { GuideProvider, type GuideViewer } from './guide-provider';
import { IntroWelcome } from './intro-welcome';

/**
 * Onboarding shell: first-use welcome only. Full guided walkthrough is Story Mode.
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
    </GuideProvider>
  );
}
