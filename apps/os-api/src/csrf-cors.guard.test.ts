import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * V2 §18.1 guard. The API authenticates with a bearer token (no ambient cookie),
 * CORS is an exact env allowlist, os-web mutations are Next Server Actions (Origin
 * must match Host) and route handlers only serve GET downloads. A change that
 * widens any of these must fail here and be reviewed.
 */
const root = new URL('../../../', import.meta.url).pathname;

function files(dir: string, name: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...files(full, name));
    else if (entry === name) out.push(full);
  }
  return out;
}

describe('CSRF / CORS guard (V2 §18.1)', () => {
  it('os-api CORS origin is the validated env allowlist, never a wildcard or reflection', () => {
    const main = readFileSync(join(root, 'apps/os-api/src/main.ts'), 'utf8');
    assert.match(main, /enableCors\(\{\s*origin:\s*env\.corsOrigins,/);
    assert.equal(/origin:\s*(true|'\*'|"\*")/.test(main), false);
    const env = readFileSync(join(root, 'apps/os-api/src/env-validation.ts'), 'utf8');
    assert.match(env, /no wildcard/);
  });

  it('os-web does not widen Server Action origins', () => {
    const config = readFileSync(join(root, 'apps/os-web/next.config.ts'), 'utf8');
    assert.equal(config.includes('allowedOrigins'), false);
  });

  it('os-web route handlers export GET only', () => {
    const handlers = files(join(root, 'apps/os-web/app'), 'route.ts');
    assert.ok(handlers.length > 0);
    for (const file of handlers) {
      const source = readFileSync(file, 'utf8');
      assert.equal(
        /export\s+(async\s+)?(function|const)\s+(POST|PUT|PATCH|DELETE)\b/.test(source),
        false,
        file,
      );
    }
  });
});
