'use client';

import type { ReactNode } from 'react';
import { WalkthroughPopover } from './walkthrough-popover';
import { WalkthroughProvider } from './walkthrough-provider';

export function WalkthroughShell({ children }: { children: ReactNode }) {
  return (
    <WalkthroughProvider>
      {children}
      <WalkthroughPopover />
    </WalkthroughProvider>
  );
}
