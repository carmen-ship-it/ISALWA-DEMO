import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerDateHasSeparateProductionTarget } from '../../os-contracts/src/customer-committed-date';
import '../../os-contracts/src/customer-committed-date.test.ts';

describe('customer date package', () => {
  it('does not keep a second copy of the date rules', () => {
    assert.equal(customerDateHasSeparateProductionTarget(), true);
  });
});
