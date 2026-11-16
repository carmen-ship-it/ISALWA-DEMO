import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(process.cwd(), '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const globals = read('apps/os-web/app/globals.css');
const tokens = read('packages/ui/src/tokens/tokens.css');
const chrome = read('packages/ui/src/tokens/chrome.css');
const button = read('packages/ui/src/components/button.tsx');

function hexOf(css: string, name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  assert.ok(match, `${name} must be a literal hex in the token layer`);
  return match[1]!.toLowerCase();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('V2 semantic token values (CONTINUATION §13)', () => {
  it('os-web resolves the V2 brand values through the existing variables', () => {
    assert.equal(hexOf(globals, '--isalwa-porcelain'), '#f6f1e8');
    assert.equal(hexOf(globals, '--isalwa-white'), '#ffffff');
    assert.equal(hexOf(globals, '--isalwa-kiln'), '#18324b');
    assert.equal(hexOf(globals, '--isalwa-action-deep'), '#12263d');
    assert.equal(hexOf(globals, '--isalwa-glaze'), '#287a78');
    assert.equal(hexOf(globals, '--isalwa-glaze-deep'), '#1d635f');
    assert.equal(hexOf(globals, '--isalwa-teal-100'), '#e2f0ed');
    assert.equal(hexOf(globals, '--isalwa-sky-100'), '#edf5f8');
    assert.equal(hexOf(globals, '--isalwa-slate'), '#4a5d73');
  });

  it('status colors keep the V2 values', () => {
    assert.equal(hexOf(tokens, '--isalwa-success'), '#3a7a52');
    assert.equal(hexOf(tokens, '--isalwa-status-green-bg'), '#e7f4ec');
    assert.equal(hexOf(tokens, '--isalwa-warning'), '#b8872e');
    assert.equal(hexOf(tokens, '--isalwa-status-amber-bg'), '#fff5db');
    assert.equal(hexOf(tokens, '--isalwa-danger'), '#a63d36');
    assert.equal(hexOf(tokens, '--isalwa-status-red-bg'), '#fbe9e7');
  });

  it('introduces no new visual framework: no new design-system dependency in os-web', () => {
    const pkg = JSON.parse(read('apps/os-web/package.json')) as { dependencies?: Record<string, string> };
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      assert.doesNotMatch(name, /^(@mui|@chakra-ui|antd|@mantine|@radix-ui\/themes|@nextui-org|daisyui)/, name);
    }
  });
});

describe('effective contrast of the V2 pairs (WCAG AA)', () => {
  const kiln = '#18324b';
  const pairs: Array<[string, string, string, number]> = [
    ['primary text on canvas', kiln, '#f6f1e8', 4.5],
    ['primary text on panel', kiln, '#ffffff', 4.5],
    ['secondary text on canvas', '#4a5d73', '#f6f1e8', 4.5],
    ['secondary text on panel', '#4a5d73', '#ffffff', 4.5],
    ['white label on primary action', '#ffffff', kiln, 4.5],
    ['white label on primary hover', '#ffffff', '#12263d', 4.5],
    ['white label on context action', '#ffffff', '#287a78', 4.5],
    ['white label on context hover', '#ffffff', '#1d635f', 4.5],
    ['selected: deep teal on selected', '#1d635f', '#e2f0ed', 4.5],
    ['confirmed text on confirmed background', '#3a7a52', '#e7f4ec', 4.5],
    ['pending: navy text on pending background', kiln, '#fff5db', 4.5],
    ['error text on error background', '#a63d36', '#fbe9e7', 4.5],
    ['focus ring against panel (non-text 3:1)', '#1d635f', '#ffffff', 3],
    ['focus ring against canvas (non-text 3:1)', '#1d635f', '#f6f1e8', 3],
  ];
  for (const [name, fg, bg, min] of pairs) {
    it(name, () => {
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= min, `${name}: ${ratio.toFixed(2)} < ${min}`);
    });
  }
});

describe('control geometry', () => {
  it('buttons: default control is 44px; the compact size keeps a 44px hit area', () => {
    assert.match(button, /md: 'h-\[var\(--isalwa-control-height\)\]/);
    assert.match(button, /sm: "relative h-8 .*before:-top-1\.5 before:-bottom-1\.5/);
    assert.match(globals, /--isalwa-control-height: 44px/);
    assert.match(tokens, /--isalwa-control-height: 40px/, 'other apps keep their density');
  });

  it('fields are 44px with 16px text; chips keep a 44px hit area; radii are 8px/16px', () => {
    const field = /\.isalwa-field \{[^}]*\}/.exec(chrome)![0];
    assert.match(field, /height: var\(--isalwa-control-height\)/);
    assert.match(field, /font-size: var\(--isalwa-field-font-size\)/);
    assert.match(globals, /--isalwa-field-font-size: var\(--isalwa-text-base\)/);
    assert.match(chrome, /\.isalwa-chip::after \{[^}]*inset: -6px 0/);
    assert.match(tokens, /--isalwa-text-base: 16px/);
    assert.match(tokens, /--isalwa-text-sm: 13px/);
    assert.match(tokens, /--isalwa-radius-control: 8px/);
    assert.match(tokens, /--isalwa-radius-panel: 16px/);
  });

  it('native fields get the same floor in os-web and the page gutter is 16px mobile / 24px desktop', () => {
    assert.match(globals, /min-height: 44px;\s*font-size: var\(--isalwa-text-base\)/);
    assert.match(globals, /padding: var\(--isalwa-space-6\) var\(--isalwa-space-4\) var\(--isalwa-space-12\)/);
    assert.match(globals, /@media \(min-width: 768px\)[\s\S]*?var\(--isalwa-space-8\) var\(--isalwa-space-5\)/);
    assert.match(tokens, /--isalwa-space-4: 16px/);
    assert.match(tokens, /--isalwa-space-5: 24px/);
  });

  it('focus is a teal outline plus ring, not color alone', () => {
    assert.match(globals, /button:focus-visible[\s\S]*?outline: 2px solid var\(--isalwa-glaze-deep\)/);
    assert.match(globals, /--isalwa-shadow-focus: 0 0 0 3px rgba\(40, 122, 120, 0\.28\)/);
  });
});
