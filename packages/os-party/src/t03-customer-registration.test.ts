/**
 * T03 customer registration and customer-command authority on the service with a
 * recording store. Not Postgres: the PG and HTTP proofs live in os-database and os-api.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CustomerCoverageGrant, RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from './party-command-service';
import { LocationCommandService } from './location-command-service';
import type { OsPartyStore } from './os-party-store';

const ORG = 'org-a';
const SINCE = new Date('2026-01-01T00:00:00.000Z');
const NOW = new Date('2026-10-16T15:00:00.000Z');

function ctx(actorMemberId: string, organizationId = ORG): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: `corr-${actorMemberId}`,
    effectiveAt: NOW,
  };
}

function harness(input: {
  scopes: Record<string, string[]>;
  existingPhones?: Record<string, string[]>;
  existingParties?: Array<{ id: string; organizationId: string; ownerMemberId: string | null }>;
  grants?: CustomerCoverageGrant[];
  /** Members who currently lead each existing party's account owner. */
  leadsOwner?: string[];
}) {
  const rows: Record<string, Array<Record<string, unknown>>> = {
    party: [],
    account: [],
    role: [],
    contact: [],
    location: [],
    duplicate: [],
    event: [],
  };
  const existing = new Map((input.existingParties ?? []).map((p) => [p.id, p]));
  const store = {
    async runInTransaction(fn: (s: OsPartyStore) => Promise<unknown>) {
      const mark = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length]));
      try {
        return await fn(store as unknown as OsPartyStore);
      } catch (err) {
        for (const [k, n] of Object.entries(mark)) rows[k]!.length = n;
        throw err;
      }
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      return organizationId === ORG && memberId in input.scopes
        ? { id: memberId, organizationId, accessStatus: 'active' }
        : null;
    },
    async listRoleAssignmentsForMember(memberId: string) {
      return (input.scopes[memberId] ?? []).map((roleKey) => ({ roleKey, effectiveAt: SINCE, endedAt: null }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getPartyInOrg(organizationId: string, partyId: string) {
      const row = existing.get(partyId);
      return row && row.organizationId === organizationId
        ? { id: row.id, organizationId, partyKind: 'organization', displayName: 'Cliente', legalName: null, status: 'active', mergedIntoPartyId: null, version: 0 }
        : null;
    },
    async getCommercialAccountForParty(organizationId: string, partyId: string) {
      const row = existing.get(partyId);
      if (row && row.organizationId === organizationId) {
        return { id: `acct-${partyId}`, organizationId, partyId, territoryId: null, ownerMemberId: row.ownerMemberId, status: 'active', version: 0 };
      }
      return (rows.account!.find((a) => a.partyId === partyId) as never) ?? null;
    },
    async listCustomerCoverageGrants(_organizationId: string, partyId: string) {
      return (input.grants ?? []).filter((g) => g.customerPartyId === partyId);
    },
    async isDirectReport(organizationId: string, managerMemberId: string) {
      return organizationId === ORG && (input.leadsOwner ?? []).includes(managerMemberId);
    },
    async updateParty(partyId: string, patch: Record<string, unknown>, expectedVersion: number) {
      if (expectedVersion !== 0) throw new Error('CONFLICT');
      rows.party!.push({ updated: partyId, ...patch });
    },
    async listPartyIdsWithContactPhone(_organizationId: string, phone: string) {
      return input.existingPhones?.[phone] ?? [];
    },
    async insertParty(row: Record<string, unknown>) {
      rows.party!.push(row);
    },
    async insertPartyRoleAssignment(row: Record<string, unknown>) {
      rows.role!.push(row);
    },
    async insertCommercialAccount(row: Record<string, unknown>) {
      rows.account!.push(row);
    },
    async insertContact(row: Record<string, unknown>) {
      rows.contact!.push(row);
    },
    async insertLocation(row: Record<string, unknown>) {
      rows.location!.push(row);
    },
    async upsertDuplicateCandidate(row: Record<string, unknown>) {
      rows.duplicate!.push(row);
    },
    async insertFiscalIdentity() {
      rows.party!.push({ fiscal: true });
    },
    async findActiveFiscalByNit() {
      return null;
    },
    async appendEventAndAudit(event: { eventType: string; payload?: Record<string, unknown> }) {
      rows.event!.push(event as never);
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
  return {
    rows,
    party: new PartyCommandService(store as unknown as OsPartyStore),
    location: new LocationCommandService(store as unknown as OsPartyStore),
  };
}

async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'OK';
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

const SELLER = 'mem-seller';
const STEWARD = 'mem-steward';
const MANAGER = 'mem-manager';
const OTHER = 'mem-other';

const sellerCustomer = {
  partyKind: 'organization',
  displayName: 'Constructora Andina',
  contact: { givenName: 'Rosa', familyName: 'Quispe' },
  phone: '7123 4567',
  city: 'Santa Cruz de la Sierra',
  department: 'Santa Cruz',
  addressReference: 'Av. Banzer 4to anillo',
};

describe('T03 Registrar cliente: seller path', () => {
  it('creates the customer, account ownership, contact and location in one command', async () => {
    const t = harness({ scopes: { [SELLER]: ['commercial.customer.create'] } });
    const result = await t.party.execute('CreateParty', ctx(SELLER), sellerCustomer);
    assert.equal(t.rows.party!.length, 1);
    assert.equal(t.rows.role![0]!.roleKey, 'customer');
    assert.equal(t.rows.account![0]!.ownerMemberId, SELLER);
    assert.equal(t.rows.contact![0]!.phone, '+59171234567');
    assert.equal(t.rows.contact![0]!.organizationPartyId, result.data.partyId);
    assert.equal(t.rows.location![0]!.city, 'Santa Cruz de la Sierra');
    assert.equal(t.rows.location![0]!.department, 'Santa Cruz');
    assert.equal(t.rows.location![0]!.latitude, null);
    assert.equal(result.data.accountOwnerMemberId, SELLER);
    assert.equal(result.data.duplicateReviewRequested, false);
    assert.equal('phone' in result.data, false);
  });

  it('accepts "Sin teléfono disponible" instead of a phone, and refuses neither', async () => {
    const ok = harness({ scopes: { [SELLER]: ['commercial.customer.create'] } });
    const noPhone = { ...sellerCustomer, phone: undefined, noPhoneReason: 'no_phone_available' };
    assert.equal(await outcome(() => ok.party.execute('CreateParty', ctx(SELLER), noPhone)), 'OK');
    const bad = harness({ scopes: { [SELLER]: ['commercial.customer.create'] } });
    assert.equal(
      await outcome(() => bad.party.execute('CreateParty', ctx(SELLER), { ...sellerCustomer, phone: undefined })),
      'VALIDATION_FAILED',
    );
    assert.equal(bad.rows.party!.length, 0);
  });

  it('keeps the seller path bounded: no fiscal/legal data, no other role, no other owner', async () => {
    for (const extra of [
      { fiscalIdentity: { nit: '1234567', razonSocial: 'X' } },
      { legalName: 'Constructora Andina S.R.L.' },
      { initialRoleKey: 'supplier' },
      { accountOwnerMemberId: OTHER },
    ]) {
      const t = harness({ scopes: { [SELLER]: ['commercial.customer.create'], [OTHER]: [] } });
      const result = await outcome(() => t.party.execute('CreateParty', ctx(SELLER), { ...sellerCustomer, ...extra }));
      assert.notEqual(result, 'OK', JSON.stringify(extra));
      assert.deepEqual([t.rows.party!.length, t.rows.account!.length, t.rows.event!.length], [0, 0, 0]);
    }
  });

  it('denies a member with neither commercial.customer.create nor master_data.admin', async () => {
    for (const scopes of [[], ['people.admin'], ['commercial.team.read'], ['commercial.org.read']]) {
      const t = harness({ scopes: { [OTHER]: scopes } });
      assert.equal(await outcome(() => t.party.execute('CreateParty', ctx(OTHER), sellerCustomer)), 'PERMISSION_DENIED');
      assert.equal(t.rows.party!.length, 0);
    }
  });
});

describe('T03 Registrar cliente: shared phone and duplicates', () => {
  it('asks for a reason when the phone already appears, without naming the matches', async () => {
    const t = harness({
      scopes: { [SELLER]: ['commercial.customer.create'] },
      existingPhones: { '+59171234567': ['party-hidden'] },
    });
    const result = await outcome(() => t.party.execute('CreateParty', ctx(SELLER), sellerCustomer));
    assert.equal(result, 'DUPLICATE_REVIEW_REQUIRED');
    assert.equal(t.rows.party!.length, 0);
    assert.equal(t.rows.duplicate!.length, 0);
  });

  it('registers another customer on a shared phone with a reason and queues review, never merging', async () => {
    const t = harness({
      scopes: { [SELLER]: ['commercial.customer.create'] },
      existingPhones: { '+59171234567': ['party-hidden'] },
    });
    const result = await t.party.execute('CreateParty', ctx(SELLER), {
      ...sellerCustomer,
      duplicateReason: 'Mismo teléfono de oficina, otra empresa',
    });
    assert.equal(t.rows.party!.length, 1);
    assert.equal(t.rows.account![0]!.ownerMemberId, SELLER);
    assert.equal(t.rows.duplicate!.length, 1);
    assert.equal(t.rows.duplicate![0]!.matchReason, 'phone_shared');
    assert.equal(t.rows.duplicate![0]!.status, 'suggested');
    assert.equal(result.data.duplicateReviewRequested, true);
    assert.equal(JSON.stringify(result.data).includes('party-hidden'), false);
  });
});

describe('T03 Registrar cliente: steward is not an owner', () => {
  it('lets master_data.admin create a customer with no implicit owner', async () => {
    const t = harness({ scopes: { [STEWARD]: ['master_data.admin'] } });
    await t.party.execute('CreateParty', ctx(STEWARD), {
      partyKind: 'organization',
      displayName: 'Ferretería Norte',
      initialRoleKey: 'customer',
    });
    assert.equal(t.rows.account![0]!.ownerMemberId, null);
  });

  it('does not let the steward self-assign ownership; assignment needs reassign plus org or intake assignment scope', async () => {
    const self = harness({ scopes: { [STEWARD]: ['master_data.admin'] } });
    assert.equal(
      await outcome(() =>
        self.party.execute('CreateParty', ctx(STEWARD), {
          partyKind: 'organization',
          displayName: 'Ferretería Norte',
          initialRoleKey: 'customer',
          accountOwnerMemberId: STEWARD,
        }),
      ),
      'PERMISSION_DENIED',
    );
    assert.equal(self.rows.party!.length, 0);

    // T03 2026-10-16 19:30: allocating a new (unassigned) account needs reassign AND org-wide or intake scope.
    const alone = harness({ scopes: { [MANAGER]: ['master_data.admin', 'commercial.account.reassign', 'commercial.org.read'], [SELLER]: [] } });
    assert.equal(
      await outcome(() =>
        alone.party.execute('CreateParty', ctx(MANAGER), {
          partyKind: 'organization',
          displayName: 'Ferretería Norte',
          initialRoleKey: 'customer',
          accountOwnerMemberId: SELLER,
        }),
      ),
      'PERMISSION_DENIED',
    );
    assert.equal(alone.rows.party!.length, 0);

    for (const scope of ['commercial.intake.assign', 'commercial.assignment.org']) {
      const assigned = harness({ scopes: { [MANAGER]: ['master_data.admin', 'commercial.account.reassign', scope], [SELLER]: [] } });
      await assigned.party.execute('CreateParty', ctx(MANAGER), {
        partyKind: 'organization',
        displayName: 'Ferretería Norte',
        initialRoleKey: 'customer',
        accountOwnerMemberId: SELLER,
      });
      assert.equal(assigned.rows.account![0]!.ownerMemberId, SELLER, scope);
    }
  });
});

describe('T03 customer commands: non-disclosure', () => {
  const customer = { id: 'party-1', organizationId: ORG, ownerMemberId: SELLER };
  const foreign = { id: 'party-foreign', organizationId: 'org-b', ownerMemberId: 'mem-b' };

  it('answers nonexistent, foreign-tenant and inaccessible customers identically', async () => {
    for (const run of [
      (t: ReturnType<typeof harness>, partyId: string) =>
        t.party.execute('UpdateParty', ctx(OTHER), { partyId, displayName: 'x', expectedVersion: 0 }),
      (t: ReturnType<typeof harness>, partyId: string) =>
        t.location.execute('CreateLocation', ctx(OTHER), { partyId, label: 'Obra' }),
    ]) {
      const answers: string[] = [];
      for (const partyId of ['party-missing', 'party-foreign', 'party-1']) {
        const t = harness({
          scopes: { [OTHER]: ['commercial.customer.edit'] },
          existingParties: [customer, foreign],
        });
        answers.push(await outcome(() => run(t, partyId)));
        assert.equal(t.rows.event!.length, 0);
      }
      assert.deepEqual(answers, ['NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND']);
    }
  });

  it('lets a team lead with commercial.customer.edit edit without owning or covering, recording the actor', async () => {
    const t = harness({
      scopes: { [MANAGER]: ['commercial.team.read', 'commercial.customer.edit'] },
      existingParties: [customer],
      leadsOwner: [MANAGER],
    });
    await t.party.execute('UpdateParty', ctx(MANAGER), { partyId: 'party-1', displayName: 'Constructora Andina SRL', expectedVersion: 0 });
    assert.deepEqual(t.rows.party, [{ updated: 'party-1', displayName: 'Constructora Andina SRL', legalName: null, version: 1 }]);
    assert.equal(t.rows.event!.length, 1);
    assert.equal((t.rows.event![0] as { actorMemberId?: string }).actorMemberId, MANAGER);
    assert.equal(t.rows.account!.length, 0);

    const stale = harness({ scopes: { [MANAGER]: ['commercial.team.read', 'commercial.customer.edit'] }, existingParties: [customer], leadsOwner: [MANAGER] });
    assert.equal(
      await outcome(() => stale.party.execute('UpdateParty', ctx(MANAGER), { partyId: 'party-1', displayName: 'x', expectedVersion: 3 })),
      'CONFLICT',
    );
    const legal = harness({ scopes: { [MANAGER]: ['commercial.team.read', 'commercial.customer.edit'] }, existingParties: [customer], leadsOwner: [MANAGER] });
    assert.equal(
      await outcome(() => legal.party.execute('UpdateParty', ctx(MANAGER), { partyId: 'party-1', legalName: 'Otra SRL', expectedVersion: 0 })),
      'VALIDATION_FAILED',
    );
  });

  it('keeps team.read / org.read read-only and denies managers outside the team', async () => {
    for (const scopes of [['commercial.team.read'], ['commercial.org.read']]) {
      const t = harness({ scopes: { [MANAGER]: scopes }, existingParties: [customer], leadsOwner: [MANAGER] });
      assert.equal(
        await outcome(() => t.party.execute('UpdateParty', ctx(MANAGER), { partyId: 'party-1', displayName: 'x', expectedVersion: 0 })),
        'PERMISSION_DENIED',
        String(scopes),
      );
      assert.equal(t.rows.event!.length, 0);
    }
    const outside = harness({ scopes: { [MANAGER]: ['commercial.team.read', 'commercial.customer.edit'] }, existingParties: [customer] });
    assert.equal(
      await outcome(() => outside.party.execute('UpdateParty', ctx(MANAGER), { partyId: 'party-1', displayName: 'x', expectedVersion: 0 })),
      'NOT_FOUND',
    );
    const peopleAdmin = harness({ scopes: { [MANAGER]: ['people.admin', 'commercial.customer.edit'] }, existingParties: [customer], leadsOwner: [MANAGER] });
    assert.equal(
      await outcome(() => peopleAdmin.party.execute('UpdateParty', ctx(MANAGER), { partyId: 'party-1', displayName: 'x', expectedVersion: 0 })),
      'NOT_FOUND',
    );
  });

  it('gives PERMISSION_DENIED when the caller may know the customer but lacks the action', async () => {
    const coverage: CustomerCoverageGrant = {
      grantType: 'commercial.customer.coverage',
      organizationId: ORG,
      customerPartyId: 'party-1',
      primaryOwnerMemberId: SELLER,
      actingAdvisorMemberId: OTHER,
      coveredActions: ['commercial.work'],
      startsAt: SINCE,
      endsAt: null,
      revokedAt: null,
    };
    // Coverage without customer.edit, while holding the edit scope.
    const noAction = harness({ scopes: { [OTHER]: ['commercial.customer.edit'] }, existingParties: [customer], grants: [coverage] });
    assert.equal(
      await outcome(() => noAction.party.execute('UpdateParty', ctx(OTHER), { partyId: 'party-1', displayName: 'x', expectedVersion: 0 })),
      'PERMISSION_DENIED',
    );
    // Coverage with customer.edit but without the edit scope: coverage never supplies the permission.
    const noScope = harness({
      scopes: { [OTHER]: [] },
      existingParties: [customer],
      grants: [{ ...coverage, coveredActions: ['commercial.work', 'customer.edit'] }],
    });
    assert.equal(
      await outcome(() => noScope.party.execute('UpdateParty', ctx(OTHER), { partyId: 'party-1', displayName: 'x', expectedVersion: 0 })),
      'PERMISSION_DENIED',
    );
    // Coverage archive is not delegable by a commercial.work/customer.edit grant.
    const archive = harness({
      scopes: { [OTHER]: ['commercial.customer.archive'] },
      existingParties: [customer],
      grants: [{ ...coverage, coveredActions: ['commercial.work', 'customer.edit'] }],
    });
    assert.equal(
      await outcome(() => archive.party.execute('DeactivateParty', ctx(OTHER), { partyId: 'party-1' })),
      'PERMISSION_DENIED',
    );
  });
});
