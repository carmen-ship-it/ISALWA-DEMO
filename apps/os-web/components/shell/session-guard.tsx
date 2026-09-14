'use client';

import { useEffect } from 'react';
import { confirmLiveAccess } from '@/lib/auth/actions';

/** Catches restored pages and mid-session revocation without inventing a second session. */
export function SessionGuard() {
  useEffect(() => {
    let cancelled = false;

    async function probe() {
      const status = await confirmLiveAccess();
      if (cancelled || status === 'ok' || status === 'unavailable') return;
      const reason = status === 'revoked' ? 'revoked' : 'expired';
      window.location.replace(`/login?reason=${reason}`);
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void probe();
    }

    function onVisible() {
      if (document.visibilityState === 'visible') void probe();
    }

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
