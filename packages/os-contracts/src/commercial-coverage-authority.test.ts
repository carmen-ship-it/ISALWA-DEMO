import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canGrantCustomerCoverage,
  canRevokeCustomerCoverage,
  canReassignCommercialAccountOwner,
} from '@isalwa/os-contracts';
import {
  COMMERCIAL_COMMAND_NAMES,
  GrantCustomerCoveragePayloadSchema,
  RevokeCustomerCoveragePayloadSchema,
} from '@isalwa/os-contracts';

describe('temporary coverage V1 authority', () => {
  it('registers Grant/RevokeCustomerCoverage commands', () => {
    assert.ok(COMMERCIAL_COMMAND_NAMES.includes('GrantCustomerCoverage'));
    assert.ok(COMMERCIAL_COMMAND_NAMES.includes('RevokeCustomerCoverage'));
  });

  it('validates grant/revoke payloads', () => {
    assert.equal(
      GrantCustomerCoveragePayloadSchema.safeParse({
        commercialAccountId: 'acc_1',
        actingAdvisorMemberId: 'mem_2',
        note: 'Vacaciones',
      }).success,
      true,
    );
    assert.equal(
      RevokeCustomerCoveragePayloadSchema.safeParse({ grantId: 'gr_1' }).success,
      true,
    );
  });

  it('allows only reassignment-scoped actors (Jefe/Gerencia), not ordinary Asesor', () => {
    assert.equal(canGrantCustomerCoverage(['commercial.account.reassign']), true);
    assert.equal(canRevokeCustomerCoverage(['commercial.account.reassign']), true);
    assert.equal(canGrantCustomerCoverage(['member_active', 'commercial.own.write']), false);
    assert.equal(canRevokeCustomerCoverage(['member_active']), false);
    assert.equal(
      canGrantCustomerCoverage(['commercial.account.reassign']),
      canReassignCommercialAccountOwner(['commercial.account.reassign']),
    );
  });
});
