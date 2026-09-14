import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bindDrawerKeys,
  clearQuickViewOpener,
  findQuickViewFallback,
  findQuickViewOpener,
  panelReturnKey,
  peekQuickViewOpener,
  rememberQuickViewOpener,
  restoreQuickViewFocus,
  type FocusNode,
  type FocusRoot,
} from '../../../../packages/ui/src/components/quick-view-focus';

const here = dirname(fileURLToPath(import.meta.url));

function read(relative: string): string {
  return readFileSync(join(here, relative), 'utf8');
}

class FakeNode implements FocusNode {
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  attrs = new Map<string, string>();
  focused = false;
  isConnected = true;
  disabled = false;
  role: string | null = null;

  constructor(readonly tagName: string) {}

  getAttribute(name: string): string | null {
    if (name === 'role') return this.role;
    return this.attrs.get(name) ?? null;
  }

  closest(selector: string): FocusNode | null {
    if (selector !== '[role="dialog"]') return null;
    let current: FakeNode | null = this;
    while (current) {
      if (current.role === 'dialog') return current;
      current = current.parent;
    }
    return null;
  }

  focus(): void {
    this.focused = true;
  }
}

class FakeRoot implements FocusRoot {
  body = new FakeNode('BODY');
  documentElement = new FakeNode('HTML');
  activeElement: FocusNode | null = null;
  nodes: FakeNode[] = [];
  listeners = new Set<(event: KeyboardEvent) => void>();

  querySelectorAll(selector: string): FocusNode[] {
    if (selector === '[data-quick-view-opener]') {
      return this.nodes.filter((node) => node.attrs.has('data-quick-view-opener'));
    }
    if (selector === 'a[href]') return this.nodes.filter((node) => node.tagName === 'A');
    if (selector.includes('button')) return this.nodes.filter((node) => node.tagName === 'BUTTON' && !node.disabled);
    return [];
  }

  addEventListener(_type: 'keydown', listener: (event: KeyboardEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'keydown', listener: (event: KeyboardEvent) => void): void {
    this.listeners.delete(listener);
  }

  press(key: string, shiftKey = false): { prevented: boolean } {
    const event = {
      key,
      shiftKey,
      prevented: false,
      stopped: false,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
    };
    for (const listener of [...this.listeners]) listener(event as unknown as KeyboardEvent);
    return event;
  }
}

const PARTY = 'party:01M2EAG2N21FF7B7C0Z9QKB8Q1';

describe('quick view focus return', () => {
  it('captures the opener from a Vista rápida href', () => {
    const href = `/clientes?q=IMP&roleKey=customer&panel=${encodeURIComponent(PARTY)}`;
    assert.equal(panelReturnKey(href), PARTY);
    rememberQuickViewOpener(panelReturnKey(href));
    assert.equal(peekQuickViewOpener(), PARTY);
    assert.equal(panelReturnKey('/clientes/01M2EAG2N21FF7B7C0Z9QKB8Q1'), null);
    clearQuickViewOpener();
  });

  it('returns focus to the opener on close and keeps the list query out of the focus path', () => {
    const root = new FakeRoot();
    const opener = new FakeNode('BUTTON');
    opener.attrs.set('data-quick-view-opener', PARTY);
    root.nodes.push(opener);
    rememberQuickViewOpener(PARTY);

    const found = findQuickViewOpener(root, peekQuickViewOpener());
    assert.equal(found, opener);
    const restored = restoreQuickViewFocus(root, PARTY, opener);
    assert.equal(restored, opener);
    assert.equal(opener.focused, true);
    assert.equal(root.body.focused, false);
    assert.equal(peekQuickViewOpener(), null);
  });

  it('uses the same restore target after Escape and after the close control', () => {
    const root = new FakeRoot();
    const opener = new FakeNode('BUTTON');
    opener.attrs.set('data-quick-view-opener', PARTY);
    const close = new FakeNode('BUTTON');
    close.role = 'dialog';
    root.nodes.push(opener, close);
    root.activeElement = close;
    let closed = 0;
    const dialog = {
      querySelectorAll: () => [close],
    };
    const unbind = bindDrawerKeys(root, dialog, () => {
      closed += 1;
    });

    const escape = root.press('Escape');
    assert.equal(closed, 1);
    assert.equal(escape.prevented, true);
    restoreQuickViewFocus(root, PARTY, opener);
    assert.equal(opener.focused, true);

    opener.focused = false;
    rememberQuickViewOpener(PARTY);
    unbind();
    const release = () => restoreQuickViewFocus(root, PARTY, opener);
    release();
    assert.equal(opener.focused, true);
    assert.equal(root.press('Escape').prevented, false);
    assert.equal(closed, 1);
  });

  it('falls back to the row link when the opener is gone', () => {
    const root = new FakeRoot();
    const row = new FakeNode('A');
    row.attrs.set('href', '/clientes/01M2EAG2N21FF7B7C0Z9QKB8Q1');
    root.nodes.push(row);
    const gone = new FakeNode('BUTTON');
    gone.isConnected = false;
    gone.attrs.set('data-quick-view-opener', PARTY);

    assert.equal(findQuickViewOpener(root, PARTY), null);
    assert.equal(findQuickViewFallback(root, PARTY), row);
    const restored = restoreQuickViewFocus(root, PARTY, gone);
    assert.equal(restored, row);
    assert.equal(row.focused, true);
    assert.equal(root.body.focused, false);
  });

  it('does not focus the page body when nothing safe remains', () => {
    const root = new FakeRoot();
    root.activeElement = root.body;
    const restored = restoreQuickViewFocus(root, null, root.body);
    assert.equal(restored, null);
    assert.equal(root.body.focused, false);
    assert.equal(root.documentElement.focused, false);
  });
});

describe('quick view shared wiring', () => {
  it('keeps Cliente and Cotización on the shared drawer and preserves list state on close', () => {
    const drawer = read('../../../../packages/ui/src/components/operating.tsx');
    const host = read('../../components/operating/quick-view-host.tsx');
    const customer = read('../../components/operating/customer-quick-view.tsx');
    const quote = read('../../components/operating/quote-quick-view.tsx');

    assert.match(drawer, /rememberQuickViewOpener/);
    assert.match(drawer, /restoreQuickViewFocus/);
    assert.match(drawer, /bindDrawerKeys/);
    assert.doesNotMatch(drawer, /previous\?\.focus\(\)/);
    assert.match(host, /hrefWithoutPanel/);
    assert.match(customer, /QuickViewHost/);
    assert.match(quote, /ContextDrawer/);
    assert.match(quote, /router\.replace\(closeHref/);
  });
});
