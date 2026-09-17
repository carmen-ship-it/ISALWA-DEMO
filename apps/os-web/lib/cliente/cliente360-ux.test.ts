import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import { isCliente360NavSection, CLIENTE360_NAV_SECTIONS } from '@/lib/cliente/nav-sections';
import { displayCliente360NextAction } from '@/lib/cliente/next-action-display';
import type { Cliente360Composition } from '@/lib/party/next-action';

function nextAction(
  overrides: Partial<Cliente360Composition['nextAction']>,
): Cliente360Composition['nextAction'] {
  return {
    kind: 'insufficient',
    statement: 'No hay señal suficiente para indicar una próxima acción.',
    href: null,
    hrefLabel: null,
    dueText: null,
    overdue: false,
    workItemId: null,
    ...overrides,
  };
}

describe('Cliente360 UX nav', () => {
  it('exposes exactly six sections in order', () => {
    assert.equal(CLIENTE360_NAV_SECTIONS.length, 6);
    assert.deepEqual(
      CLIENTE360_NAV_SECTIONS.map((s) => s.id),
      ['resumen', 'comercial', 'operacion', 'trabajo', 'documentos', 'historial'],
    );
  });

  it('recognizes valid section ids', () => {
    assert.equal(isCliente360NavSection('comercial'), true);
    assert.equal(isCliente360NavSection('contactos'), false);
  });
});

describe('displayCliente360NextAction', () => {
  it('replaces insufficient copy with calm empty state', () => {
    const shown = displayCliente360NextAction(nextAction({ kind: 'insufficient' }));
    assert.equal(shown.text, CLIENTE360_UX_COPY.noNextAction);
    assert.equal(shown.isRegisteredAction, false);
  });

  it('replaces unreadable copy with calm empty state', () => {
    const shown = displayCliente360NextAction(
      nextAction({ kind: 'unreadable', statement: 'No se indica una próxima acción porque no se pudo leer el seguimiento.' }),
    );
    assert.equal(shown.text, CLIENTE360_UX_COPY.noNextAction);
  });

  it('keeps recorded follow-up statement', () => {
    const shown = displayCliente360NextAction(
      nextAction({
        kind: 'recorded_follow_up',
        statement: 'Llamar al cliente',
        href: '/trabajo/w-1',
        hrefLabel: 'Ver seguimiento',
        dueText: 'Vence mañana',
        workItemId: 'w-1',
      }),
    );
    assert.equal(shown.text, 'Llamar al cliente');
    assert.equal(shown.isRegisteredAction, true);
    assert.equal(shown.href, '/trabajo/w-1');
  });
});
