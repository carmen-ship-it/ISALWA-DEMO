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

  it('makes active nav obvious with teal edge + navy ink + sky/teal tint', () => {
    const nav = readFileSync(resolve(root, 'components/shell/app-nav.tsx'), 'utf8');
    assert.match(nav, /border-l-\[var\(--isalwa-glaze\)\]/);
    assert.match(nav, /font-semibold text-\[var\(--isalwa-kiln\)\]/);
    assert.match(nav, /--isalwa-teal-100/);
    assert.match(nav, /--isalwa-sky-100/);
  });

  it('keeps desktop sidebar collapsible with local UI prefs, not auth', () => {
    const shell = readFileSync(resolve(root, 'components/shell/app-shell.tsx'), 'utf8');
    const prefs = readFileSync(resolve(root, 'lib/shell/ui-preferences.ts'), 'utf8');
    assert.match(shell, /lg:grid-cols-\[4\.5rem_1fr\]/);
    assert.match(shell, /data-sidebar/);
    assert.match(prefs, /isalwa\.os-web\.ui-prefs\.v1/);
    assert.match(prefs, /sidebarCollapsed/);
    assert.match(shell, /loadUiPreferences\(window\.localStorage\)/);
    assert.doesNotMatch(prefs, /getServerOsAuthContext|grantedScopes|capability grants/);
  });

  it('treats permission lock as info, not red danger', () => {
    const states = readFileSync(resolve(root, 'components/states/app-states.tsx'), 'utf8');
    const start = states.indexOf('export function AccessDeniedState');
    const end = states.indexOf('export function AccountInactiveState');
    const denied = states.slice(start, end > start ? end : undefined);
    assert.match(denied, /tone="info"/);
    assert.match(denied, /Sin permiso/);
    assert.doesNotMatch(denied, /semantic="blocked"|tone="danger"|tint-red/);
  });
});

describe('visual system — inicio + salud weight', () => {
  it('gives Centro de mando command-center weight on Inicio', () => {
    const page = readFileSync(resolve(root, 'app/(app)/inicio/page.tsx'), 'utf8');
    const queues = readFileSync(
      resolve(root, 'components/inicio/inicio-command-queue-sections.tsx'),
      'utf8',
    );
    assert.match(page, /Centro de mando/);
    assert.match(page, /Atención de hoy/);
    assert.match(page, /--isalwa-sky-100/);
    assert.match(queues, /surface=\{SECTION_SURFACE/);
    assert.match(queues, /weight === 'lead'/);
    assert.match(queues, /EmptyPanel/);
  });

  it('makes Salud de datos scannable by category markers, not severity ranks', () => {
    const page = readFileSync(resolve(root, 'app/(app)/salud-datos/page.tsx'), 'utf8');
    const health = readFileSync(resolve(root, 'lib/party/data-health.ts'), 'utf8');
    assert.match(page, /DATA_HEALTH_TYPE_MARKER/);
    assert.match(page, /dataHealthPillTone/);
    assert.match(health, /type: DataHealthIssueType/);
    assert.match(health, /status: 'hallazgo'/);
    assert.doesNotMatch(health, /\bseverity\s*:/);
    assert.doesNotMatch(health, /severity:\s*['"]/);
  });
});

describe('visual system — button tokens', () => {
  it('exposes primary/secondary/contextual button token aliases in the law file', () => {
    const tokens = readFileSync(
      resolve(root, '../../packages/ui/src/tokens/tokens.css'),
      'utf8',
    );
    assert.match(tokens, /--isalwa-surface-canvas:\s*var\(--isalwa-porcelain\)/);
    assert.match(tokens, /--isalwa-btn-primary-bg:\s*var\(--isalwa-action\)/);
    assert.match(tokens, /--isalwa-btn-secondary-bg:\s*var\(--isalwa-white\)/);
    assert.match(tokens, /--isalwa-btn-secondary-border:/);
    assert.match(tokens, /--isalwa-btn-contextual-bg:\s*var\(--isalwa-glaze\)/);
  });

  it('Button consumes the hierarchy tokens including contextual + tertiary', () => {
    const button = readFileSync(
      resolve(root, '../../packages/ui/src/components/button.tsx'),
      'utf8',
    );
    assert.match(button, /--isalwa-btn-primary-bg/);
    assert.match(button, /--isalwa-btn-secondary-bg/);
    assert.match(button, /--isalwa-btn-contextual-bg/);
    assert.match(button, /contextual:/);
    assert.match(button, /tertiary:/);
  });

  it('os-web remaps primary action to navy and keeps porcelain canvas', () => {
    const globals = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
    assert.match(globals, /--isalwa-action:\s*var\(--isalwa-kiln\)/);
    assert.match(globals, /--isalwa-surface-canvas:\s*var\(--isalwa-porcelain\)/);
    assert.doesNotMatch(globals, /--isalwa-surface-hero:[\s\S]*--isalwa-copper/);
  });
});
