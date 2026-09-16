import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_PATHS } from './constants';

const webRoot = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

describe('password reset routes and actions', () => {
  it('publishes forgot and reset paths', () => {
    assert.ok(PUBLIC_PATHS.includes('/auth/forgot-password'));
    assert.ok(PUBLIC_PATHS.includes('/auth/reset-password'));
  });

  it('ships pages, forms, and password update action', () => {
    const actions = read('lib/auth/actions.ts');
    assert.match(actions, /export async function requestPasswordResetAction/);
    assert.match(actions, /export async function updatePasswordFromResetAction/);
    assert.match(actions, /resetPasswordForEmail/);
    assert.match(actions, /updateUser\(\{\s*password/);

    assert.match(read('app/auth/forgot-password/page.tsx'), /ForgotPasswordForm/);
    assert.match(read('app/auth/reset-password/page.tsx'), /ResetPasswordForm/);
    assert.match(read('components/auth/forgot-password-form.tsx'), /resetPasswordForEmail/);
    assert.match(read('components/auth/reset-password-form.tsx'), /updatePasswordFromResetAction/);
    assert.match(read('components/auth/login-form.tsx'), /\/auth\/forgot-password/);
  });
});
