import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const page = readFileSync(join(root, 'app/(app)/auditoria/page.tsx'), 'utf8');

describe('auditoria page query fail-closed', () => {
  it('wraps listAudit in try/catch and maps OsApiError forbidden to AccessDeniedState', () => {
    assert.match(page, /try\s*\{/);
    assert.match(page, /client\.listAudit/);
    assert.match(page, /catch \(err\)/);
    assert.match(page, /err instanceof OsApiError/);
    assert.match(page, /err\.kind === 'forbidden'/);
    assert.match(page, /err\.kind === 'unauthorized'/);
    assert.match(page, /AccessDeniedState/);
  });

  it('uses QuerySurfaceState for non-auth API failures instead of throwing', () => {
    assert.match(page, /QuerySurfaceState/);
    assert.match(page, /classifyQueryError\(err\)/);
    assert.match(page, /Product-safe denial\/error/);
  });

  it('allows owner-eval read via management/commercial org scopes before fetch', () => {
    assert.match(page, /viewerHasManagementOrgRead/);
    assert.match(page, /COMMERCIAL_ORG_READ_SCOPE/);
    assert.match(page, /ownerEvalRead/);
    assert.match(page, /AccessDeniedState/);
  });
});
