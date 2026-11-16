import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { aiChannelHealth, emailChannelHealth, whatsappChannelHealth } from './channel-health';

const here = dirname(fileURLToPath(import.meta.url));

describe('Batch 9: channel health never claims a connection that does not exist', () => {
  it('WhatsApp is "No conectado" for every environment, including a declared provider', () => {
    for (const provider of [undefined, '', 'mock', 'meta', 'whatsapp-cloud', 'live']) {
      const row = whatsappChannelHealth({ MESSAGING_PROVIDER: provider });
      assert.equal(row.state, 'No conectado');
      assert.equal(row.tone, 'neutral');
      assert.doesNotMatch(row.state, /Funcionando/);
      assert.match(row.detail, /no envía ni recibe/i);
    }
  });

  it('a declared WhatsApp provider is described as a declaration, not a connection', () => {
    const row = whatsappChannelHealth({ MESSAGING_PROVIDER: 'meta' });
    assert.match(row.detail, /Se declaró un proveedor/);
    assert.match(row.detail, /autorización de activación/);
  });

  it('email is "No conectado" even when a provider is declared', () => {
    for (const provider of [undefined, 'mock', 'resend', 'live']) {
      const row = emailChannelHealth({ EMAIL_PROVIDER: provider });
      assert.equal(row.state, 'No conectado');
      assert.doesNotMatch(row.state, /Funcionando/);
    }
  });

  it('AI with a credential is "configurada, sin verificar", never "Funcionando"', () => {
    const row = aiChannelHealth({ show: true, citationsLive: true });
    assert.equal(row.state, 'Configurada, sin verificar');
    assert.notEqual(row.tone, 'success');
    assert.match(row.detail, /una persona decide y confirma/);
  });

  it('AI mock is labeled as a test double and a blocked AI stays off', () => {
    const mock = aiChannelHealth({ show: true, citationsLive: false });
    assert.equal(mock.state, 'Piloto (mock)');
    assert.match(mock.detail, /doble de prueba/);
    const blocked = aiChannelHealth({ show: false, citationsLive: false, blocker: 'PROVIDER_BLOCKED' });
    assert.equal(blocked.state, 'Falta configurar');
    const off = aiChannelHealth({ show: false, citationsLive: false, blocker: 'DISABLED' });
    assert.equal(off.state, 'Desactivada');
  });

  it('the system page uses these rows and no longer derives "Funcionando" from provider names', () => {
    const page = readFileSync(join(here, '../../app/(app)/sistema/page.tsx'), 'utf8');
    assert.match(page, /whatsappChannelHealth\(process\.env\)/);
    assert.match(page, /emailChannelHealth\(process\.env\)/);
    assert.match(page, /aiChannelHealth\(/);
    assert.doesNotMatch(page, /messagingKind|emailKind/);
  });

  it('no os-web conversation surface renders a send control while WhatsApp is not connected', () => {
    const thread = readFileSync(
      join(here, '../../components/conversations/conversation-thread.tsx'),
      'utf8',
    );
    assert.doesNotMatch(thread, /<textarea|<form|onSend|sendMessage|type="submit"/);
    assert.match(thread, /whatsappNotConnected/);
  });
});
