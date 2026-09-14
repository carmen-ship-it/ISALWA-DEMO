export type Focusable = {
  focus: () => void;
};

export type TourSurface = 'closed' | 'welcome' | 'step' | 'page-offer';

export type TourFocusSession = {
  surface: TourSurface;
  opener: Focusable | null;
};

export function captureFocus(active: unknown): Focusable | null {
  if (!active || typeof active !== 'object') return null;
  if (!('focus' in active) || typeof active.focus !== 'function') return null;
  return active as Focusable;
}

export function restoreFocus(opener: Focusable | null): void {
  if (!opener) return;
  try {
    opener.focus();
  } catch {
    // Opener may already be gone. Closing still succeeds so the tour never traps.
  }
}

export function handleTourEscape(
  event: { key: string },
  session: TourFocusSession,
): { handled: boolean; session: TourFocusSession } {
  if (event.key !== 'Escape' || session.surface === 'closed') {
    return { handled: false, session };
  }
  const opener = session.opener;
  const next: TourFocusSession = { surface: 'closed', opener: null };
  restoreFocus(opener);
  return { handled: true, session: next };
}

export function isTypingTarget(tagName: string | null | undefined, editable: boolean): boolean {
  if (editable) return true;
  if (!tagName) return false;
  const tag = tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
