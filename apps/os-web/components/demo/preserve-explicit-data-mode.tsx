'use client';

import { useEffect } from 'react';
import {
  explicitDataMode,
  isNavigableAppHref,
  withExplicitDataMode,
} from '@/lib/demo/preserve-data-mode';

/**
 * In-app links built without the current datos query still navigate in that mode.
 * Capture runs before Next's link handler. Does not add datos when the page has none.
 *
 * Uses location.assign (not App Router push) so Browser Back returns one real step
 * after history.replaceState from the demo provider / toggle.
 */
export function PreserveExplicitDataMode() {
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
      if (current === next) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(next);
    }

    function onSubmit(event: SubmitEvent) {
      const mode = explicitDataMode(new URLSearchParams(window.location.search).get('datos'));
      if (!mode) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const action = form.getAttribute('action');
      if (action && /^https?:/i.test(action)) {
        try {
          if (new URL(action).origin !== window.location.origin) return;
        } catch {
          return;
        }
      }
      const existing = form.querySelector('input[name="datos"]');
      if (existing instanceof HTMLInputElement) {
        if (!existing.value) existing.value = mode;
        return;
      }
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'datos';
      input.value = mode;
      form.appendChild(input);
    }

    window.addEventListener('click', onClick, true);
    window.addEventListener('submit', onSubmit, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  return null;
}
