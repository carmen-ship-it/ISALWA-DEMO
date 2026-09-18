import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { opportunityNextStep } from './next-step';
import { selectLinkedQuote, type LinkedQuoteCandidate } from './linked-quote';

function quote(
  overrides: Partial<LinkedQuoteCandidate> & Pick<LinkedQuoteCandidate, 'quoteId' | 'quoteNumber'>,
): LinkedQuoteCandidate {
  return {
    partyId: 'party-1',
    opportunityId: 'opp-1',
    status: 'draft',
    ...overrides,
  };
}

describe('selectLinkedQuote', () => {
  it('selects nothing when no quote is linked so the caller keeps Crear cotización', () => {
    assert.equal(selectLinkedQuote([], 'opp-1'), null);
    assert.equal(selectLinkedQuote(null, 'opp-1'), null);
    assert.equal(selectLinkedQuote(undefined, 'opp-1'), null);

    const step = opportunityNextStep({
      status: 'open',
      partyId: 'party-1',
      opportunityId: 'opp-1',
      newQuoteHref: '/clientes/party-1/oportunidades/opp-1/cotizaciones/nueva',
      linkedQuoteHref: null,
    });
    assert.equal(step?.hrefLabel, 'Crear cotización');
    assert.match(step?.statement ?? '', /Prepare una cotización/i);
  });

  it('selects a linked draft', () => {
    const picked = selectLinkedQuote(
      [quote({ quoteId: 'quote-draft', quoteNumber: 'Q-10', status: 'draft' })],
      'opp-1',
    );
    assert.equal(picked?.quoteId, 'quote-draft');
    assert.equal(picked?.quoteNumber, 'Q-10');
    assert.equal(picked?.opportunityId, 'opp-1');
  });

  it('prefers a linked submitted or accepted quote over a draft', () => {
    const submitted = selectLinkedQuote(
      [
        quote({ quoteId: 'quote-draft', quoteNumber: 'Q-D', status: 'draft' }),
        quote({ quoteId: 'quote-submitted', quoteNumber: 'Q-S', status: 'submitted' }),
      ],
      'opp-1',
    );
    assert.equal(submitted?.quoteId, 'quote-submitted');
    assert.equal(submitted?.quoteNumber, 'Q-S');

    const accepted = selectLinkedQuote(
      [
        quote({ quoteId: 'quote-draft', quoteNumber: 'Q-D', status: 'draft' }),
        quote({ quoteId: 'quote-accepted', quoteNumber: 'Q-A', status: 'accepted' }),
      ],
      'opp-1',
    );
    assert.equal(accepted?.quoteId, 'quote-accepted');
    assert.equal(accepted?.quoteNumber, 'Q-A');
  });

  it('does not select a quote linked to another opportunity', () => {
    const picked = selectLinkedQuote(
      [
        quote({
          quoteId: 'quote-other',
          quoteNumber: 'Q-OTHER',
          opportunityId: 'opp-other',
          status: 'accepted',
        }),
        quote({ quoteId: 'quote-here', quoteNumber: 'Q-HERE', status: 'draft' }),
      ],
      'opp-1',
    );
    assert.equal(picked?.quoteId, 'quote-here');
    assert.notEqual(picked?.quoteId, 'quote-other');

    assert.equal(
      selectLinkedQuote(
        [
          quote({
            quoteId: 'quote-other-only',
            quoteNumber: 'Q-OTHER',
            opportunityId: 'opp-other',
            status: 'submitted',
          }),
        ],
        'opp-1',
      ),
      null,
    );
  });

  it('does not select a quote with a blank opportunityId', () => {
    const picked = selectLinkedQuote(
      [
        quote({
          quoteId: 'quote-blank',
          quoteNumber: 'Q-BLANK',
          opportunityId: null,
          status: 'submitted',
        }),
        quote({
          quoteId: 'quote-empty',
          quoteNumber: 'Q-EMPTY',
          opportunityId: '',
          status: 'accepted',
        }),
        quote({ quoteId: 'quote-draft', quoteNumber: 'Q-D', status: 'draft' }),
      ],
      'opp-1',
    );
    assert.equal(picked?.quoteId, 'quote-draft');
    assert.notEqual(picked?.opportunityId, null);
    assert.notEqual(picked?.opportunityId, '');

    assert.equal(
      selectLinkedQuote(
        [
          quote({
            quoteId: 'quote-blank',
            quoteNumber: 'Q-BLANK',
            opportunityId: null,
            status: 'accepted',
          }),
          quote({
            quoteId: 'quote-empty',
            quoteNumber: 'Q-EMPTY',
            opportunityId: '',
            status: 'submitted',
          }),
        ],
        'opp-1',
      ),
      null,
    );
  });
});
