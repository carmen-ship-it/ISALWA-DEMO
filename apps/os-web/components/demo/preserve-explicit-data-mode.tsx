'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  explicitDataMode,
  isNavigableAppHref,
  samePathQueryNavigation,
  withExplicitDataMode,
} from '@/lib/demo/preserve-data-mode';

/**
 * In-app links built without the current datos query still navigate in that mode.
 * Capture runs before Next's link handler. Does not add datos when the page has none.
 */
export function PreserveExplicitDataMode() {
  const router = useRouter();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const mode = explicitDataMode(new URLSearchParams(window.location.search).get('datos'));
      if (!mode) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const raw = anchor.getAttribute('href');
      if (!raw || !isNavigableAppHref(raw, window.location.origin)) return;
      const url = new URL(raw, window.location.origin);
      if (url.searchParams.get('datos') === mode) return;
      const next = withExplicitDataMode(`${url.pathname}${url.search}${url.hash}`, mode);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        anchor.setAttribute('href', next);
        return;
      }
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const decision = samePathQueryNavigation(current, next);
      if (decision.kind === 'assign') {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(decision.href);
        return;
      }
      if (decision.kind !== 'push') return;
      event.preventDefault();
      event.stopPropagation();
      router.push(next);
    }
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [router]);

  return null;
}
