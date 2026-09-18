'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { explicitDataMode, withExplicitDataMode } from '@/lib/demo/preserve-data-mode';

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
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;
      let url: URL;
      try {
        url = new URL(raw, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith('/api/')) return;
      if (url.searchParams.get('datos') === mode) return;
      const next = withExplicitDataMode(`${url.pathname}${url.search}${url.hash}`, mode);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        anchor.setAttribute('href', next);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      router.push(next);
    }
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [router]);

  return null;
}
