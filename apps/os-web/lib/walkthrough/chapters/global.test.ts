import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chapter, welcome, type TourStateLabel } from './global';

const STATE_LABELS = new Set<TourStateLabel>([
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
]);

const ALLOWED_TARGETS = new Set(['home-attention', 'global-search', 'nav-primary', 'help']);

const LIVE_LABELS = new Set<TourStateLabel>(['disponible']);

/** Topics this chapter must not present as something the person can use now. */
const NOT_LIVE = [
  { id: 'whatsapp', pattern: /whatsapp/i },
  { id: 'interactive-map', pattern: /mapa interactivo|abrir el mapa|el mapa muestra/i },
  { id: 'openai', pattern: /openai|modelo de lenguaje/i },
  { id: 'evidence-review', pattern: /revisi[oó]n de evidencia|revisar evidencia/i },
  { id: 'escalation', pattern: /escal/i },
  { id: 'executive-dashboard', pattern: /tablero ejecutivo|vista ejecutiva|centro de mando|secci[oó]n ejecutiva/i },
  { id: 'commitment-save', pattern: /guardar (el |un )?compromiso|compromiso se guarda|compromiso guardado/i },
] as const;

function userFacingText(): string {
  return [
    chapter.title,
    ...chapter.steps.flatMap((step) => [step.title, step.body]),
    welcome.title,
    welcome.body,
    welcome.startLabel,
    welcome.skipLabel,
    welcome.later,
  ].join('\n');
}

function sentenceCount(text: string): number {
  const parts = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length;
}

describe('global walkthrough chapter', () => {
  it('exports the chapter and welcome contract', () => {
    assert.equal(chapter.tourId, 'global');
    assert.equal(chapter.title, 'Cómo empezar');
    assert.equal(welcome.title, 'Bienvenido a ISALWA');
    assert.equal(welcome.startLabel, 'Comenzar recorrido');
    assert.equal(welcome.skipLabel, 'Explorar por mi cuenta');
    assert.equal(welcome.later, 'Puedes salir cuando quieras y volver desde Ayuda.');
    assert.match(welcome.body, /clientes, pendientes, decisiones y seguimiento/);
    assert.match(welcome.body, /quién maneja cada tema/i);
    assert.ok(chapter.steps.length >= 6);
  });

  it('keeps each step in the allowed shape', () => {
    const ids = new Set<string>();
    for (const step of chapter.steps) {
      assert.match(step.stepId, /^global\.[a-z0-9-]+$/);
      assert.equal(ids.has(step.stepId), false);
      ids.add(step.stepId);
      assert.equal(step.title.trim().length > 0, true);
      assert.equal(step.title.length <= 40, true);
      assert.equal(sentenceCount(step.body) >= 1, true);
      assert.equal(sentenceCount(step.body) <= 3, true);
      assert.equal(STATE_LABELS.has(step.stateLabel), true);
      if (step.target !== undefined) {
        assert.equal(ALLOWED_TARGETS.has(step.target), true);
      }
      if (step.nextRoute !== undefined) {
        assert.match(step.nextRoute, /^\/[a-z0-9/-]*$/);
      }
    }
  });

  it('teaches only the current first-login truth', () => {
    const inicio = chapter.steps.find((step) => step.stepId === 'global.inicio');
    const demo = chapter.steps.find((step) => step.stepId === 'global.vista-demo');
    const search = chapter.steps.find((step) => step.stepId === 'global.buscar');
    const nav = chapter.steps.find((step) => step.stepId === 'global.nav');
    const owner = chapter.steps.find((step) => step.stepId === 'global.responsable');
    const changed = chapter.steps.find((step) => step.stepId === 'global.que-cambio');
    const help = chapter.steps.find((step) => step.stepId === 'global.ayuda');

    assert.ok(inicio);
    assert.equal(inicio.target, 'home-attention');
    assert.equal(inicio.stateLabel, 'disponible');
    assert.match(inicio.body, /Empiece en Inicio/);

    assert.ok(demo);
    assert.equal(demo.stateLabel, 'vista-demo');
    assert.equal(demo.target, undefined);
    assert.match(demo.body, /no está conectado/);
    assert.match(demo.body, /No es una cifra/);

    assert.ok(search);
    assert.equal(search.target, 'global-search');
    assert.equal(search.stateLabel, 'disponible');
    assert.match(search.body, /clientes, cotizaciones y trabajo de su alcance/);
    assert.match(search.body, /No crea registros/);

    assert.ok(nav);
    assert.equal(nav.target, 'nav-primary');
    assert.equal(nav.stateLabel, 'disponible');
    for (const destination of [
      'Inicio',
      'Clientes',
      'Oportunidades',
      'Cotizaciones',
      'Trabajo',
      'Aprobaciones',
      'Administración',
    ]) {
      assert.match(nav.body, new RegExp(destination));
    }
    assert.doesNotMatch(nav.body, /Finanzas|Mensajes|Mapa|WhatsApp/i);

    assert.ok(owner);
    assert.equal(owner.stateLabel, 'disponible');
    assert.match(owner.body, /miembro asignado/);
    assert.match(owner.body, /cargo no asigna/);

    assert.ok(changed);
    assert.equal(changed.stateLabel, 'parcial');
    assert.equal(changed.nextRoute, undefined);
    assert.match(changed.body, /historial de un cliente/);
    assert.match(changed.body, /No es una página/);

    assert.ok(help);
    assert.equal(help.target, 'help');
    assert.equal(help.stateLabel, 'disponible');
    assert.equal(help.nextRoute, '/ayuda');
    assert.match(help.body, /Ayuda/);
  });

  it('does not teach recents or an executive section as live', () => {
    const text = userFacingText();
    assert.doesNotMatch(text, /recientes/i);
    assert.equal(
      chapter.steps.some(
        (step) =>
          LIVE_LABELS.has(step.stateLabel) &&
          /ejecutiv|reciente/i.test(`${step.title} ${step.body}`),
      ),
      false,
    );
    assert.equal(
      chapter.steps.some((step) => step.nextRoute === '/recientes' || step.target === 'recents'),
      false,
    );
  });

  it('does not claim unfinished capabilities as live', () => {
    const liveText = chapter.steps
      .filter((step) => LIVE_LABELS.has(step.stateLabel))
      .map((step) => `${step.title}\n${step.body}`)
      .join('\n');
    const allText = userFacingText();

    for (const topic of NOT_LIVE) {
      assert.equal(topic.pattern.test(liveText), false, `${topic.id} must not appear in a live step`);
      assert.equal(topic.pattern.test(allText), false, `${topic.id} must not be taught as available`);
    }
  });
});
