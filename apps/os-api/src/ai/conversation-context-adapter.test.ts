import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOrderDeepLink,
  buildPartyDeepLink,
  certaintyAnswerIsNonMutating,
  classifyAssistFactLine,
  factsFromAssistPacket,
  shapeConversationContextAnswer,
} from './conversation-context-adapter';

const ORG = 'org-a';
const OTHER = 'org-b';

describe('conversation-context-adapter', () => {
  it('classifies assist fact lines into certainty buckets', () => {
    assert.equal(classifyAssistFactLine('Incidencia (open): Falta fecha'), 'pendiente');
    assert.equal(classifyAssistFactLine('Incidencia (resolved): Entregado'), 'confirmado');
    assert.equal(classifyAssistFactLine('Compromiso (open): Llamar mañana'), 'pendiente');
    assert.equal(classifyAssistFactLine('Compromiso (completed): Entrega hecha'), 'confirmado');
    assert.equal(classifyAssistFactLine('Diario note · Cliente preguntó precio'), 'pendiente');
    assert.equal(
      classifyAssistFactLine('Cliente: sin incidencias autorizadas visibles.'),
      'no_registrado',
    );
    assert.equal(classifyAssistFactLine('Pregunta del usuario (no amplía…): hola'), 'skip');
  });

  it('shapes LO CONFIRMADO / PENDIENTE / NO REGISTRADO / FUENTES with deep links', () => {
    const answer = shapeConversationContextAnswer({
      actorOrganizationId: ORG,
      subjectType: 'party',
      subjectId: 'party-1',
      recommendation: 'Confirme la fecha con el asesor antes de prometer entrega.',
      responsible: { name: 'Wilma', team: 'Comercial' },
      facts: [
        {
          text: 'Incidencia (resolved): Pedido entregado en planta',
          organizationId: ORG,
          bucket: 'confirmado',
          source: {
            type: 'issue',
            id: 'issue-1',
            label: 'Incidencia',
            href: '/incidencias/issue-1',
          },
        },
        {
          text: 'Compromiso (open): Confirmar fecha de entrega',
          organizationId: ORG,
          bucket: 'pendiente',
          source: {
            type: 'commitment',
            id: 'cmt-1',
            label: 'Compromiso',
            href: '/clientes/party-1#compromisos',
          },
        },
      ],
      missingHints: ['Número de WhatsApp corporativo del asesor no registrado'],
    });

    assert.deepEqual(answer.loConfirmado, ['Incidencia (resolved): Pedido entregado en planta']);
    assert.deepEqual(answer.pendienteDeConfirmar, [
      'Compromiso (open): Confirmar fecha de entrega',
    ]);
    assert.ok(answer.noRegistrado.some((line) => /WhatsApp corporativo/.test(line)));
    assert.match(answer.recomendacion, /Confirme la fecha/);
    assert.equal(answer.aQuienPreguntar, 'Wilma · Comercial');
    assert.ok(answer.fuentes.some((f) => f.href === '/incidencias/issue-1'));
    assert.ok(answer.fuentes.some((f) => f.href === '/clientes/party-1#compromisos'));
    assert.equal(certaintyAnswerIsNonMutating(answer), true);
  });

  it('drops cross-tenant facts (negative)', () => {
    const answer = shapeConversationContextAnswer({
      actorOrganizationId: ORG,
      subjectType: 'party',
      subjectId: 'party-1',
      facts: [
        {
          text: 'SECRET_OTHER_TENANT',
          organizationId: OTHER,
          bucket: 'confirmado',
          source: buildPartyDeepLink('party-foreign'),
        },
        {
          text: 'Incidencia (open): Visible en tenant',
          organizationId: ORG,
          bucket: 'pendiente',
        },
      ],
    });

    assert.equal(answer.loConfirmado.length, 0);
    assert.deepEqual(answer.pendienteDeConfirmar, ['Incidencia (open): Visible en tenant']);
    assert.equal(
      answer.fuentes.some((f) => f.href.includes('party-foreign')),
      false,
    );
    assert.equal(JSON.stringify(answer).includes('SECRET_OTHER_TENANT'), false);
  });

  it('reports no responsible when canonical owner is unknown', () => {
    const answer = shapeConversationContextAnswer({
      actorOrganizationId: ORG,
      subjectType: 'issue',
      subjectId: 'issue-9',
      facts: [],
    });
    assert.match(answer.aQuienPreguntar, /Aún no hay una persona responsable/);
    assert.ok(answer.noRegistrado.length >= 1);
    assert.ok(answer.fuentes.some((f) => f.href === '/incidencias/issue-9'));
  });

  it('builds pedido deep links under the client path', () => {
    const link = buildOrderDeepLink('ord-1', 'party-1');
    assert.equal(link.href, '/clientes/party-1/pedidos/ord-1');
    assert.equal(link.type, 'order');
  });

  it('maps assist packet lines into authorized facts with refs', () => {
    const facts = factsFromAssistPacket({
      organizationId: ORG,
      partyId: 'party-1',
      facts: [
        'Incidencia (open): Falta empaque',
        'Pregunta del usuario (no amplía el alcance de evidencia): ¿qué digo?',
      ],
      evidenceRefs: [{ type: 'issue', id: 'issue-1' }],
    });
    assert.equal(facts.length, 1);
    assert.equal(facts[0]?.bucket, 'pendiente');
    assert.equal(facts[0]?.source?.href, '/incidencias/issue-1');
  });
});
