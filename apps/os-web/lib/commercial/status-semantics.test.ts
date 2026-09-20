import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statusTone } from './labels';
import { statusToneFromLabel } from '@isalwa/ui';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function readRepo(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Task 3 shared status semantics', () => {
  it('DECORATIVE_PLUS_ON_STATUS = 0 — open/active never default to progress (+)', () => {
    const source = readRepo('packages/ui/src/components/status-pill.tsx');
    // Default icons for open/active/soft-teal/sky must be 'none', not 'progress'.
    assert.match(source, /open:\s*'none'/);
    assert.match(source, /active:\s*'none'/);
    assert.match(source, /'soft-teal':\s*'none'/);
    assert.match(source, /sky:\s*'none'/);
    assert.doesNotMatch(source, /open:\s*'progress'/);
    assert.doesNotMatch(source, /active:\s*'progress'/);
    assert.doesNotMatch(source, /in_progress:\s*'progress'/);
  });

  it('OPEN_STATUS_RENDERED_AS_SUCCESS = 0', () => {
    assert.equal(statusTone('open'), 'open');
    assert.notEqual(statusTone('open'), 'success');
    assert.notEqual(statusTone('open'), 'approved');
    assert.notEqual(statusTone('open'), 'completed');
    assert.equal(statusToneFromLabel('Abierta'), 'open');
    assert.equal(statusToneFromLabel('Registrado'), 'open');
    assert.equal(statusToneFromLabel('En curso'), 'in_progress');
    assert.notEqual(statusToneFromLabel('Abierta'), 'success');
    assert.notEqual(statusToneFromLabel('Abierta'), 'approved');
    assert.notEqual(statusToneFromLabel('Abierta'), 'completed');
    assert.notEqual(statusToneFromLabel('Abierta'), 'green');
  });

  it('STATUS_SEMANTIC_FAMILIES map Spanish labels correctly', () => {
    // NEUTRAL
    assert.equal(statusToneFromLabel('Borrador'), 'draft');
    assert.equal(statusToneFromLabel('Sin revisión abierta'), 'neutral-sky');
    // ACTIVE
    assert.equal(statusToneFromLabel('Abierta'), 'open');
    assert.equal(statusToneFromLabel('En curso'), 'in_progress');
    assert.equal(statusToneFromLabel('Enviada'), 'in_progress');
    // ATTENTION
    assert.equal(statusToneFromLabel('Pendiente'), 'pending');
    assert.equal(statusToneFromLabel('Actualización solicitada'), 'pending');
    assert.equal(statusToneFromLabel('Revisión de producción'), 'pending');
    // SUCCESS
    assert.equal(statusToneFromLabel('Aceptada'), 'approved');
    assert.equal(statusToneFromLabel('Completado'), 'completed');
    assert.equal(statusToneFromLabel('Entregada'), 'completed');
    // DANGER
    assert.equal(statusToneFromLabel('Vencido'), 'overdue');
    assert.equal(statusToneFromLabel('Rechazada'), 'rejected');
    assert.equal(statusToneFromLabel('Perdida'), 'rejected');
    assert.equal(statusToneFromLabel('Cancelada'), 'cancelled');
  });

  it('STATUS_AND_ACTION_VISUALLY_CONFLATED = 0 on representative ops desks', () => {
    const production = readRepo('apps/os-web/components/production/production-ops-table.tsx');
    const almacen = readRepo('apps/os-web/app/(app)/almacen/page.tsx');
    const compras = readRepo('apps/os-web/app/(app)/compras/page.tsx');

    // Status pills remain state labels
    assert.match(production, /Revisión de producción/);
    assert.match(almacen, /Revisión de almacén/);
    assert.match(compras, /Revisión de abastecimiento/);

    // Actions use clear CTAs, not ambiguous nouns
    assert.match(production, />\s*Ver revisión\s*</);
    assert.match(production, />\s*Ver solicitud\s*</);
    assert.doesNotMatch(production, />\s*Trabajo\s*</);
    assert.doesNotMatch(production, />\s*Revisión\s*</);
    assert.match(almacen, />\s*Ver revisión\s*</);
    assert.doesNotMatch(almacen, />\s*Revisión\s*</);
    assert.match(compras, />\s*Ver revisión\s*</);
    assert.doesNotMatch(compras, />\s*Revisión\s*</);
  });

  it('UNAPPROVED_COLORS = 0 in StatusPill tone classes', () => {
    const source = readRepo('packages/ui/src/components/status-pill.tsx');
    // No hex literals outside approved token vars
    const hexes = source.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    assert.equal(hexes.length, 0, `unexpected hex colors: ${hexes.join(', ')}`);
    // Active family uses soft-teal token
    assert.match(source, /open: 'bg-\[var\(--isalwa-soft-teal\)\]/);
    assert.match(source, /in_progress: 'bg-\[var\(--isalwa-soft-teal\)\]/);
    // Attention uses amber token
    assert.match(source, /pending: 'bg-\[var\(--isalwa-status-amber-bg\)\]/);
    // Danger uses red token
    assert.match(source, /rejected: 'bg-\[var\(--isalwa-status-red-bg\)\]/);
    // Success uses green token
    assert.match(source, /completed: 'bg-\[var\(--isalwa-status-green-bg\)\]/);
  });
});
