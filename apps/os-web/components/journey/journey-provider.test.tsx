import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MANAGEMENT_ORG_READ_SCOPE, PEOPLE_ADMIN_SCOPE } from '@isalwa/os-contracts';
import { canUseRolePreview } from '@/lib/role-preview/access';
import { JourneyProvider, storyCloseReplacementUrl, storyRequestedFromSearch } from './journey-provider';
import { VerEjemploCompletoButton } from './ver-ejemplo-completo-button';

// The test runner compiles JSX with the classic runtime (tsconfig jsx: preserve).
(globalThis as { React?: typeof React }).React = React;

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function journeyTab(scopes: readonly string[]): string {
  return renderToStaticMarkup(
    <JourneyProvider canOpenJourney={canUseRolePreview(scopes)}>
      <VerEjemploCompletoButton />
    </JourneyProvider>,
  );
}

describe('Journey tab audience', () => {
  it('renders for the showRolePreview audience', () => {
    assert.match(journeyTab([MANAGEMENT_ORG_READ_SCOPE]), /Ver recorrido completo/);
    assert.match(journeyTab([PEOPLE_ADMIN_SCOPE]), /Recorrido/);
  });

  it('does not render for anyone else', () => {
    assert.equal(journeyTab([]), '');
    assert.equal(journeyTab(['commercial.quote.create', 'party.read']), '');
  });

  it('the shell gates it with the same showRolePreview predicate, without demo state', () => {
    const shell = read('components/shell/app-shell.tsx');
    assert.match(shell, /const showRolePreview = canUseRolePreview\(grantedScopes\);/);
    assert.match(shell, /<JourneyProvider canOpenJourney=\{showRolePreview\}>/);
    assert.match(shell, /\{showRolePreview \? <VerEjemploCompletoButton \/> : null\}/);
    assert.doesNotMatch(shell, /OwnerDemo|DemoDataFilterToggle|DemoFictitiousBanner|dataMode|withStoryDemoDatos/);
  });
});

describe('Journey is presentation only', () => {
  it('?story=1 opens the panel only for the allowed audience; datos is ignored', () => {
    assert.equal(storyRequestedFromSearch('?story=1', true), true);
    assert.equal(storyRequestedFromSearch('?datos=demo&story=1', true), true);
    assert.equal(storyRequestedFromSearch('?datos=demo&story=1', false), false);
    assert.equal(storyRequestedFromSearch('?datos=demo', true), false);
  });

  it('the provider holds no data mode, cookie, storage or organization state', () => {
    const provider = read('components/journey/journey-provider.tsx');
    assert.doesNotMatch(provider, /dataMode|datos|document\.cookie|localStorage|organizationId|empresa|company/i);
    for (const file of ['components/journey/owner-story-mode.tsx', 'components/journey/ver-ejemplo-completo-button.tsx']) {
      assert.doesNotMatch(read(file), /dataMode|datos=|setDataMode|cookie|localStorage|organizationId|DEMO_FICTITIOUS|SYNTH/, file);
    }
  });
});

describe('story CTA close', () => {
  it('does not rewrite the current URL when the CTA navigates', () => {
    assert.equal(
      storyCloseReplacementUrl('/inicio?story=1', { navigateTo: '/inicio?lente=gerencia' }),
      null,
    );
  });

  it('drops story= and keeps everything else when the overlay closes without a destination', () => {
    assert.equal(storyCloseReplacementUrl('http://localhost/inicio?lente=gerencia&story=1'), '/inicio?lente=gerencia');
  });
});
