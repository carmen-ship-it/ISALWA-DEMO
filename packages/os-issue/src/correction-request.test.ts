/**
 * T03 L4 — customer data correction requests on the issue machinery.
 *
 * The request never writes customer data: the responsible person must be able to apply the
 * change, and "applied" must cite the customer event that made it, recorded after the request.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  COMMERCIAL_CUSTOMER_EDIT_SCOPE,
  ISSUE_MANAGE_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
} from '@isalwa/os-contracts';
import type { StoredBusinessEvent } from '@isalwa/os-events';
import { IssueCommandService } from './issue-command-service';
import { MemoryIssueStore } from './memory-store';
import { FISCAL_ADMIN_SCOPE, type CorrectionCustomerPort } from './correction-authority';

const ORG = 'org-a';
const PARTY = 'party-1';
const OTHER_PARTY = 'party-2';
const CONTACT = 'contact-1';
const FOREIGN_CONTACT = 'contact-9';
const ADVISOR = 'advisor';
const OTHER_EDITOR = 'other-editor';
const STEWARD = 'steward';
const FISCAL = 'fiscal';
const MANAGER = 'manager';
const OUTSIDER = 'outsider';
const AT = new Date('2026-10-01T12:00:00.000Z');

function ctx(memberId: string, effectiveAt: Date = AT): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt,
  };
}

const port: CorrectionCustomerPort = {
  async customerFacts({ organizationId, partyId }) {
    if (organizationId !== ORG || (partyId !== PARTY && partyId !== OTHER_PARTY)) return null;
    return { accountOwnerMemberId: ADVISOR, ownerIsDirectReportOfActor: false, coverageGrants: [] };
  },
  async targetBelongsToParty({ partyId, contactId }) {
    if (contactId === CONTACT) return partyId === PARTY;
    if (contactId === FOREIGN_CONTACT) return partyId === OTHER_PARTY;
    return contactId === null;
  },
};

function grant(store: MemoryIssueStore, memberId: string, ...scopes: string[]) {
  for (const roleKey of scopes) {
    store.addRoleAssignment(memberId, ORG, { roleKey, effectiveAt: new Date('2020-01-01'), endedAt: null });
  }
}

function customerEvent(
  store: MemoryIssueStore,
  id: string,
  eventType: string,
  primaryEntityType: string,
  primaryEntityId: string,
  payload: Record<string, unknown>,
  occurredAt: Date = AT,
) {
  store.events.push({
    id,
    organizationId: ORG,
    eventType,
    occurredAt,
    recordedAt: occurredAt,
    actorMemberId: ADVISOR,
    primaryEntityType,
    primaryEntityId,
    payload,
    correlationId: 'corr',
  } as StoredBusinessEvent);
}

describe('T03 L4 correction requests', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store, port);
    for (const id of [ADVISOR, OTHER_EDITOR, STEWARD, FISCAL, MANAGER, OUTSIDER]) {
      store.addMember({ id, organizationId: ORG, accessStatus: 'active' });
    }
    grant(store, ADVISOR, COMMERCIAL_CUSTOMER_EDIT_SCOPE);
    grant(store, OTHER_EDITOR, COMMERCIAL_CUSTOMER_EDIT_SCOPE, 'commercial.org.read');
    grant(store, STEWARD, MASTER_DATA_ADMIN_SCOPE);
    grant(store, FISCAL, FISCAL_ADMIN_SCOPE, 'commercial.org.read');
    grant(store, MANAGER, ISSUE_MANAGE_SCOPE);
  });

  const report = (actor: string, correction: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    service.execute('ReportIssue', ctx(actor), {
      description: 'El cliente indica que el nombre está mal escrito',
      correction,
      ...extra,
    });

  const contactName = {
    partyId: PARTY,
    contactId: CONTACT,
    field: 'contact_name',
    proposedValue: 'Ana María Pérez',
    source: 'customer',
  };

  async function reportAssigned(owner: string, correction: Record<string, unknown> = contactName) {
    const reported = await report(ADVISOR, correction);
    const issueId = reported.data.issueId as string;
    await service.execute('AssignIssueOwner', ctx(MANAGER), { issueId, ownerMemberId: owner, expectedVersion: 0 });
    return issueId;
  }

  it('stores the restricted record, links the party, and keeps the proposed value out of the event', async () => {
    const reported = await report(ADVISOR, contactName);
    const issueId = reported.data.issueId as string;
    const record = await store.getCorrectionRequest(ORG, issueId);
    assert.equal(record?.proposedValue, 'Ana María Pérez');
    assert.equal(record?.decision, null);
    const refs = await store.listIssueReferences(ORG, issueId);
    assert.deepEqual(
      refs.map((r) => [r.referenceType, r.referenceId]),
      [['party', PARTY]],
    );
    const event = store.events.find((e) => e.eventType === 'issue.reported');
    assert.ok(event);
    assert.equal(JSON.stringify(event.payload).includes('Ana María Pérez'), false);
    assert.deepEqual((event.payload as Record<string, unknown>).correction, {
      partyId: PARTY,
      contactId: CONTACT,
      locationId: null,
      field: 'contact_name',
      source: 'customer',
    });
  });

  it('refuses a reporter who cannot know the customer, or a contact of another customer, as NOT_FOUND', async () => {
    await assert.rejects(report(OUTSIDER, contactName), /NOT_FOUND/);
    await assert.rejects(report(ADVISOR, { ...contactName, contactId: FOREIGN_CONTACT }), /NOT_FOUND/);
    await assert.rejects(report(ADVISOR, { ...contactName, partyId: 'party-unknown' }), /NOT_FOUND/);
    assert.equal(store.issues.size, 0);
    assert.equal(store.corrections.size, 0);
  });

  it('fails closed without the customer port', async () => {
    const bare = new IssueCommandService(store);
    await assert.rejects(
      bare.execute('ReportIssue', ctx(ADVISOR), { description: 'x', correction: contactName }),
      /PERMISSION_DENIED/,
    );
    assert.equal(store.issues.size, 0);
  });

  it('assigns only a responsible person who may apply the change', async () => {
    const reported = await report(ADVISOR, contactName);
    const issueId = reported.data.issueId as string;
    const assign = (owner: string) =>
      service.execute('AssignIssueOwner', ctx(MANAGER), { issueId, ownerMemberId: owner, expectedVersion: 0 });
    await assert.rejects(assign(OUTSIDER), /VALIDATION_FAILED/);
    await assert.rejects(assign(MANAGER), /VALIDATION_FAILED/);
    await assign(OTHER_EDITOR);

    const legal = await report(ADVISOR, { partyId: PARTY, field: 'legal_name', proposedValue: 'ACME S.A.', source: 'document' });
    const legalId = legal.data.issueId as string;
    await assert.rejects(
      service.execute('AssignIssueOwner', ctx(MANAGER), { issueId: legalId, ownerMemberId: ADVISOR, expectedVersion: 0 }),
      /VALIDATION_FAILED/,
    );
    await service.execute('AssignIssueOwner', ctx(MANAGER), { issueId: legalId, ownerMemberId: STEWARD, expectedVersion: 0 });

    const fiscal = await report(ADVISOR, { partyId: PARTY, field: 'fiscal_identity', proposedValue: 'NIT 1234567-8', source: 'document' });
    const fiscalId = fiscal.data.issueId as string;
    await assert.rejects(
      service.execute('AssignIssueOwner', ctx(MANAGER), { issueId: fiscalId, ownerMemberId: STEWARD, expectedVersion: 0 }),
      /VALIDATION_FAILED/,
    );
    await service.execute('AssignIssueOwner', ctx(MANAGER), { issueId: fiscalId, ownerMemberId: FISCAL, expectedVersion: 0 });
  });

  it('"applied" must cite a matching customer event recorded after the request', async () => {
    const issueId = await reportAssigned(ADVISOR);
    const resolve = (correction?: Record<string, unknown>) =>
      service.execute('ResolveIssue', ctx(ADVISOR), {
        issueId,
        resolution: 'Corregido',
        expectedVersion: 1,
        ...(correction ? { correction } : {}),
      });
    customerEvent(store, 'ev-party', 'party.updated', 'party', PARTY, { partyId: PARTY });
    customerEvent(store, 'ev-other-contact', 'contact.updated', 'contact', 'contact-2', { organizationPartyId: PARTY });
    customerEvent(store, 'ev-other-party', 'contact.updated', 'contact', FOREIGN_CONTACT, { organizationPartyId: OTHER_PARTY });
    customerEvent(store, 'ev-early', 'contact.updated', 'contact', CONTACT, { organizationPartyId: PARTY }, new Date('2026-10-01T11:00:00.000Z'));
    customerEvent(store, 'ev-ok', 'contact.updated', 'contact', CONTACT, { organizationPartyId: PARTY });

    await assert.rejects(resolve(), /VALIDATION_FAILED/);
    for (const appliedEventId of ['ev-party', 'ev-other-contact', 'ev-other-party', 'ev-early', 'ev-missing']) {
      await assert.rejects(
        resolve({ decision: 'applied', appliedEventId, reason: 'Nombre corregido en ficha' }),
        /VALIDATION_FAILED/,
        appliedEventId,
      );
    }
    assert.equal((await store.getIssueInOrg(ORG, issueId))?.status, 'reported');

    await resolve({ decision: 'applied', appliedEventId: 'ev-ok', reason: 'Nombre corregido en ficha' });
    const issue = await store.getIssueInOrg(ORG, issueId);
    assert.equal(issue?.status, 'resolved');
    assert.equal(issue?.outcome, 'applied');
    const record = await store.getCorrectionRequest(ORG, issueId);
    assert.equal(record?.decision, 'applied');
    assert.equal(record?.appliedEventId, 'ev-ok');
    assert.equal(record?.decidedByMemberId, ADVISOR);
  });

  it('a rejection needs a reason, and is decided only by someone who may apply the change', async () => {
    const issueId = await reportAssigned(ADVISOR);
    await assert.rejects(
      service.execute('ResolveIssue', ctx(MANAGER), {
        issueId,
        resolution: 'No procede',
        expectedVersion: 1,
        correction: { decision: 'rejected', reason: 'El nombre ya es correcto' },
      }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      service.execute('ResolveIssue', ctx(ADVISOR), {
        issueId,
        resolution: 'No procede',
        expectedVersion: 1,
        correction: { decision: 'rejected', reason: 'corto' },
      }),
    );
    await service.execute('ResolveIssue', ctx(ADVISOR), {
      issueId,
      resolution: 'No procede',
      expectedVersion: 1,
      correction: { decision: 'rejected', reason: 'El nombre ya es correcto' },
    });
    assert.equal((await store.getIssueInOrg(ORG, issueId))?.outcome, 'rejected');
  });

  it('the outcome is the decision: RecordIssueOutcome is refused, and reopening clears the decision', async () => {
    const issueId = await reportAssigned(ADVISOR);
    await service.execute('ResolveIssue', ctx(ADVISOR), {
      issueId,
      resolution: 'No procede',
      expectedVersion: 1,
      correction: { decision: 'rejected', reason: 'El nombre ya es correcto' },
    });
    await assert.rejects(
      service.execute('RecordIssueOutcome', ctx(ADVISOR), { issueId, outcome: 'applied', expectedVersion: 2 }),
      /VALIDATION_FAILED/,
    );
    await service.execute('ReopenIssue', ctx(MANAGER), { issueId, expectedVersion: 2 });
    const issue = await store.getIssueInOrg(ORG, issueId);
    assert.equal(issue?.status, 'reopened');
    assert.equal(issue?.outcome, null);
    assert.equal((await store.getCorrectionRequest(ORG, issueId))?.decision, null);
  });

  it('an ordinary issue refuses a correction decision', async () => {
    const reported = await service.execute('ReportIssue', ctx(ADVISOR), { description: 'Otro problema' });
    const issueId = reported.data.issueId as string;
    await assert.rejects(
      service.execute('ResolveIssue', ctx(MANAGER), {
        issueId,
        resolution: 'Listo',
        expectedVersion: 0,
        correction: { decision: 'rejected', reason: 'No es una corrección' },
      }),
      /VALIDATION_FAILED/,
    );
  });

  it('only customer-data fields exist: payments, orders and documents cannot be requested', async () => {
    for (const field of ['payment', 'order_total', 'invoice', 'quote_price']) {
      await assert.rejects(report(ADVISOR, { ...contactName, field }));
    }
    assert.equal(store.corrections.size, 0);
  });
});
