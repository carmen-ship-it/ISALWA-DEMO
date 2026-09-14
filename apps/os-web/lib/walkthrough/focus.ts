const PAGE_HEADING = 'h1, h2, h3, h4, h5, h6';
const GUIDE_ROOT = '[data-guide-panel]';

export type GuideFocusable = {
  focus: () => void;
  closest?: (selector: string) => unknown;
  getAttribute?: (name: string) => string | null;
  setAttribute?: (name: string, value: string) => void;
};

export type GuideDoc = {
  querySelector?: (selector: string) => GuideFocusable | null;
  querySelectorAll?: (selector: string) => ArrayLike<GuideFocusable | null>;
  body?: { focus?: () => void } | null;
  activeElement?: unknown;
};

function listHeadings(doc: GuideDoc): GuideFocusable[] {
  if (typeof doc.querySelectorAll !== 'function') return [];
  try {
    return Array.from(doc.querySelectorAll(PAGE_HEADING)).filter(
      (node): node is GuideFocusable => node != null && typeof node.focus === 'function',
    );
  } catch {
    return [];
  }
}

function insideGuide(node: GuideFocusable): boolean {
  if (typeof node.closest !== 'function') return false;
  try {
    return Boolean(node.closest(GUIDE_ROOT));
  } catch {
    return false;
  }
}

export function findPageHeading(doc: GuideDoc): GuideFocusable | null {
  return listHeadings(doc).find((node) => !insideGuide(node)) ?? null;
}

export function hasBlockingDialog(doc: GuideDoc): boolean {
  if (typeof doc.querySelector !== 'function') return false;
  try {
    return Boolean(doc.querySelector('[role="dialog"][aria-modal="true"]'));
  } catch {
    return false;
  }
}

/**
 * Close/Escape target. Focus a page heading when one exists.
 * Never moves focus to document.body.
 */
export function restoreHeadingFocus(doc: GuideDoc): boolean {
  const heading = findPageHeading(doc);
  if (!heading) return false;
  if (typeof heading.setAttribute === 'function' && heading.getAttribute?.('tabindex') == null) {
    heading.setAttribute('tabindex', '-1');
  }
  heading.focus();
  return true;
}

export function handleGuideEscape(doc: GuideDoc): 'hidden' | 'ignored' {
  if (hasBlockingDialog(doc)) return 'ignored';
  restoreHeadingFocus(doc);
  return 'hidden';
}
