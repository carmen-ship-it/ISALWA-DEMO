import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { storyCloseReplacementUrl } from './owner-demo-provider';

describe('story CTA close', () => {
  it('does not rewrite the current URL when the CTA navigates', () => {
    assert.equal(
      storyCloseReplacementUrl('/inicio?datos=demo&story=1', {
        navigateTo: '/inicio?lente=gerencia&datos=demo',
      }),
      null,
    );
  });

  it('still drops story= when the overlay closes without a destination', () => {
    assert.equal(
      storyCloseReplacementUrl('http://localhost/inicio?datos=demo&story=1'),
      '/inicio?datos=demo',
    );
  });
});
