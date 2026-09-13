/**
 * Fresh-process smoke: dev routes disabled for staging profile.
 * Invoked from env-validation.test.ts subprocess.
 */
import assert from 'node:assert/strict';
import { validateOsApiEnvironment, isDevBootstrapEnabled } from './env-validation';

validateOsApiEnvironment();
assert.equal(isDevBootstrapEnabled(), false);
