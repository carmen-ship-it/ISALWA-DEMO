import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * Static contracts for the global visual system (fonts + canvas + shell chrome).
 * Intentionally file-based — no workspace package imports — so it runs in lean worktrees.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

describe('visual system — fonts', () => {
  it('places next/font CSS variables on html and loads Newsreader italic', () => {
    const layout = readFileSync(resolve(root, 'app/layout.tsx'), 'utf8');
    assert.match(layout, /style:\s*\[['"]normal['"],\s*['"]italic['"]\]/);
    assert.match(layout, /<html[^>]*className=\{`\$\{sans\.variable\}/);
    assert.doesNotMatch(layout, /<body className=\{`\$\{sans\.variable\}/);
    assert.match(layout, /--isalwa-font-display:\s*var\(--font-isalwa-display\)/);
  });
});

describe('visual system — canvas + chrome', () => {
  it('uses porcelain surface-canvas, not pure white body', () => {
    const globals = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
    assert.match(globals, /--isalwa-surface-canvas:\s*var\(--isalwa-porcelain\)/);
    assert.match(globals, /background-color:\s*var\(--isalwa-surface-canvas\)/);
    assert.equal(/body\s*\{[^}]*background:\s*var\(--isalwa-white\)/.test(globals), false);
  });

  it('keeps shell canvas porcelain and sticky header on glass-light', () => {
    const shell = readFileSync(resolve(root, 'components/shell/app-shell.tsx'), 'utf8');
    assert.match(shell, /bg-\[var\(--isalwa-surface-canvas\)\]/);
    assert.match(shell, /isalwa-glass-light/);
    assert.match(shell, /bg-\[var\(--isalwa-porcelain\)\]/);
    assert.doesNotMatch(shell, /min-h-screen bg-\[var\(--isalwa-white\)\]/);
  });

  it('makes active nav obvious with glaze rail + deep ink', () => {
    const nav = readFileSync(resolve(root, 'components/shell/app-nav.tsx'), 'utf8');
    assert.match(nav, /border-l-\[var\(--isalwa-glaze\)\]/);
    assert.match(nav, /font-semibold text-\[var\(--isalwa-glaze-deep\)\]/);
  });
});

describe('visual system — button tokens', () => {
  it('exposes primary/secondary button token aliases in the law file', () => {
    const tokens = readFileSync(
      resolve(root, '../../packages/ui/src/tokens/tokens.css'),
      'utf8',
    );
    assert.match(tokens, /--isalwa-surface-canvas:\s*var\(--isalwa-porcelain\)/);
    assert.match(tokens, /--isalwa-btn-primary-bg:\s*var\(--isalwa-action\)/);
    assert.match(tokens, /--isalwa-btn-secondary-bg:\s*var\(--isalwa-white\)/);
    assert.match(tokens, /--isalwa-btn-secondary-border:\s*var\(--isalwa-mist\)/);
  });

  it('Button consumes the hierarchy tokens', () => {
    const button = readFileSync(
      resolve(root, '../../packages/ui/src/components/button.tsx'),
      'utf8',
    );
    assert.match(button, /--isalwa-btn-primary-bg/);
    assert.match(button, /--isalwa-btn-secondary-bg/);
  });
});
