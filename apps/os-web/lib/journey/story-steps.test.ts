import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  STORY_DECISION_HEADING,
  STORY_END_BODY,
  STORY_END_BUTTON,
  STORY_END_FOOTNOTE,
  STORY_END_HREF,
  STORY_END_TITLE,
  STORY_EXTERNAL_HEADING,
  STORY_FEEDBACK_PROMPT,
  STORY_INTRO,
  STORY_MODE_STEPS,
  STORY_MODE_TITLE,
  STORY_PROPOSAL_NOTICE,
  STORY_STATUS_LABELS,
  isStoryPdfApiHref,
  storyPrimaryActionLabel,
  storyStepState,
  type StoryStepStatus,
} from './story-steps';

const EXACT_TITLES = [
  'Empieza con lo que requiere atención',
  'Atiende una conversación o registra una atención',
  'Busca o registra al cliente',
  'Consulta Cliente 360',
  'Corrige datos con trazabilidad',
  'Gestiona teléfonos y contactos',
  'Da apoyo temporal sin cambiar al responsable',
  'Mantén el cliente al día',
  'Consulta el catálogo de productos',
  'Organiza la oportunidad y el próximo paso',
  'Prepara la cotización',
  'Solicita la aprobación necesaria',
  'Emite el documento exacto',
  'Comparte la cotización y registra la aceptación',
  'Crea el pedido de forma explícita',
  'Reporta y verifica pagos',
  'Cumple compromisos y resuelve problemas',
  'El equipo continúa sin perder contexto',
  'Revisa clientes y seguimiento en el mapa',
  'Conecta WhatsApp e IA con control humano',
] as const;

describe('Recorrido guiado — dual-layer Journey', () => {
  it('has exactly 20 consecutive steps with exact Spanish titles', () => {
    assert.equal(STORY_MODE_STEPS.length, 20);
    assert.deepEqual(
      STORY_MODE_STEPS.map((s) => s.step),
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    assert.deepEqual(
      STORY_MODE_STEPS.map((s) => s.title),
      [...EXACT_TITLES],
    );
    assert.equal(storyStepState(1, 3), 'completed');
    assert.equal(storyStepState(3, 3), 'current');
    assert.equal(storyStepState(5, 3), 'future');
    assert.equal(isStoryPdfApiHref('/api/delivery-notes/n1/pdf'), true);
    assert.equal(isStoryPdfApiHref('/clientes/x'), false);
  });

  it('uses exact panel chrome, status labels and action labels', () => {
    assert.equal(STORY_MODE_TITLE, 'Recorrido guiado');
    assert.equal(
      STORY_INTRO,
      'Este recorrido muestra lo que puedes probar hoy y cómo se conectarán las siguientes etapas comerciales de ISALWA. Las vistas de propuesta sirven para revisar el flujo antes de activarlo.',
    );
    assert.equal(
      STORY_PROPOSAL_NOTICE,
      'Vista de propuesta · Esta etapa todavía no guarda cambios ni envía información.',
    );
    assert.equal(STORY_DECISION_HEADING, 'Para decidir con ISALWA');
    assert.equal(STORY_EXTERNAL_HEADING, 'Requisito antes de activarlo');
    assert.match(STORY_FEEDBACK_PROMPT, /Durante la evaluación, anota:/);
    assert.equal(STORY_END_TITLE, 'Fin del recorrido');
    assert.equal(STORY_END_BUTTON, 'Volver a Hoy');
    assert.equal(STORY_END_HREF, '/inicio');
    assert.match(STORY_END_BODY, /decisiones que ISALWA necesita confirmar/);
    assert.match(STORY_END_FOOTNOTE, /Tu opinión ayudará/);
    assert.equal(STORY_STATUS_LABELS.available, 'Disponible para probar');
    assert.equal(STORY_STATUS_LABELS.partial, 'Disponible parcialmente');
    assert.equal(STORY_STATUS_LABELS.proposal, 'Vista de propuesta');
    assert.equal(STORY_STATUS_LABELS.decision, 'Decisión pendiente de ISALWA');
    assert.equal(STORY_STATUS_LABELS.external, 'Requiere configuración externa');
    assert.equal(storyPrimaryActionLabel('available'), 'Abrir esta sección');
    assert.equal(storyPrimaryActionLabel('partial'), 'Abrir esta sección');
    assert.equal(storyPrimaryActionLabel('proposal'), 'Ver propuesta');
    assert.equal(storyPrimaryActionLabel('decision'), 'Ver qué necesitamos decidir');
    assert.equal(storyPrimaryActionLabel('external'), 'Ver requisito');
  });

  it('only gives a real route CTA to working or partial steps', () => {
    const workingStatuses: StoryStepStatus[] = ['available', 'partial'];
    for (const step of STORY_MODE_STEPS) {
      if (workingStatuses.includes(step.status)) {
        assert.equal(step.workingActionLabel, 'Abrir esta sección', `step ${step.step}`);
        assert.ok(step.href, `step ${step.step} needs href`);
        assert.match(step.href!, /^\/[a-z0-9/-]+$/i, `step ${step.step} href ${step.href}`);
        assert.doesNotMatch(step.href!, /[?&](datos|empresa|org|organizationId)=/, `step ${step.step}`);
        assert.equal(isStoryPdfApiHref(step.href!), false, `step ${step.step}`);
        const pageFile = join(process.cwd(), 'app/(app)', step.href!.replace(/^\//, '').split('/')[0]!, 'page.tsx');
        assert.ok(existsSync(pageFile), `step ${step.step} points to a missing desk ${step.href}`);
      } else {
        assert.equal(step.workingActionLabel, null, `step ${step.step}`);
        assert.equal(step.href, null, `step ${step.step}`);
      }
      assert.ok(step.proposalText.length > 0, `step ${step.step} proposal`);
      assert.ok(step.currentStateText.length > 0, `step ${step.step} current`);
      assert.doesNotMatch(
        `${step.title} ${step.currentStateText} ${step.proposalText} ${step.decisionText ?? ''} ${step.externalRequirement ?? ''}`,
        /DEMO|MADERAS|datos=demo|DEMO · ficticio/,
      );
    }
    assert.equal(STORY_MODE_STEPS[0]!.href, '/inicio');
    assert.equal(STORY_MODE_STEPS[1]!.href, '/conversaciones');
    assert.equal(STORY_MODE_STEPS[2]!.href, '/clientes');
  });

  it('keeps exact decision and external copy where required', () => {
    const byStep = Object.fromEntries(STORY_MODE_STEPS.map((s) => [s.step, s]));
    assert.equal(
      byStep[9]!.decisionText,
      'Necesitamos el catálogo PDF aprobado y la lista de precios vigente, o una persona autorizada para aprobar cada excepción de precio.',
    );
    assert.equal(
      byStep[12]!.decisionText,
      'Necesitamos confirmar quién aprueba excepciones de precio y descuento, y qué persona real tendrá esa autoridad en la activación.',
    );
    assert.equal(
      byStep[14]!.decisionText,
      'Necesitamos confirmar si cada asesor usará su número corporativo o si ISALWA usará una línea compartida.',
    );
    assert.equal(
      byStep[2]!.externalRequirement,
      'WhatsApp todavía no está conectado en esta evaluación.',
    );
    assert.equal(
      byStep[20]!.externalRequirement,
      'Se requieren acceso Meta/WhatsApp, número autorizado, contenido publicado y pruebas controladas antes de activar mensajes reales.',
    );
    assert.equal(byStep[9]!.status, 'proposal');
    assert.equal(byStep[12]!.status, 'decision');
    assert.equal(byStep[14]!.status, 'external');
    assert.equal(byStep[20]!.status, 'external');
  });

  it('opening the Journey is presentation only: no API client, server action or storage in its files', () => {
    for (const file of [
      'components/journey/journey-provider.tsx',
      'components/journey/owner-story-mode.tsx',
      'components/journey/ver-ejemplo-completo-button.tsx',
      'lib/journey/story-steps.ts',
    ]) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      assert.doesNotMatch(
        source,
        /'use server'|os-api-client|createOsApiClient|\bfetch\(|lib\/.*actions'|seed|sample/i,
        file,
      );
      assert.doesNotMatch(source, /setDataMode|saveDemoDataMode|datos=demo|withStoryDemoDatos/);
    }
  });

  it('overlay keeps Recorrido guiado chrome and never mutates org/data mode', () => {
    const overlay = readFileSync(join(process.cwd(), 'components/journey/owner-story-mode.tsx'), 'utf8');
    assert.match(overlay, /Recorrido guiado|STORY_MODE_TITLE/);
    assert.match(overlay, /STORY_PROPOSAL_NOTICE/);
    assert.match(overlay, /Anterior/);
    assert.match(overlay, /Siguiente/);
    assert.match(overlay, /Cerrar recorrido/);
    assert.match(overlay, /Lo que puedes probar ahora/);
    assert.match(overlay, /Así funcionará esta etapa/);
    assert.match(overlay, /Escape/);
    assert.match(overlay, /p-3 sm:p-6/);
    assert.match(overlay, /role="dialog"/);
    assert.match(overlay, /aria-modal="true"/);
    assert.doesNotMatch(overlay, /DEMO_FICTITIOUS_BADGE|loadDemoSeedIdMap|seed DEMO|SYNTH/);
    assert.doesNotMatch(overlay, /setDataMode|organizationId|saveDemoDataMode|localStorage/);
    assert.doesNotMatch(overlay, /Modo aprendizaje|datos=demo/);
    assert.doesNotMatch(overlay, /'use server'|createOsApiClient|\bfetch\(/);
  });

  it('classifies steps 1–8 and 18 as working/partial with routes; 9–17 and 19–20 without mutation CTAs', () => {
    const by = Object.fromEntries(STORY_MODE_STEPS.map((s) => [s.step, s]));
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 18]) {
      assert.ok(by[n]!.href, `step ${n}`);
      assert.ok(['available', 'partial'].includes(by[n]!.status), `step ${n} status`);
    }
    for (const n of [9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20]) {
      assert.equal(by[n]!.href, null, `step ${n}`);
      assert.equal(by[n]!.workingActionLabel, null, `step ${n}`);
      assert.ok(['proposal', 'decision', 'external'].includes(by[n]!.status), `step ${n}`);
    }
    assert.equal(by[12]!.status, 'decision');
    assert.equal(by[14]!.status, 'external');
    assert.equal(by[20]!.status, 'external');
  });

  it('web PDF routes proxy to os-api (no static sample PDF)', () => {
    const quoteRoute = readFileSync(join(process.cwd(), 'app/api/quotes/[quoteId]/pdf/route.ts'), 'utf8');
    const dnRoute = readFileSync(join(process.cwd(), 'app/api/delivery-notes/[id]/pdf/route.ts'), 'utf8');
    assert.match(quoteRoute, /getQuotePdf/);
    assert.match(dnRoute, /getDeliveryNotePdf/);
    assert.doesNotMatch(quoteRoute, /demo|fixture.*\.pdf|readFileSync.*pdf/);
    assert.doesNotMatch(dnRoute, /demo|fixture.*\.pdf|readFileSync.*pdf/);
  });
});
