import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const repoRoot = resolve(root, '../..');

describe('map search keyboard focus indicator', () => {
  it('mapa-search uses isalwa-field and chrome focus-visible keeps a visible outline', () => {
    const experience = readFileSync(resolve(root, 'components/map/map-experience.tsx'), 'utf8');
    const data = readFileSync(resolve(repoRoot, 'packages/ui/src/components/data.tsx'), 'utf8');
    const chrome = readFileSync(resolve(repoRoot, 'packages/ui/src/tokens/chrome.css'), 'utf8');
    const globals = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
    const tokens = readFileSync(resolve(repoRoot, 'packages/ui/src/tokens/tokens.css'), 'utf8');

    assert.match(experience, /id="mapa-search"/);
    assert.match(experience, /<SearchField/);
    assert.match(experience, /overflow-visible/);
    assert.match(data, /function SearchField/);
    assert.match(data, /cx\('isalwa-field'/);

    const start = Math.max(
      chrome.indexOf('.isalwa-field:focus,'),
      chrome.indexOf('.isalwa-field:focus-visible'),
    );
    assert.ok(chrome.includes('.isalwa-field:focus'), 'missing .isalwa-field:focus');
    assert.ok(chrome.includes('.isalwa-field:focus-visible'), 'missing .isalwa-field:focus-visible');
    const focusBlock = chrome.slice(chrome.indexOf('.isalwa-field:focus'), chrome.indexOf('.isalwa-field:focus') + 420);
    assert.match(focusBlock, /outline:\s*2px\s+solid\s+var\(--isalwa-glaze-deep\)/);
    assert.match(focusBlock, /outline-offset:\s*2px/);
    assert.match(focusBlock, /box-shadow:\s*var\(--isalwa-shadow-focus\)/);
    assert.doesNotMatch(focusBlock, /outline:\s*none/);

    assert.match(tokens, /--isalwa-shadow-focus:\s*0 0 0 3px rgba\(40, 122, 120, 0\.28\)/);
    assert.match(globals, /input\.isalwa-field:focus-visible/);
    assert.match(globals, /outline:\s*2px\s+solid\s+var\(--isalwa-glaze-deep\)/);
  });
});
