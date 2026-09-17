import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filterNavByAccess, PRIMARY_NAV, FUTURE_NAV, HIDDEN_PRIMARY_NAV_IDS } from '@/lib/navigation/nav-config';
import { t } from '@/lib/i18n/es';
import { CONVERSATIONS_COPY } from './copy';
import { DEMO_WHATSAPP_BADGE, DEMO_WHATSAPP_BANNER } from './model';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('conversaciones route shell', () => {
  it('adds Conversaciones under Trabajo and keeps Mensajes locked/hidden', () => {
    const trabajoIds = PRIMARY_NAV.filter((item) => item.group === 'trabajo').map((item) => item.id);
    assert.deepEqual(trabajoIds, [
      'trabajo',
      'conversaciones',
      'aprobaciones',
      'incidencias',
      'compromisos',
    ]);
    assert.equal(t('nav.conversaciones'), 'Conversaciones');
    assert.equal(PRIMARY_NAV.some((item) => item.id === 'mensajes'), false);
    assert.deepEqual(
      FUTURE_NAV.map((item) => item.id),
      ['mensajes'],
    );
    assert.ok(HIDDEN_PRIMARY_NAV_IDS.includes('mensajes'));
    assert.ok(
      filterNavByAccess(PRIMARY_NAV, { showAdmin: false }).some((item) => item.id === 'conversaciones'),
    );
  });

  it('page is authorized Conversaciones, not WhatsApp branding', () => {
    const page = readFileSync(join(root, 'app/(app)/conversaciones/page.tsx'), 'utf8');
    const workspace = readFileSync(
      join(root, 'components/conversations/conversations-workspace.tsx'),
      'utf8',
    );
    assert.match(page, /ConversationsWorkspace/);
    assert.match(page, /getServerOsAuthContext/);
    assert.doesNotMatch(page, /WhatsApp Business|Meta|Twilio/i);
    assert.match(workspace, /28%/);
    assert.match(workspace, /44%/);
    assert.match(workspace, /ManualConversationPanel/);
    assert.match(workspace, /ConversationContextPanel/);
    assert.equal(CONVERSATIONS_COPY.title, 'Conversaciones');
    assert.doesNotMatch(CONVERSATIONS_COPY.title, /WhatsApp/i);
  });

  it('demo badge never claims live WhatsApp', () => {
    const badge = readFileSync(
      join(root, 'components/conversations/conversation-demo-badge.tsx'),
      'utf8',
    );
    assert.match(badge, /DEMO_WHATSAPP_BADGE/);
    assert.equal(DEMO_WHATSAPP_BADGE, 'DEMO·WHATSAPP');
    assert.match(DEMO_WHATSAPP_BANNER, /no está conectado/i);
    assert.doesNotMatch(DEMO_WHATSAPP_BANNER, /conectado y listo|WhatsApp en vivo|canal en vivo conectado/i);
  });

  it('thread has no fake read ticks', () => {
    const thread = readFileSync(
      join(root, 'components/conversations/conversation-thread.tsx'),
      'utf8',
    );
    assert.match(thread, /noReadTicks/);
    assert.doesNotMatch(thread, /✓✓|read receipt|leído/i);
  });

  it('prefers durable API rows and skips JSON demo fixtures when durableRows exist', () => {
    const page = readFileSync(join(root, 'app/(app)/conversaciones/page.tsx'), 'utf8');
    assert.match(page, /listCustomerConversations/);
    assert.match(page, /projectManualConversation/);
    assert.match(page, /durableRows\.length === 0/);
    assert.match(page, /ownerDemoConversationFixtures/);
    // JSON fixtures only when durable list is empty — never merge alongside durable rows.
    assert.match(
      page,
      /dataMode === 'demo' && organizationId && durableRows\.length === 0/,
    );
  });
});
