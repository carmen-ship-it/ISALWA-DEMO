export const QUICK_VIEW_OPENER_ATTR = 'data-quick-view-opener';

const PANEL_KEY = /^(party|quote):[A-Za-z0-9_-]{4,64}$/;

export type FocusNode = {
  getAttribute(name: string): string | null;
  closest(selector: string): FocusNode | null;
  focus(): void;
  isConnected: boolean;
  disabled?: boolean;
};

export type FocusRoot = {
  body?: unknown;
  documentElement?: unknown;
  activeElement?: unknown;
  querySelectorAll(selector: string): ArrayLike<unknown>;
  addEventListener?(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
  removeEventListener?(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
};

let pendingOpenerKey: string | null = null;

export function panelReturnKey(href: string | undefined | null): string | null {
  if (!href || !href.includes('panel=')) return null;
  const query = href.slice(href.indexOf('?') + 1).split('#')[0];
  return openerKeyFromSearch(query);
}

export function openerKeyFromSearch(search: string | undefined | null): string | null {
  if (!search) return null;
  const panel = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('panel');
  return panel && PANEL_KEY.test(panel) ? panel : null;
}

export function rememberQuickViewOpener(key: string | null | undefined): void {
  pendingOpenerKey = key && PANEL_KEY.test(key) ? key : null;
}

export function peekQuickViewOpener(): string | null {
  return pendingOpenerKey;
}

export function clearQuickViewOpener(): void {
  pendingOpenerKey = null;
}

export function isFocusableTarget(node: unknown, root?: FocusRoot): node is FocusNode {
  if (!node || typeof node !== 'object') return false;
  const el = node as FocusNode;
  if (el === root?.body || el === root?.documentElement) return false;
  if (el.isConnected === false) return false;
  if (el.disabled) return false;
  if (typeof el.getAttribute !== 'function' || typeof el.focus !== 'function') return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.closest?.('[role="dialog"]')) return false;
  return true;
}

export function findQuickViewOpener(root: FocusRoot, key: string | null): FocusNode | null {
  if (!key) return null;
  const nodes = root.querySelectorAll(`[${QUICK_VIEW_OPENER_ATTR}]`);
  for (const node of Array.from(nodes)) {
    if (!isFocusableTarget(node, root)) continue;
    if (node.getAttribute(QUICK_VIEW_OPENER_ATTR) === key) return node;
  }
  return null;
}

export function findQuickViewFallback(root: FocusRoot, key: string | null): FocusNode | null {
  if (!key) return null;
  const id = key.slice(key.indexOf(':') + 1);
  if (!id) return null;
  const links = root.querySelectorAll('a[href]');
  for (const candidate of Array.from(links)) {
    if (!isFocusableTarget(candidate, root)) continue;
    const node = candidate;
    const href = node.getAttribute('href') ?? '';
    const path = href.split('?')[0]?.split('#')[0] ?? '';
    if ((path.endsWith(`/${id}`) || path.includes(`/${id}/`)) && isFocusableTarget(node, root)) {
      return node;
    }
  }
  return null;
}

export function resolveQuickViewReturnTarget(
  root: FocusRoot,
  key: string | null,
  captured: FocusNode | null,
): FocusNode | null {
  if (isFocusableTarget(captured, root)) return captured;
  return findQuickViewOpener(root, key) ?? findQuickViewFallback(root, key);
}

export function restoreQuickViewFocus(
  root: FocusRoot,
  key: string | null,
  captured: FocusNode | null,
  schedule: (callback: () => void) => void = (callback) => callback(),
): FocusNode | null {
  const target = resolveQuickViewReturnTarget(root, key, captured);
  clearQuickViewOpener();
  if (!target) return null;
  schedule(() => {
    if (isFocusableTarget(target, root)) target.focus();
  });
  return target;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableIn(dialog: { querySelectorAll(selector: string): ArrayLike<unknown> }): FocusNode[] {
  return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((node): node is FocusNode => {
    if (!node || typeof node !== 'object') return false;
    const el = node as FocusNode;
    return el.isConnected !== false && !el.disabled && typeof el.focus === 'function';
  });
}

export function bindDrawerKeys(
  root: FocusRoot,
  dialog: { querySelectorAll(selector: string): ArrayLike<unknown> },
  onClose: () => void,
): () => void {
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusableIn(dialog);
    if (items.length === 0) return;
    const active = isFocusableTarget(root.activeElement, root) ? root.activeElement : null;
    const index = active ? items.indexOf(active) : -1;
    const next = event.shiftKey
      ? items[(index <= 0 ? items.length : index) - 1]
      : items[index === items.length - 1 || index < 0 ? 0 : index + 1];
    if (!next) return;
    if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === items.length - 1)) {
      event.preventDefault();
      next.focus();
    }
  }
  root.addEventListener?.('keydown', onKey);
  return () => root.removeEventListener?.('keydown', onKey);
}
