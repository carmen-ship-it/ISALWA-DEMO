import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('entregas phone primary actions', () => {
  it('quantity rows stack on phone and keep a full-width register field', () => {
    const docs = read('components/delivery/delivery-documents-panel.tsx');
    assert.match(docs, /data-entrega-quantity-row/);
    assert.match(docs, /grid grid-cols-1 gap-3/);
    assert.match(docs, /md:grid-cols-\[minmax\(0,1\.6fr\)_8rem_9rem_6rem\]/);
    assert.match(docs, /min-h-11 w-full/);
  });

  it('shows one primary CTA at a time with gate copy always available', () => {
    const docs = read('components/delivery/delivery-documents-panel.tsx');
    assert.match(docs, /data-entrega-primary-actions/);
    assert.match(docs, /data-entrega-gate="needs-salida"/);
    assert.match(docs, /data-entrega-gate="needs-received-by"/);
    assert.match(docs, /data-entrega-cta="salida"/);
    assert.match(docs, /data-entrega-cta="entrega"/);
    assert.match(docs, /data-entrega-cta="nota"/);
    // Salida is primary only while still needed; Entrega only when submittable.
    assert.match(docs, /gate === 'needs-salida' && !hasSalida/);
    assert.match(docs, /data-entrega-cta-primary=\{canSubmitEntrega/);
    // Completed writes stay disabled.
    assert.match(docs, /hasSalida/);
    assert.match(docs, /issuedNotes\.length > 0/);
    // Nota never competes as the hero primary.
    assert.doesNotMatch(docs, /data-entrega-cta="nota"[\s\S]{0,120}data-entrega-cta-primary/);
  });
});
