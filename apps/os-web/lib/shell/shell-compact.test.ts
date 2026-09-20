import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  SHELL_COMPACT_ENTER_PX,
  SHELL_COMPACT_EXIT_PX,
} from '@/components/shell/shell-chrome';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Task 5 compact sticky header', () => {
  it('uses shared shell chrome compact thresholds with hysteresis', () => {
    assert.equal(SHELL_COMPACT_ENTER_PX, 48);
    assert.equal(SHELL_COMPACT_EXIT_PX, 12);
    assert.ok(SHELL_COMPACT_ENTER_PX > SHELL_COMPACT_EXIT_PX);
  });

  it('wires compact chrome on the shared AppShell only', () => {
    const shell = read('components/shell/app-shell.tsx');
    const chrome = read('components/shell/shell-chrome.tsx');
    const css = read('styles/shell-compact.css');
    const layout = read('app/layout.tsx');

    assert.match(shell, /ShellChromeProvider/);
    assert.match(shell, /ShellChromeBar/);
    assert.match(shell, /shellScrollRef/);
    assert.match(shell, /data-shell-header/);
    assert.match(shell, /data-shell-scroll/);
    assert.match(chrome, /data-shell-compact/);
    assert.match(chrome, /data-shell-chrome/);
    assert.match(css, /\[data-shell-compact='true'\]/);
    assert.match(layout, /shell-compact\.css/);
    // No page-specific sticky compact hacks for this task.
    assert.doesNotMatch(shell, /sticky top-0 z-40/);
  });

  it('keeps search, demo, evaluation, and account reachable in compact mode', () => {
    const shell = read('components/shell/app-shell.tsx');
    const demoBanner = read('components/demo/demo-fictitious-banner.tsx');
    const evaluation = read('components/shell/role-preview-banner.tsx');
    const tour = read('components/demo/ver-ejemplo-completo-button.tsx');
    const search = read('components/shell/command-palette.tsx');
    const userMenu = read('components/shell/user-menu.tsx');
    const css = read('styles/shell-compact.css');

    assert.match(search, /data-shell-search/);
    assert.match(search, /Buscar/);
    assert.match(shell, /DemoDataFilterToggle/);
    assert.match(shell, /UserMenu/);
    assert.match(userMenu, /signOut|Cerrar sesión|account\.signOut/);
    assert.match(demoBanner, /data-shell-demo-banner/);
    assert.match(demoBanner, /DEMO_FICTITIOUS_BADGE/);
    assert.match(css, /data-shell-demo-banner-detail/);
    assert.match(evaluation, /data-shell-evaluation-banner/);
    assert.match(evaluation, /Vista de evaluación/);
    assert.match(tour, /data-shell-tour-compact/);
    assert.match(tour, /Ver recorrido completo/);
  });

  it('keeps page content in a separate scrollport from chrome', () => {
    const shell = read('components/shell/app-shell.tsx');
    // Chrome outside scroll → titles never paint under sticky header.
    assert.match(shell, /ShellChromeBar/);
    assert.match(shell, /data-shell-scroll[\s\S]*WalkthroughShell/);
  });
});
