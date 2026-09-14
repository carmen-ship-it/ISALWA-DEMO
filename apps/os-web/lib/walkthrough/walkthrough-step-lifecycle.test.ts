import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chapter as commercialChapter } from './chapters/commercial';
import { chapter as mapChapter } from './chapters/map-truth';
import { chapter as messagesChapter } from './chapters/whatsapp-ai';
import { chapter as workforceChapter } from './chapters/workforce';
import { loadWalkthroughContent } from './content';
import { chapterRunState, flattenChapters, nextIndexSkippingMissing, type PlannedStep } from './plan';
import { getChapters, resetWalkthroughRegistryForTests } from './registry';
import {
  authoredStepIndex,
  cardStaysMounted,
  decideNext,
  keepsAuthoredStep,
  missingTargetDecision,
  replayChapter,
  resumeSurface,
  shouldKeepExternalOpener,
  shouldPushNextRoute,
} from './step-lifecycle';
import { initialWalkthroughRecord, reduceWalkthrough } from './state';
import type { TourChapter, WalkthroughRecord } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROVIDER = join(HERE, '../../components/walkthrough/walkthrough-provider.tsx');
const POPOVER = join(HERE, '../../components/walkthrough/walkthrough-popover.tsx');

resetWalkthroughRegistryForTests();
loadWalkthroughContent();

function chapter(id: string): TourChapter {
  const found = getChapters().find((item) => item.chapterId === id);
  assert.ok(found, id);
  return found;
}

function stepsFor(id: string): PlannedStep[] {
  return flattenChapters([chapter(id)]);
}

function clickThrough(chapterId: string): { visited: string[]; record: WalkthroughRecord } {
  const steps = stepsFor(chapterId);
  const visited: string[] = [];
  let record = replayChapter(initialWalkthroughRecord(), steps, chapterId).record;
  assert.ok(record.stepId);
  visited.push(record.stepId);
  for (let guard = 0; guard < steps.length + 1; guard += 1) {
    const decision = decideNext({
      steps,
      stepId: record.stepId,
      scopeChapterId: record.scopeChapterId,
      chapterId: record.chapterId,
    });
    if (decision.type === 'advance') {
      const next = steps[decision.index];
      assert.ok(next);
      record = reduceWalkthrough(record, {
        type: 'ADVANCE',
        chapterId: next.chapterId,
        stepId: next.stepId,
      });
      assert.ok(record.stepId);
      visited.push(record.stepId);
      continue;
    }
    if (decision.type === 'complete') {
      record = reduceWalkthrough(record, { type: 'COMPLETE', chapterId: decision.chapterId });
      return { visited, record };
    }
    break;
  }
  throw new Error(`${chapterId} did not complete`);
}

function assertCopyUnchanged(
  registered: TourChapter,
  sourceSteps: readonly { stepId: string; title: string; body: string; stateLabel: string; target?: string }[],
): void {
  assert.equal(registered.steps.length, sourceSteps.length);
  for (const step of registered.steps) {
    const source = sourceSteps.find((item) => item.stepId === step.stepId);
    assert.ok(source, step.stepId);
    assert.equal(step.stepId, source.stepId);
    assert.equal(step.title, source.title);
    assert.equal(step.body, source.body);
    assert.equal(step.stateLabel, source.stateLabel);
    assert.equal(step.target, source.target);
  }
}

describe('walkthrough step lifecycle', () => {
  it('keeps Cotizaciones steps 2 and 3 after step 1 even when their targets are missing', () => {
    const steps = stepsFor('cotizaciones');
    assert.deepEqual(
      steps.map((step) => step.stepId),
      ['quotes', 'quote-status', 'quote-pdf'],
    );
    for (const step of steps) {
      assert.equal(step.nextRoute, undefined);
      assert.equal(shouldPushNextRoute('/cotizaciones', step.nextRoute), false);
      assert.equal(keepsAuthoredStep(step), true);
    }

    const skipped = nextIndexSkippingMissing(steps, 1, () => false);
    assert.equal(skipped, null);
    assert.equal(authoredStepIndex(steps, 1), 1);
    assert.equal(steps[authoredStepIndex(steps, 1) ?? -1]?.stepId, 'quote-status');
    assert.equal(steps[2]?.stepId, 'quote-pdf');

    const { visited, record } = clickThrough('cotizaciones');
    assert.deepEqual(visited, ['quotes', 'quote-status', 'quote-pdf']);
    assert.equal(record.runState, 'COMPLETED');
    assert.equal(chapterRunState(record, 'cotizaciones'), 'COMPLETED');
    assert.equal(chapterRunState(record, 'oportunidades'), 'NOT_STARTED');
    assert.equal(chapterRunState(record, 'cliente-360'), 'NOT_STARTED');
    assert.equal(chapterRunState(record, 'trabajo'), 'NOT_STARTED');
    assert.deepEqual(record.completedChapterIds, ['cotizaciones']);
  });

  it('keeps Trabajo later steps after step 1 and does not query-navigate off /trabajo', () => {
    const steps = stepsFor('trabajo');
    assert.deepEqual(
      steps.map((step) => step.stepId),
      ['trabajo-mios', 'trabajo-equipo-empresa', 'trabajo-vencido'],
    );
    const overdue = steps.find((step) => step.stepId === 'trabajo-vencido');
    assert.ok(overdue);
    assert.equal(overdue.nextRoute, undefined);
    assert.equal(shouldPushNextRoute('/trabajo', '/trabajo?view=overdue'), false);
    assert.equal(shouldPushNextRoute('/trabajo', '/trabajo'), false);
    assert.equal(shouldPushNextRoute('/inicio', '/trabajo'), true);

    const skipped = nextIndexSkippingMissing(steps, 1, () => false);
    assert.equal(skipped, null);
    assert.equal(authoredStepIndex(steps, 1), 1);

    const { visited, record } = clickThrough('trabajo');
    assert.deepEqual(visited, ['trabajo-mios', 'trabajo-equipo-empresa', 'trabajo-vencido']);
    assert.equal(chapterRunState(record, 'trabajo'), 'COMPLETED');
    assert.equal(chapterRunState(record, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(record, 'equipo'), 'COMPLETED');
  });

  it('completes only the chapter whose last step called Siguiente', () => {
    const opportunities = clickThrough('oportunidades');
    assert.deepEqual(opportunities.visited, ['opportunities']);
    assert.equal(chapterRunState(opportunities.record, 'oportunidades'), 'COMPLETED');
    assert.equal(chapterRunState(opportunities.record, 'cotizaciones'), 'NOT_STARTED');
    assert.equal(chapterRunState(opportunities.record, 'cliente-360'), 'NOT_STARTED');
    assert.deepEqual(opportunities.record.completedChapterIds, ['oportunidades']);

    const customer = clickThrough('cliente-360');
    assert.equal(customer.visited.at(-1), 'orders');
    assert.ok(customer.visited.length > 1);
    assert.equal(chapterRunState(customer.record, 'cliente-360'), 'COMPLETED');
    assert.equal(chapterRunState(customer.record, 'clientes'), 'NOT_STARTED');
    assert.equal(chapterRunState(customer.record, 'cotizaciones'), 'NOT_STARTED');
    assert.deepEqual(customer.record.completedChapterIds, ['cliente-360']);

    const held = decideNext({
      steps: stepsFor('cotizaciones'),
      stepId: 'missing',
      scopeChapterId: 'cotizaciones',
      chapterId: 'cotizaciones',
    });
    assert.equal(held.type, 'hold');
  });

  it('replays a completed chapter as IN_PROGRESS and does not leave it closed', () => {
    const steps = stepsFor('cotizaciones');
    const finished = clickThrough('cotizaciones').record;
    assert.equal(finished.runState, 'COMPLETED');
    assert.equal(resumeSurface(finished, false), 'closed');

    const replayed = replayChapter(finished, steps, 'cotizaciones');
    assert.equal(replayed.surface, 'step');
    assert.notEqual(replayed.surface, 'closed');
    assert.equal(replayed.record.runState, 'IN_PROGRESS');
    assert.equal(replayed.record.stepId, 'quotes');
    assert.equal(replayed.record.scopeChapterId, 'cotizaciones');
    assert.equal(chapterRunState(replayed.record, 'cotizaciones'), 'IN_PROGRESS');
    assert.equal(chapterRunState(replayed.record, 'trabajo'), 'NOT_STARTED');
  });

  it('does not abort a chapter when an optional target is missing', () => {
    const steps = stepsFor('cotizaciones');
    const started = replayChapter(initialWalkthroughRecord(), steps, 'cotizaciones').record;
    const status = steps.find((step) => step.stepId === 'quote-status');
    const pdf = steps.find((step) => step.stepId === 'quote-pdf');
    assert.ok(status && pdf);
    for (const step of [status, pdf]) {
      const decision = missingTargetDecision(step);
      assert.equal(decision.show, true);
      assert.equal(decision.anchor, 'untargeted');
      assert.equal(decision.complete, false);
      assert.equal(decision.dismiss, false);
    }
    assert.equal(started.runState, 'IN_PROGRESS');
    assert.equal(started.stepId, 'quotes');
    assert.equal(chapterRunState(started, 'cotizaciones'), 'IN_PROGRESS');
    assert.equal(chapterRunState(started, 'oportunidades'), 'NOT_STARTED');
    assert.equal(chapterRunState(started, 'trabajo'), 'NOT_STARTED');
    assert.equal(cardStaysMounted({ mounted: true, surface: 'step', anchor: 'pending' }), true);
    assert.equal(cardStaysMounted({ mounted: true, surface: 'step', anchor: 'untargeted' }), true);
    assert.equal(cardStaysMounted({ mounted: true, surface: 'closed', anchor: 'pending' }), false);
  });

  it('keeps the external opener and does not push a same-page route', () => {
    const inside = { closest: (selector: string) => (selector === '[data-walkthrough-root]' ? {} : null) };
    const outside = { closest: () => null };
    assert.equal(shouldKeepExternalOpener(inside), true);
    assert.equal(shouldKeepExternalOpener(outside), false);
    assert.equal(shouldKeepExternalOpener(null), false);
    assert.equal(resumeSurface({ stepId: 'quotes' }, true), 'step');
    assert.equal(resumeSurface({ stepId: null }, true), 'closed');
  });

  it('does not rewrite Spanish bodies or Map and WhatsApp truth labels', () => {
    const trabajo = chapter('trabajo');
    const quotes = chapter('cotizaciones');
    const sourceTrabajo = workforceChapter.steps.filter((step) =>
      ['trabajo-mios', 'trabajo-equipo-empresa', 'trabajo-vencido'].includes(step.stepId),
    );
    const sourceQuotes = commercialChapter.steps.filter((step) =>
      ['quotes', 'quote-status', 'quote-pdf'].includes(step.stepId),
    );
    assertCopyUnchanged(quotes, sourceQuotes);
    assertCopyUnchanged(trabajo, sourceTrabajo);
    assertCopyUnchanged(chapter('mapa'), mapChapter.steps);
    assertCopyUnchanged(chapter('mensajes'), messagesChapter.steps);
    assert.equal(quotes.steps.find((step) => step.stepId === 'quote-status')?.stateLabel, 'validacion');
    assert.equal(chapter('mensajes').steps[0]?.stateLabel, 'proximamente');
  });

  it('keeps the card mounted in the runner and restores focus through focus.ts', () => {
    const provider = readFileSync(PROVIDER, 'utf8');
    const popover = readFileSync(POPOVER, 'utf8');
    assert.match(provider, /restoreFocus\(opener\)/);
    assert.doesNotMatch(provider, /opener\?\.focus\(/);
    assert.match(provider, /shouldOpenTourOnLoad\(loaded\)/);
    assert.doesNotMatch(provider, /shouldOpenTourOnLoad\s*=\s*\(\)\s*=>\s*false/);
    assert.match(popover, /cardStaysMounted\(/);
    assert.doesNotMatch(popover, /anchor === 'pending'\) return null/);
  });
});
