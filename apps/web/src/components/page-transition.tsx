'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cx } from '@isalwa/ui';
import { pushRecentNav } from '@/lib/preferences';

const ROUTE_TITLES: Record<string, string> = {
  '/pulso': 'Pulso',
  '/radar': 'Radar',
  '/personas': 'Personas',
  '/territorio': 'Territorio',
  '/senal': 'Señal',
  '/cierre': 'Cierre',
  '/memoria': 'Memoria',
};

function recordRecent(pathname: string) {
  const base = '/' + (pathname.split('/')[1] ?? '');
  const title = ROUTE_TITLES[base] ?? ROUTE_TITLES[pathname];
  if (title && pathname !== '/') {
    pushRecentNav({ href: pathname, title, subtitle: 'Navegación' });
  }
}

/**
 * Content-only route transition. Sidebar / shell chrome stay stable.
 * Fade + slight translate via CSS tokens. Instant under reduced motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      recordRecent(pathname);
      return;
    }

    setVisible(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    recordRecent(pathname);
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div className={cx('isalwa-page-transition', visible && 'is-visible')}>
      {children}
    </div>
  );
}
