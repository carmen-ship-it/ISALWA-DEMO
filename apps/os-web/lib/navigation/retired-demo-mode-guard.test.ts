import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'components', 'lib', 'middleware.ts'];
const SOURCE = /\.(ts|tsx)$/;
const TEST_FILE = /\.test\.(ts|tsx)$|\/__fixtures__\//;

function sourceFiles(entry: string): string[] {
  const path = join(ROOT, entry);
  if (statSync(path).isFile()) return SOURCE.test(path) ? [entry] : [];
  return readdirSync(path).flatMap((name) => {
    if (name === 'node_modules' || name === '.next') return [];
    return sourceFiles(relative(ROOT, join(path, name)));
  });
}

const productionFiles = SCAN_DIRS.flatMap(sourceFiles).filter((file) => !TEST_FILE.test(file));

function offenders(pattern: RegExp): string[] {
  return productionFiles.filter((file) => pattern.test(readFileSync(join(ROOT, file), 'utf8')));
}

describe('retired demo data mode stays retired', () => {
  it('no production file reads a data mode from the URL, a cookie or a request header', () => {
    assert.deepEqual(
      offenders(/resolveDemoDataMode|filterByDemoDataMode|filterByPartyDemoMode|DATA_MODE_REQUEST_HEADER|x-isalwa-data-mode|DEMO_DATA_MODE_COOKIE|clientDataMode\(/),
      [],
    );
  });

  it('no URL datos value is read or forwarded outside the integrator-owned call sites still listed', () => {
    assert.deepEqual(offenders(/params\??\.datos|\.get\('datos'\)|name="datos"|'datos'|datos=(demo|real)/).sort(), [
      'components/cliente/cliente-360-nav.tsx',
      'lib/commercial/actions.ts',
    ]);
  });

  it('no production file merges conversation or seed fixtures', () => {
    assert.deepEqual(offenders(/__fixtures__|ownerDemoConversationFixtures|seeded-ids\.json|conversations\.json/), []);
  });

  it('no production file prefills demo prices', () => {
    assert.deepEqual(offenders(/demoPrices|DEMO_STARTER_PRICES|demo-starter-prices/), []);
  });

  it('no production file mounts or stores the learning mode switch', () => {
    assert.deepEqual(offenders(/LearningModeToggle|learningModeEnabled|LEARNING_MODE_COPY|setLearningMode/), []);
  });

  it('the Journey provider never touches data mode, organization or storage', () => {
    const provider = readFileSync(join(ROOT, 'components/journey/journey-provider.tsx'), 'utf8');
    assert.doesNotMatch(provider, /dataMode|datos|document\.cookie|localStorage|sessionStorage|organizationId|orgId|selectOrganization|switchOrganization/);
  });
});
