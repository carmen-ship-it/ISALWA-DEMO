import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  EVALUATION_ENVIRONMENT_NOTICE,
  shouldShowEvaluationEnvironmentNotice,
} from '@/components/shell/evaluation-environment-notice';

describe('evaluation environment notice', () => {
  it('uses the approved Spanish copy', () => {
    assert.equal(
      EVALUATION_ENVIRONMENT_NOTICE,
      'Entorno de evaluación · Los datos utilizados para esta revisión no son operación comercial real.',
    );
  });

  it('is wired into the app shell above role preview', () => {
    const shell = readFileSync(resolve('components/shell/app-shell.tsx'), 'utf8');
    assert.match(shell, /EvaluationEnvironmentNotice/);
    assert.match(shell, /evaluation-environment-notice/);
  });

  it('shows only when evaluation notice env or evaluation profile is set', () => {
    const prevNotice = process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE;
    const prevProfile = process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
    try {
      delete process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE;
      delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
      assert.equal(shouldShowEvaluationEnvironmentNotice(), false);
      process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE = '1';
      assert.equal(shouldShowEvaluationEnvironmentNotice(), true);
      process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE = '0';
      process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE = 'evaluation';
      assert.equal(shouldShowEvaluationEnvironmentNotice(), false);
      delete process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE;
      assert.equal(shouldShowEvaluationEnvironmentNotice(), true);
    } finally {
      if (prevNotice === undefined) delete process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE;
      else process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE = prevNotice;
      if (prevProfile === undefined) delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
      else process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE = prevProfile;
    }
  });
});
