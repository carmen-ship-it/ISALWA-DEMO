import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canConvertQuoteToOrder,
  canGrantCustomerCoverage,
  canRevokeCustomerCoverage,
  canReassignCommercialAccountOwner,
  canConvertCoveredQuote,
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

  // T03 2026-10-16 19:30 supersedes BR-CNV-02: coverage converts only when it explicitly
  // covers quote.convert AND the advisor holds a conversion permission.
  it('coverage converts only with explicit quote.convert and the advisor\'s own permission', () => {
    const OWNER = 'mem-owner';
    const HELPER = 'mem-helper';
    const asOf = new Date('2026-09-17T12:00:00.000Z');
    const grant = (coveredActions: Array<'commercial.work' | 'quote.convert'>) => ({
      grantType: 'commercial.customer.coverage' as const,
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: OWNER,
      actingAdvisorMemberId: HELPER,
      coveredActions,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: null,
      revokedAt: null,
    });
    const base = { actorMemberId: HELPER, organizationId: 'org-a', customerPartyId: 'party-1', asOf };
    const workOnly = coverageAuditForConvert({ ...base, primaryOwnerMemberId: OWNER, grants: [grant(['commercial.work'])] });
    assert.equal(workOnly.allowed, false);
    const convertAudit = coverageAuditForConvert({ ...base, primaryOwnerMemberId: OWNER, grants: [grant(['quote.convert'])] });
    assert.equal(convertAudit.allowed, true);
    assert.equal(convertAudit.primaryOwnerMemberId, OWNER);
    assert.equal(convertAudit.sharedOwnership, false);
    // Coverage alone never grants the conversion permission.
    assert.equal(canConvertQuoteToOrder({ actorMemberId: HELPER, grantedScopes: [], quoteOwnerMemberId: OWNER }), false);
    const covered = (grantedScopes: string[], actions: Array<'commercial.work' | 'quote.convert'>) =>
      canConvertCoveredQuote({
        ...base,
        grantedScopes,
        accountOwnerMemberId: OWNER,
        quoteOwnerMemberId: OWNER,
        coverageGrants: [grant(actions)],
      });
    assert.equal(covered([], ['quote.convert']), false);
    assert.equal(covered(['commercial.quote.convert.own'], ['commercial.work']), false);
    assert.equal(covered(['commercial.quote.convert.own'], ['quote.convert']), true);
    assert.equal(covered(['commercial.order.convert'], ['quote.convert']), true);
  });
});
