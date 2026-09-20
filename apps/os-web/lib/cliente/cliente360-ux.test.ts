import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import {
  isCliente360NavSection,
  CLIENTE360_NAV_SECTIONS,
  parseCliente360Tab,
} from '@/lib/cliente/nav-sections';
import { displayCliente360NextAction } from '@/lib/cliente/next-action-display';
import { clienteSectionHref } from '@/lib/commercial/navigation';
import type { Cliente360Composition } from '@/lib/party/next-action';
import { PRIMARY_NAV } from '@/lib/navigation/nav-config';

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

  it('parses ?tab= with default resumen', () => {
    assert.equal(parseCliente360Tab('trabajo'), 'trabajo');
    assert.equal(parseCliente360Tab(['historial']), 'historial');
    assert.equal(parseCliente360Tab('nope'), 'resumen');
    assert.equal(parseCliente360Tab(undefined), 'resumen');
  });

  it('builds deep links with ?tab= that survive refresh', () => {
    assert.equal(clienteSectionHref('pty_1', 'comercial'), '/clientes/pty_1?tab=comercial');
    assert.equal(
      clienteSectionHref('pty 1', 'operacion', 'finanzas'),
      '/clientes/pty%201?tab=operacion#finanzas',
    );
  });
});

describe('Compromisos nav destination', () => {
  it('points Compromisos at /compromisos not /inicio', () => {
    const item = PRIMARY_NAV.find((entry) => entry.id === 'compromisos');
    assert.ok(item);
    assert.equal(item.href, '/compromisos');
    assert.notEqual(item.href, '/inicio');
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


describe('Cliente 360 identity', () => {
  it('exposes human-facing Cliente 360 label without fused Cliente360', () => {
    assert.equal(CLIENTE360_UX_COPY.identityLabel, 'Cliente 360');
    assert.equal(CLIENTE360_UX_COPY.identityLabel.includes(' '), true);
    assert.equal(CLIENTE360_UX_COPY.identityLabel, 'Cliente 360');
    for (const value of Object.values(CLIENTE360_UX_COPY)) {
      assert.equal(value.includes('Cliente360'), false, `fused label in UX copy: ${value}`);
    }
  });

  it('keeps Próxima acción as the next-action heading', () => {
    assert.equal(CLIENTE360_UX_COPY.nextActionHeading, 'Próxima acción');
  });
});

describe('Cliente 360 surface copy', () => {
  it('header kicker uses Cliente 360', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const header = readFileSync(
      resolve(here, '../../components/cliente/cliente-360-header.tsx'),
      'utf8',
    );
    assert.match(header, /CLIENTE360_UX_COPY\.identityLabel/);
    assert.equal(header.includes('>Cliente</p>'), false);
    // Code identifiers (Cliente360Header) are fine; fused UX label is not.
    assert.doesNotMatch(header, /['">]Cliente360['"<]/);
  });

  it('resumen does not lead with ¿Por qué veo esto?', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const now = readFileSync(resolve(here, '../../components/party/cliente-360-now.tsx'), 'utf8');
    assert.equal(now.includes('¿Por qué veo esto?'), false);
    assert.match(now, /contextDisclosure/);
    assert.match(now, /Bloqueos/);
  });
});
