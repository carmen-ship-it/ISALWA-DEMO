import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chapterRunState } from './plan';
import {
  WALKTHROUGH_STORAGE_KEY,
  loadWalkthrough,
  parseWalkthroughRecord,
  resumeTarget,
  saveWalkthrough,
  shouldOpenTourOnLoad,
} from './persistence';
import { initialWalkthroughRecord, reduceWalkthrough } from './state';
import type { WalkthroughRecord } from './types';

/**
 * Refresh resume contract.
 * Step 2 is the second step of the page chapter after content grouping:
 * clientes → customer-filters, cliente-360 → customer-360,
 * cotizaciones → quote-status, trabajo → trabajo-equipo-empresa.
 */

const STORAGE_KEY = 'isalwa.os-web.walkthrough.v1';

const STEP_TWO = [
  { chapterId: 'clientes', stepId: 'customer-filters' },
  { chapterId: 'cliente-360', stepId: 'customer-360' },
  { chapterId: 'cotizaciones', stepId: 'quote-status' },
  { chapterId: 'trabajo', stepId: 'trabajo-equipo-empresa' },
] as const;

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

function atStep(chapterId: string, stepId: string): WalkthroughRecord {
  return reduceWalkthrough(initialWalkthroughRecord(), {
    type: 'START',
    chapterId,
    scopeChapterId: chapterId,
    stepId,
  });
}

describe('walkthrough resume', () => {
  it('stores the current step while a chapter is in progress', () => {
    assert.equal(WALKTHROUGH_STORAGE_KEY, STORAGE_KEY);
    const paused = reduceWalkthrough(atStep('clientes', 'customer-filters'), { type: 'PAUSE' });
    const closed = reduceWalkthrough(paused, { type: 'CLOSE' });
    const store = memoryStore();
    saveWalkthrough(store, closed);
    const saved = JSON.parse(store.data[STORAGE_KEY] ?? 'null') as WalkthroughRecord;

    assert.equal(saved.version, 2);
    assert.equal(saved.runState, 'IN_PROGRESS');
    assert.equal(saved.chapterId, 'clientes');
    assert.equal(saved.scopeChapterId, 'clientes');
    assert.equal(saved.stepId, 'customer-filters');
    assert.equal(saved.chapterStates.clientes, 'IN_PROGRESS');
  });

  it('restores the current step after refresh', () => {
    const store = memoryStore();
    saveWalkthrough(store, atStep('cotizaciones', 'quote-status'));
    const loaded = loadWalkthrough(store);

    assert.equal(loaded.version, 2);
    assert.equal(loaded.runState, 'IN_PROGRESS');
    assert.equal(loaded.chapterId, 'cotizaciones');
    assert.equal(loaded.scopeChapterId, 'cotizaciones');
    assert.equal(loaded.stepId, 'quote-status');
    assert.equal(shouldOpenTourOnLoad(loaded), true);
    assert.deepEqual(resumeTarget(loaded), { chapterId: 'cotizaciones', stepId: 'quote-status' });
  });

  it('opens on load only for a real in-progress step', () => {
    const initial = initialWalkthroughRecord();
    assert.equal(shouldOpenTourOnLoad(initial), false);
    assert.equal(resumeTarget(initial), null);
    assert.equal(shouldOpenTourOnLoad({ ...initial, runState: 'COMPLETED' }), false);
    assert.equal(shouldOpenTourOnLoad({ ...initial, runState: 'DISMISSED' }), false);
    assert.equal(shouldOpenTourOnLoad({ ...initial, runState: 'IN_PROGRESS' }), false);

    const inProgress = atStep('trabajo', 'trabajo-equipo-empresa');
    assert.equal(shouldOpenTourOnLoad(inProgress), true);
    assert.deepEqual(resumeTarget(inProgress), {
      chapterId: 'trabajo',
      stepId: 'trabajo-equipo-empresa',
    });
  });

  it('does not throw when the stored step is missing and leaves other chapters alone', () => {
    const record: WalkthroughRecord = {
      ...initialWalkthroughRecord(),
      runState: 'IN_PROGRESS',
      chapterId: 'cotizaciones',
      scopeChapterId: 'cotizaciones',
      stepId: null,
      completedChapterIds: ['clientes'],
      chapterStates: {
        clientes: 'COMPLETED',
        cotizaciones: 'IN_PROGRESS',
        trabajo: 'NOT_STARTED',
      },
    };

    assert.doesNotThrow(() => resumeTarget(record));
    assert.equal(resumeTarget(record), null);
    assert.equal(shouldOpenTourOnLoad(record), false);
    assert.equal(resumeTarget({ ...record, stepId: '   ' }), null);

    const loaded = parseWalkthroughRecord(JSON.stringify(record));
    assert.equal(resumeTarget(loaded), null);
    assert.equal(loaded.chapterStates.clientes, 'COMPLETED');
    assert.equal(loaded.chapterStates.cotizaciones, 'IN_PROGRESS');
    assert.equal(loaded.chapterStates.trabajo, 'NOT_STARTED');
    assert.equal(chapterRunState(loaded, 'clientes'), 'COMPLETED');
    assert.equal(chapterRunState(loaded, 'cotizaciones'), 'IN_PROGRESS');
    assert.notEqual(chapterRunState(loaded, 'trabajo'), 'DISMISSED');
    assert.notEqual(chapterRunState(loaded, 'trabajo'), 'COMPLETED');
  });

  it('does not auto-open a completed chapter and does not clear it on load', () => {
    const completed = reduceWalkthrough(atStep('clientes', 'customer-filters'), {
      type: 'COMPLETE',
      chapterId: 'clientes',
    });
    assert.equal(completed.runState, 'COMPLETED');
    assert.equal(completed.chapterStates.clientes, 'COMPLETED');
    assert.equal(shouldOpenTourOnLoad(completed), false);
    assert.equal(resumeTarget(completed), null);

    const store = memoryStore();
    saveWalkthrough(store, completed);
    const loaded = loadWalkthrough(store);
    assert.equal(loaded.runState, 'COMPLETED');
    assert.equal(loaded.chapterStates.clientes, 'COMPLETED');
    assert.deepEqual(loaded.completedChapterIds, ['clientes']);
    assert.equal(shouldOpenTourOnLoad(loaded), false);
    assert.equal(resumeTarget(loaded), null);
  });

  it('keeps a dismissed chapter independent of the others', () => {
    const inProgress = atStep('cotizaciones', 'quote-status');
    const dismissedGlobal = reduceWalkthrough(inProgress, { type: 'DISMISS', chapterId: 'global' });

    assert.equal(dismissedGlobal.chapterStates.global, 'DISMISSED');
    assert.equal(dismissedGlobal.chapterStates.cotizaciones, 'IN_PROGRESS');
    assert.notEqual(dismissedGlobal.chapterStates.cotizaciones, 'COMPLETED');
    assert.notEqual(dismissedGlobal.chapterStates.cotizaciones, 'DISMISSED');
    assert.equal(dismissedGlobal.learningMode, true);
    assert.equal(dismissedGlobal.chapterId, 'cotizaciones');
    assert.equal(dismissedGlobal.scopeChapterId, 'cotizaciones');
    assert.equal(dismissedGlobal.stepId, 'quote-status');
    assert.equal(shouldOpenTourOnLoad(dismissedGlobal), true);

    const dismissedQuotes = reduceWalkthrough(inProgress, { type: 'DISMISS', chapterId: 'cotizaciones' });
    assert.equal(dismissedQuotes.chapterStates.cotizaciones, 'DISMISSED');
    assert.equal(dismissedQuotes.chapterStates.global, undefined);
    assert.notEqual(dismissedQuotes.chapterStates.clientes, 'DISMISSED');
    assert.notEqual(dismissedQuotes.chapterStates.clientes, 'COMPLETED');
    assert.equal(dismissedQuotes.learningMode, true);
    assert.equal(dismissedQuotes.completedChapterIds.includes('cotizaciones'), false);
    assert.equal(shouldOpenTourOnLoad(dismissedQuotes), false);
    assert.equal(resumeTarget(dismissedQuotes), null);
  });

  it('can save each page chapter in progress without completing the others', () => {
    for (const page of STEP_TWO) {
      const saved = atStep(page.chapterId, page.stepId);
      const store = memoryStore();
      saveWalkthrough(store, saved);
      const loaded = loadWalkthrough(store);

      assert.equal(loaded.version, 2);
      assert.equal(loaded.chapterId, page.chapterId);
      assert.equal(loaded.scopeChapterId, page.chapterId);
      assert.equal(loaded.stepId, page.stepId);
      assert.equal(shouldOpenTourOnLoad(loaded), true);
      assert.deepEqual(resumeTarget(loaded), { chapterId: page.chapterId, stepId: page.stepId });

      for (const other of STEP_TWO) {
        if (other.chapterId === page.chapterId) continue;
        assert.notEqual(loaded.chapterStates[other.chapterId], 'COMPLETED', other.chapterId);
        assert.notEqual(loaded.chapterStates[other.chapterId], 'DISMISSED', other.chapterId);
        assert.equal(chapterRunState(loaded, other.chapterId), 'NOT_STARTED');
      }
    }
  });

  it('does not mark every chapter dismissed when migrating a v1 dismiss', () => {
    const migrated = parseWalkthroughRecord(
      JSON.stringify({
        version: 1,
        runState: 'DISMISSED',
        chapterId: 'global',
        scopeChapterId: null,
        stepId: null,
        learningMode: false,
        dismissedPageKeys: [],
        offeredPageKeys: [],
        completedChapterIds: ['global'],
        welcomeClosed: true,
      }),
    );

    assert.equal(migrated.version, 2);
    assert.equal(migrated.chapterStates.global, 'DISMISSED');
    assert.notEqual(migrated.chapterStates.clientes, 'DISMISSED');
    assert.notEqual(migrated.chapterStates.cotizaciones, 'DISMISSED');
    assert.notEqual(migrated.chapterStates.trabajo, 'DISMISSED');
    assert.equal(shouldOpenTourOnLoad(migrated), false);
    assert.equal(resumeTarget(migrated), null);
  });
});
