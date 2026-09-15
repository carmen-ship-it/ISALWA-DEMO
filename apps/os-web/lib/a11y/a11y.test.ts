import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BREAKPOINTS,
  VIEWPORT_MAX_PX,
  VIEWPORT_MIN_PX,
  isWithinOperatingWidth,
} from './breakpoints';
import { FOCUS_RING_CLASS, withFocusRing } from './focus';
import { motionMs, prefersReducedMotion } from './motion';
import {
  STATUS_PILL_TONES,
  STATUS_SEMANTICS,
  STATUS_VOCABULARY,
  isStatusPillTone,
  isStatusSemantic,
  statusLabelForSemantic,
  statusToneForSemantic,
} from './status-vocabulary';
import { es, t } from '../i18n/es';

const here = dirname(fileURLToPath(import.meta.url));
const globalsCss = readFileSync(resolve(here, '../../app/globals.css'), 'utf8');
const appAlertSource = readFileSync(resolve(here, '../../components/states/app-alert.tsx'), 'utf8');
const surfaceStateSource = readFileSync(
  resolve(here, '../../components/states/surface-state.tsx'),
  'utf8',
);
const appStatesSource = readFileSync(resolve(here, '../../components/states/app-states.tsx'), 'utf8');

const ENGINEERING_JARGON =
  /\b(Party|AuthIdentity|OrganizationMember|outbox|tenant|schema|payload|endpoint|null|undefined|stack|trace|capability registry|work item id)\b/i;

describe('status vocabulary', () => {
  it('maps alert semantics onto existing StatusPill tones only', () => {
    for (const semantic of STATUS_SEMANTICS) {
      const entry = STATUS_VOCABULARY[semantic];
      assert.equal(entry.semantic, semantic);
      assert.ok(isStatusPillTone(entry.tone));
      assert.ok((STATUS_PILL_TONES as readonly string[]).includes(entry.tone));
      assert.equal(statusToneForSemantic(semantic), entry.tone);
      assert.equal(statusLabelForSemantic(semantic), entry.label);
      assert.doesNotMatch(entry.label, ENGINEERING_JARGON);
    }

    assert.equal(statusToneForSemantic('warn'), 'warning');
    assert.equal(statusToneForSemantic('blocked'), 'danger');
    assert.equal(statusToneForSemantic('manual'), 'manual');
    assert.equal(statusToneForSemantic('pending'), 'warning');
    assert.equal(isStatusSemantic('warn'), true);
    assert.equal(isStatusSemantic('error'), false);
  });

  it('keeps Spanish pill labels free of engineering jargon', () => {
    assert.equal(statusLabelForSemantic('manual'), 'Dato manual');
    assert.equal(statusLabelForSemantic('blocked'), 'Bloqueado');
    assert.equal(statusLabelForSemantic('pending'), 'Pendiente');
    assert.equal(statusLabelForSemantic('warn'), 'Atención');
  });
});

describe('empty/error/loading/toast copy', () => {
  it('exposes user-facing Spanish copy without jargon', () => {
    const keys = [
      'states.loading',
      'states.loadingHint',
      'states.empty',
      'states.emptyHint',
      'states.errorLoad',
      'states.errorLoadHint',
      'states.zeroResult',
      'states.zeroResultHint',
      'states.actionFailed',
      'states.actionSaved',
      'states.toastDismiss',
      'states.toastRegion',
      'states.alertInfo',
      'states.alertWarn',
      'states.alertBlocked',
      'states.alertManual',
      'states.alertPending',
    ] as const;

    for (const key of keys) {
      const value = t(key);
      assert.notEqual(value, key);
      assert.doesNotMatch(value, ENGINEERING_JARGON);
      assert.doesNotMatch(value, /[A-Z]{3,}_[A-Z0-9_]+/);
    }

    assert.match(es.states.loading, /Cargando/);
    assert.match(es.states.errorLoad, /No se pudo cargar/);
    assert.equal(es.states.toastDismiss, 'Cerrar');
  });
});

describe('a11y helpers', () => {
  it('documents the shared focus ring and operating width band', () => {
    assert.match(FOCUS_RING_CLASS, /focus-visible/);
    assert.match(withFocusRing('btn'), /isalwa-focus-ring/);
    assert.match(globalsCss, /\.isalwa-focus-ring:focus-visible/);
    assert.match(globalsCss, /prefers-reduced-motion:\s*reduce/);
    assert.match(globalsCss, /1440px/);
    assert.match(globalsCss, /389px/);
    assert.equal(VIEWPORT_MIN_PX, 390);
    assert.equal(VIEWPORT_MAX_PX, 1440);
    assert.equal(BREAKPOINTS.phone, 390);
    assert.equal(isWithinOperatingWidth(390), true);
    assert.equal(isWithinOperatingWidth(1440), true);
    assert.equal(isWithinOperatingWidth(389), false);
    assert.equal(isWithinOperatingWidth(1441), false);
  });

  it('collapses JS motion when reduced motion is preferred', () => {
    assert.equal(prefersReducedMotion(), false);
    assert.equal(motionMs(180), 180);
    assert.equal(motionMs(-1), 0);
  });
});

describe('shared state components', () => {
  it('wires alert variants and surface states to vocabulary helpers', () => {
    assert.match(appAlertSource, /info.*warn.*blocked.*manual.*pending/s);
    assert.match(appAlertSource, /statusToneForSemantic/);
    assert.match(appAlertSource, /data-alert-variant/);
    assert.match(surfaceStateSource, /loading.*empty.*error.*zero-result/s);
    assert.match(surfaceStateSource, /aria-busy="true"/);
    assert.match(appStatesSource, /statusToneForSemantic/);
    assert.match(appStatesSource, /data-surface-state="loading-shell"/);
    assert.doesNotMatch(
      appAlertSource,
      /\b(Party|AuthIdentity|OrganizationMember|outbox|tenantId|capability registry)\b/,
    );
  });
});
