import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { displayQualityRatio } from './quality-display';

describe('production panel quality display', () => {
  it('does not invent a percent when a count is missing', () => {
    assert.equal(displayQualityRatio(8, null), null);
    assert.equal(displayQualityRatio(null, 2), null);
    assert.equal(displayQualityRatio(0, 0), null);
    assert.deepEqual(displayQualityRatio(8, 2), { goodPercent: '80', lostPercent: '20' });
  });

  it('keeps the governed Spanish step names and does not claim an order assignment', () => {
    const panel = readFileSync(
      join(__dirname, '../../components/production/production-panel.tsx'),
      'utf8',
    );
    const labels = [
      'Laboratorio — preparación de materia prima y esmalte',
      'Molienda',
      'Colaje',
      'Secado',
      'Pulido',
      'Esmaltado',
      'Carga y Limpieza',
      'Horno',
      'Resane',
      'Clasificación',
      'Almacén de Productos Terminados',
    ];
    for (const label of labels) {
      assert.equal(panel.includes(label), true, label);
    }
    assert.equal(panel.includes('Producción'), true);
    assert.equal(panel.includes('Listo'), true);
    assert.equal(panel.includes('materia prima'), true);
    assert.equal(panel.includes('insumos'), true);
    assert.equal(panel.includes('combustible'), true);
    assert.equal(/ERP/.test(panel), false);
    assert.equal(/WhatsApp/.test(panel), false);
    assert.equal(/completionPercent/.test(panel), false);
    assert.equal(/orderId/.test(panel), false);
  });
});
