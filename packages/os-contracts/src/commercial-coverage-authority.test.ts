import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canConvertQuoteToOrder,
  canGrantCustomerCoverage,
  canRevokeCustomerCoverage,
  canReassignCommercialAccountOwner,
  coverageAuditForConvert,
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

  it('coverageAuditForConvert may allow workflow but never converts alone', () => {
    const OWNER = 'mem-owner';
    const HELPER = 'mem-helper';
    const asOf = new Date('2026-09-17T12:00:00.000Z');
    const audit = coverageAuditForConvert({
      actorMemberId: HELPER,
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: OWNER,
      grants: [
        {
          grantType: 'commercial.customer.coverage',
          organizationId: 'org-a',
          customerPartyId: 'party-1',
          primaryOwnerMemberId: OWNER,
          actingAdvisorMemberId: HELPER,
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: null,
          revokedAt: null,
        },
      ],
      asOf,
    });
    assert.equal(audit.allowed, true);
    assert.equal(audit.primaryOwnerMemberId, OWNER);
    assert.equal(audit.sharedOwnership, false);
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: HELPER,
        grantedScopes: [],
        quoteOwnerMemberId: OWNER,
        coverage: audit,
      }),
      false,
    );
  });
});
