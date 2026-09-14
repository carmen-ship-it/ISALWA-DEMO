import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { handleTourEscape, isTypingTarget, restoreFocus, type Focusable } from './focus';

type Attrs = Record<string, string>;

type FakeNode = Focusable & {
  id: string;
  attrs: Attrs;
  parent: FakeNode | null;
};

type FakeDoc = {
  body: FakeNode | null;
  activeElement: FakeNode | null;
  contains: (node: unknown) => boolean;
  querySelector: (selector: string) => FakeNode | null;
  querySelectorAll: (selector: string) => FakeNode[];
};

const docs: Array<FakeDoc | undefined> = [];

function node(partial: {
  id: string;
  tagName?: string;
  isConnected?: boolean;
  attrs?: Attrs;
  parent?: FakeNode | null;
  throwOnFocus?: boolean;
}): FakeNode {
  const attrs = { ...(partial.attrs ?? {}) };
  const element: FakeNode = {
    id: partial.id,
    tagName: partial.tagName ?? 'DIV',
    isConnected: partial.isConnected ?? true,
    attrs,
    parent: partial.parent ?? null,
    nodeType: 1,
    focus() {
      if (partial.throwOnFocus) throw new Error('detached');
      const doc = docs[0];
      if (doc) doc.activeElement = element;
    },
    closest(selector: string) {
      let current: FakeNode | null = element;
      while (current) {
        if (matches(current, selector)) return current;
        current = current.parent;
      }
      return null;
    },
    getAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
    removeAttribute(name: string) {
      delete attrs[name];
    },
  };
  return element;
}

function matches(element: FakeNode, selector: string): boolean {
  if (selector === '[data-walkthrough-root]') return element.attrs['data-walkthrough-root'] != null;
  if (selector === '[aria-modal]') return element.attrs['aria-modal'] != null;
  if (selector === '[data-tour]') return element.attrs['data-tour'] != null;
  if (selector.startsWith('#')) return element.attrs.id === selector.slice(1);
  const replay = selector.match(/^\[data-walkthrough-replay="([\w-]+)"\]$/);
  if (replay) return element.attrs['data-walkthrough-replay'] === replay[1];
  return false;
}

function installDocument(parts: {
  nodes?: FakeNode[];
  body?: FakeNode | null;
  contains?: (node: unknown) => boolean;
}): FakeDoc {
  const nodes = parts.nodes ?? [];
  const doc: FakeDoc = {
    body: parts.body ?? null,
    activeElement: parts.body ?? null,
    contains: parts.contains ?? ((node) => nodes.includes(node as FakeNode) && (node as FakeNode).isConnected !== false),
    querySelector(selector: string) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    querySelectorAll(selector: string) {
      if (selector.startsWith('main h1')) {
        return nodes.filter((item) => item.tagName === 'H1' || item.tagName === 'H2');
      }
      if (selector === 'h1') return nodes.filter((item) => item.tagName === 'H1');
      if (selector === '[data-tour]') return nodes.filter((item) => item.attrs['data-tour'] != null);
      if (selector.includes('aria-modal')) {
        return nodes.filter((item) => item.attrs['aria-modal'] != null && item.closest('[data-walkthrough-root]'));
      }
      return nodes.filter((item) => matches(item, selector));
    },
  };
  docs[0] = doc;
  (globalThis as { document?: FakeDoc }).document = doc;
  return doc;
}

afterEach(() => {
  docs.length = 0;
  delete (globalThis as { document?: unknown }).document;
});

describe('walkthrough focus restore', () => {
  it('Escape/restoreFocus returns focus to a still-connected launcher', () => {
    const launcher = node({ id: 'launcher', tagName: 'BUTTON', isConnected: true });
    installDocument({ nodes: [launcher], contains: (item) => item === launcher });

    const result = handleTourEscape({ key: 'Escape' }, { surface: 'step', opener: launcher });

    assert.equal(result.handled, true);
    assert.equal(result.session.surface, 'closed');
    assert.equal(result.session.opener, null);
    assert.equal(docs[0]?.activeElement, launcher);
    assert.equal(launcher.attrs.tabindex, undefined);
  });

  it('Close/restoreFocus returns focus to a still-connected launcher', () => {
    const launcher = node({ id: 'launcher', tagName: 'BUTTON', isConnected: true });
    installDocument({ nodes: [launcher], contains: (item) => item === launcher });

    restoreFocus(launcher);
    assert.equal(docs[0]?.activeElement, launcher);

    restoreFocus(launcher);
    assert.equal(docs[0]?.activeElement, launcher);
  });

  it('Detached opener falls back to a heading, not body', () => {
    const opener = node({ id: 'gone', tagName: 'BUTTON', isConnected: false });
    const heading = node({ id: 'page-heading', tagName: 'H1', isConnected: true });
    const body = node({ id: 'body', tagName: 'BODY', isConnected: true });
    installDocument({ nodes: [heading], body });

    restoreFocus(opener);

    assert.equal(docs[0]?.activeElement, heading);
    assert.notEqual(docs[0]?.activeElement, body);
    assert.notEqual(docs[0]?.activeElement, opener);
    assert.equal(heading.attrs.tabindex, '-1');
  });

  it('Opener inside [data-walkthrough-root] is not used; fallback heading is used', () => {
    const root = node({
      id: 'tour',
      isConnected: true,
      attrs: { 'data-walkthrough-root': '' },
    });
    const opener = node({
      id: 'ver-recorrido',
      tagName: 'BUTTON',
      isConnected: true,
      parent: root,
    });
    const tourHeading = node({ id: 'tour-heading', tagName: 'H2', isConnected: true, parent: root });
    const heading = node({ id: 'page-heading', tagName: 'H1', isConnected: true });
    const body = node({ id: 'body', tagName: 'BODY', isConnected: true });
    installDocument({ nodes: [tourHeading, heading], body });

    restoreFocus(opener);

    assert.equal(docs[0]?.activeElement, heading);
    assert.notEqual(docs[0]?.activeElement, opener);
    assert.notEqual(docs[0]?.activeElement, tourHeading);
    assert.notEqual(docs[0]?.activeElement, body);
  });

  it('Missing heading does not throw', () => {
    const opener = node({ id: 'gone', tagName: 'BUTTON', isConnected: false, throwOnFocus: true });
    const body = node({ id: 'body', tagName: 'BODY', isConnected: true, throwOnFocus: true });
    installDocument({ nodes: [], body });

    assert.doesNotThrow(() => restoreFocus(opener));
    assert.doesNotThrow(() => restoreFocus(null));
    assert.doesNotThrow(() => handleTourEscape({ key: 'Escape' }, { surface: 'welcome', opener: null }));
    assert.equal(docs[0]?.activeElement, body);

    delete (globalThis as { document?: unknown }).document;
    docs.length = 0;
    assert.doesNotThrow(() => restoreFocus(opener));
  });

  it('Replay-button case: a connected button with a stable attribute is restored', () => {
    const gone = node({
      id: 'replay-gone',
      tagName: 'BUTTON',
      isConnected: false,
      attrs: { 'data-walkthrough-replay': 'general', id: 'ayuda-replay' },
    });
    const replay = node({
      id: 'replay-live',
      tagName: 'BUTTON',
      isConnected: true,
      attrs: { 'data-walkthrough-replay': 'general', id: 'ayuda-replay' },
    });
    const heading = node({ id: 'page-heading', tagName: 'H1', isConnected: true });
    const body = node({ id: 'body', tagName: 'BODY', isConnected: true });
    installDocument({ nodes: [replay, heading], body });

    restoreFocus(gone);

    assert.equal(docs[0]?.activeElement, replay);
    assert.notEqual(docs[0]?.activeElement, gone);
    assert.notEqual(docs[0]?.activeElement, heading);
    assert.notEqual(docs[0]?.activeElement, body);
    assert.equal(replay.attrs.tabindex, undefined);
  });

  it('does not trap Tab, Shift+Tab, or Enter, and does not leave aria-modal on the tour', () => {
    const launcher = node({ id: 'launcher', tagName: 'BUTTON', isConnected: true });
    const dialog = node({
      id: 'dialog',
      isConnected: true,
      attrs: { 'aria-modal': 'false' },
      parent: node({ id: 'root', attrs: { 'data-walkthrough-root': '' } }),
    });
    installDocument({ nodes: [launcher, dialog] });

    for (const key of ['Tab', 'Enter']) {
      const result = handleTourEscape({ key }, { surface: 'step', opener: launcher });
      assert.equal(result.handled, false, key);
      assert.equal(result.session.surface, 'step');
    }

    restoreFocus(launcher);
    assert.equal(dialog.attrs['aria-modal'], undefined);
    assert.equal(isTypingTarget('INPUT', false), true);
    assert.equal(isTypingTarget('BUTTON', false), false);
    assert.equal(isTypingTarget('DIV', true), true);
  });
});
