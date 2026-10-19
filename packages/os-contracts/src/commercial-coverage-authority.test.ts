import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canConvertQuoteToOrder,
  canGrantCustomerCoverage,
  canRevokeCustomerCoverage,
  canReassignCommercialAccountOwner,
  canConvertCoveredQuote,
  coverageAuditForConvert,
  COVERAGE_MAX_DURATION_DAYS,
  coverageWindowProblem,
  coverageWindowsOverlap,
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
        endsAt: '2026-10-25T00:00:00.000Z',
        note: 'Vacaciones',
      }).success,
      true,
    );
    // Open-ended coverage is refused at the boundary (review 3129709 P6).
    assert.equal(
      GrantCustomerCoveragePayloadSchema.safeParse({ commercialAccountId: 'acc_1', actingAdvisorMemberId: 'mem_2' }).success,
      false,
    );
    assert.equal(
      GrantCustomerCoveragePayloadSchema.safeParse({ commercialAccountId: 'acc_1', actingAdvisorMemberId: 'mem_2', endsAt: null })
        .success,
      false,
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

describe('coverage window (engineering default: 30 days)', () => {
  const now = new Date('2026-10-18T12:00:00.000Z');
  const at = (days: number) => new Date(now.getTime() + days * 86_400_000);
  it('accepts up to COVERAGE_MAX_DURATION_DAYS from a start within that horizon', () => {
    assert.equal(COVERAGE_MAX_DURATION_DAYS, 30);
    assert.equal(coverageWindowProblem({ startsAt: now, endsAt: at(30), now }), null);
    assert.equal(coverageWindowProblem({ startsAt: at(30), endsAt: at(60), now }), null);
  });
  it('names each refused window', () => {
    assert.equal(coverageWindowProblem({ startsAt: now, endsAt: null, now }), 'END_REQUIRED');
    assert.equal(coverageWindowProblem({ startsAt: at(-1), endsAt: at(2), now }), 'START_IN_PAST');
    assert.equal(coverageWindowProblem({ startsAt: at(31), endsAt: at(32), now }), 'START_TOO_FAR');
    assert.equal(coverageWindowProblem({ startsAt: at(2), endsAt: at(2), now }), 'END_BEFORE_START');
    assert.equal(coverageWindowProblem({ startsAt: now, endsAt: at(31), now }), 'TOO_LONG');
  });
  it('treats adjacent windows as non-overlapping and stored open-ended windows as overlapping later ones', () => {
    assert.equal(coverageWindowsOverlap({ startsAt: now, endsAt: at(10) }, { startsAt: at(10), endsAt: at(20) }), false);
    assert.equal(coverageWindowsOverlap({ startsAt: now, endsAt: at(10) }, { startsAt: at(9), endsAt: at(20) }), true);
    assert.equal(coverageWindowsOverlap({ startsAt: now, endsAt: null }, { startsAt: at(40), endsAt: at(41) }), true);
  });
});
