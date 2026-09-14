export type Focusable = {
  focus: () => void;
  /** False when the node has been unmounted. Absent means the caller cannot prove attachment. */
  isConnected?: boolean;
  closest?: (selector: string) => unknown;
  nodeType?: number;
  tagName?: string;
  /** Optional live query. Used only if this node is gone. Callers do not have to set it. */
  selector?: string;
  getAttribute?: (name: string) => string | null;
  setAttribute?: (name: string, value: string) => void;
  removeAttribute?: (name: string) => void;
};

export type TourSurface = 'closed' | 'welcome' | 'step' | 'page-offer';

export type TourFocusSession = {
  surface: TourSurface;
  opener: Focusable | null;
};

const TOUR_ROOT = '[data-walkthrough-root]';
const MAIN_HEADING = 'main h1, main h2, main h3, main h4, main h5, main h6';
const PAGE_H1 = 'h1';
const TOUR_LANDMARK = '[data-tour]';
const TOUR_MODAL = '[data-walkthrough-root][aria-modal], [data-walkthrough-root] [aria-modal]';
const REPLAY_ATTR = 'data-walkthrough-replay';
const NATIVE_FOCUSABLE = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'SUMMARY', 'TEXTAREA']);

type DocLike = {
  querySelector?: (selector: string) => Focusable | null;
  querySelectorAll?: (selector: string) => ArrayLike<Focusable | null>;
  contains?: (node: unknown) => boolean;
  body?: Focusable | null;
};

function readDocument(): DocLike | null {
  try {
    const doc = (globalThis as { document?: unknown }).document;
    if (!doc || typeof doc !== 'object') return null;
    return doc as DocLike;
  } catch {
    return null;
  }
}

export function captureFocus(active: unknown): Focusable | null {
  if (!active || typeof active !== 'object') return null;
  if (!('focus' in active) || typeof active.focus !== 'function') return null;
  return active as Focusable;
}

function isInsideTour(node: Focusable): boolean {
  if (typeof node.closest !== 'function') return false;
  try {
    return Boolean(node.closest(TOUR_ROOT));
  } catch {
    return true;
  }
}

function isDetached(opener: Focusable, doc: DocLike | null): boolean {
  if (opener.isConnected === false) return true;
  if (opener.isConnected === true) return false;
  if (typeof opener.nodeType !== 'number' || !doc || typeof doc.contains !== 'function') return false;
  try {
    return !doc.contains(opener);
  } catch {
    return true;
  }
}

function canFocusOpener(opener: Focusable | null, doc: DocLike | null): opener is Focusable {
  if (!opener || typeof opener.focus !== 'function') return false;
  if (isDetached(opener, doc)) return false;
  if (isInsideTour(opener)) return false;
  return true;
}

function queryAll(doc: DocLike, selector: string): Focusable[] {
  try {
    if (typeof doc.querySelectorAll === 'function') {
      return Array.from(doc.querySelectorAll(selector) ?? []).filter(
        (node): node is Focusable => Boolean(node) && typeof node.focus === 'function',
      );
    }
    if (typeof doc.querySelector === 'function') {
      const one = doc.querySelector(selector);
      return one && typeof one.focus === 'function' ? [one] : [];
    }
  } catch {
    return [];
  }
  return [];
}

function firstOutsideTour(doc: DocLike, selector: string): Focusable | null {
  for (const node of queryAll(doc, selector)) {
    if (node.isConnected === false) continue;
    if (isInsideTour(node)) continue;
    return node;
  }
  return null;
}

function readAttr(opener: Focusable, name: string): string | null {
  if (typeof opener.getAttribute !== 'function') return null;
  try {
    const value = opener.getAttribute(name);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function stableSelectors(opener: Focusable): string[] {
  const selectors: string[] = [];
  if (typeof opener.selector === 'string' && opener.selector.trim()) {
    selectors.push(opener.selector.trim());
  }
  const id = readAttr(opener, 'id');
  if (id && /^[A-Za-z_][\w:-]*$/.test(id)) selectors.push(`#${id}`);
  const replay = readAttr(opener, REPLAY_ATTR);
  if (replay && /^[\w-]+$/.test(replay)) selectors.push(`[${REPLAY_ATTR}="${replay}"]`);
  return selectors;
}

function prepareProgrammaticFocus(node: Focusable): void {
  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';
  if (NATIVE_FOCUSABLE.has(tag)) return;
  if (typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return;
  try {
    if (node.getAttribute('tabindex') != null) return;
    node.setAttribute('tabindex', '-1');
  } catch {
    // A landmark that cannot take tabindex can still be asked to focus.
  }
}

function focusNode(node: Focusable, programmatic: boolean): boolean {
  try {
    if (programmatic) prepareProgrammaticFocus(node);
    node.focus();
    return true;
  } catch {
    return false;
  }
}

function releaseTourModal(doc: DocLike | null): void {
  if (!doc) return;
  for (const node of queryAll(doc, TOUR_MODAL)) {
    try {
      node.removeAttribute?.('aria-modal');
    } catch {
      // Closing still succeeds if the tour node is already gone.
    }
  }
}

function focusStableReplacement(opener: Focusable, doc: DocLike): boolean {
  for (const selector of stableSelectors(opener)) {
    const match = firstOutsideTour(doc, selector);
    if (!match || match === opener) continue;
    if (focusNode(match, true)) return true;
  }
  return false;
}

function focusFallback(doc: DocLike | null): void {
  if (!doc) return;
  for (const selector of [MAIN_HEADING, PAGE_H1, TOUR_LANDMARK]) {
    const node = firstOutsideTour(doc, selector);
    if (node && focusNode(node, true)) return;
  }
  const body = doc.body;
  if (!body || typeof body.focus !== 'function' || isInsideTour(body)) return;
  try {
    body.focus();
  } catch {
    // Nothing left that can take focus. Do not trap the close.
  }
}

/**
 * Return focus after Escape, close, or finish.
 * A detached opener.focus() does not throw, so it cannot be the only restore path.
 */
export function restoreFocus(opener: Focusable | null): void {
  try {
    const doc = readDocument();
    releaseTourModal(doc);
    if (canFocusOpener(opener, doc) && focusNode(opener, false)) return;
    if (opener && doc && focusStableReplacement(opener, doc)) return;
    focusFallback(doc);
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
