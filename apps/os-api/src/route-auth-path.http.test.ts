/**
 * Local HTTP proof for the previously unproven session path.
 * This is not API_VERIFIED and not hosted proof.
 * Location detail stays AUTHORIZATION_UNPROVEN.
 */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { describe, it } from 'node:test';
import { HttpException, StreamableFile } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthIdentityRecord, MemberRecord, RoleAssignmentRecord } from '@isalwa/os-workforce';
import { LocationsController } from './locations.controller';
import { OperationsController } from './operations.controller';
import { PartiesController } from './parties.controller';
import { QuotesController } from './commercial.controller';
import { SessionController } from './session.controller';

const ORG = 'org-a';
const OTHER = 'org-b';
const FOREIGN = 'org-foreign';
const PAST = new Date('2026-01-01T00:00:00.000Z');
const FOREIGN_NOTE = 'foreign-customer-note';

function auth(overrides: Partial<AuthIdentityRecord> = {}): AuthIdentityRecord {
  return {
    id: 'auth-1',
    personId: 'person-1',
    provider: 'dev',
    providerSubject: 'subject-1',
    email: 'isa@example.invalid',
    status: 'active',
    invitedAt: null,
    activatedAt: PAST,
    revokedAt: null,
    ...overrides,
  };
}

function member(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'mem-a',
    organizationId: ORG,
    personId: 'person-1',
    employmentStatus: 'active',
    accessStatus: 'active',
    employmentStartedAt: null,
    employmentEndedAt: null,
    version: 1,
    ...overrides,
  };
}

function role(memberId: string, organizationId: string, roleKey: string): RoleAssignmentRecord {
  return {
    id: `role-${organizationId}-${memberId}-${roleKey}`,
    organizationId,
    memberId,
    roleKey,
    effectiveAt: PAST,
    endedAt: null,
  };
}

function store(input: {
  identities: AuthIdentityRecord[];
  members: MemberRecord[];
  roles: RoleAssignmentRecord[];
}) {
  return {
    async findAuthIdentityById(id: string) {
      return input.identities.find((row) => row.id === id) ?? null;
    },
    async findAuthIdentityByProviderSubject(provider: string, providerSubject: string) {
      return (
        input.identities.find(
          (row) => row.provider === provider && row.providerSubject === providerSubject,
        ) ?? null
      );
    },
    async listMembersForPerson(personId: string) {
      return input.members.filter((row) => row.personId === personId);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      return input.members.find((row) => row.organizationId === organizationId && row.id === memberId) ?? null;
    },
    async listRoleAssignmentsForMember(memberId: string, organizationId?: string) {
      return input.roles.filter(
        (row) => row.memberId === memberId && (organizationId == null || row.organizationId === organizationId),
      );
    },
    async listDelegationsForDelegate() {
      return [];
    },
  };
}

function asRequest(req: IncomingMessage): Request {
  return {
    header(name: string) {
      const value = req.headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    },
    query: {},
    body: {},
  } as Request;
}

function headers(input: Record<string, string> = {}): Record<string, string> {
  return {
    'x-os-auth-identity-id': 'auth-1',
    'x-os-person-id': 'person-1',
    ...input,
  };
}

async function listen(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>) {
  const server = createServer((req, res) => {
    void handler(req, res).catch((err: unknown) => {
      const mapped = err instanceof HttpException ? err : null;
      const status = mapped?.getStatus() ?? 500;
      const body = mapped?.getResponse() ?? { code: 'INTERNAL_ERROR' };
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no_port');
  return {
    base: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function withDev<T>(run: () => Promise<T>): Promise<T> {
  const previousAuth = process.env.OS_AUTH_MODE;
  const previousProfile = process.env.OS_RUNTIME_PROFILE;
  process.env.OS_AUTH_MODE = 'dev';
  process.env.OS_RUNTIME_PROFILE = 'development';
  try {
    return await run();
  } finally {
    if (previousAuth === undefined) delete process.env.OS_AUTH_MODE;
    else process.env.OS_AUTH_MODE = previousAuth;
    if (previousProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
    else process.env.OS_RUNTIME_PROFILE = previousProfile;
  }
}

describe('local HTTP auth path', { concurrency: false }, () => {
  it('exercises session, party, location, outbox, and quote PDF controllers', async () => {
    await withDev(async () => {
      const workforce = store({
        identities: [
          auth(),
          auth({ id: 'auth-2', personId: 'person-2', providerSubject: 'subject-2' }),
          auth({ id: 'auth-suspended', personId: 'person-suspended', providerSubject: 'subject-suspended' }),
        ],
        members: [
          member(),
          member({ id: 'mem-b', organizationId: OTHER, personId: 'person-1' }),
          member({ id: 'mem-suspended', personId: 'person-suspended', accessStatus: 'suspended' }),
          member({ id: 'mem-other', organizationId: OTHER, personId: 'person-2' }),
        ],
        roles: [
          role('mem-a', ORG, 'people.admin'),
          role('mem-a', ORG, 'commercial.team.read'),
          role('mem-b', OTHER, 'people.admin'),
          role('mem-other', OTHER, 'people.admin'),
        ],
      });
      const healthOrgs: string[] = [];
      const deadLetterOrgs: string[] = [];
      const renderedQuoteIds: string[] = [];
      const partyStore = {
        async getPartyInOrg(organizationId: string, partyId: string) {
          if (organizationId === ORG && partyId === 'party-a') {
            return { id: 'party-a', organizationId: ORG, displayName: 'Cliente A' };
          }
          return null;
        },
        async listActivePartyRoles() {
          return [];
        },
        async listContactsForOrgParty(organizationId: string, partyId: string) {
          if (organizationId !== ORG || partyId !== 'party-a') return [];
          return [{ id: 'contact-a', organizationId: ORG, note: 'own-note' }];
        },
        async getCommercialAccountForParty() {
          return null;
        },
        async listLocationsForParty(organizationId: string, partyId: string) {
          if (organizationId === ORG && partyId === 'party-a') {
            return [{ id: 'loc-a', organizationId: ORG }];
          }
          return [];
        },
        async getLocationInOrg(organizationId: string, locationId: string) {
          if (organizationId === ORG && locationId === 'loc-a') {
            return { id: 'loc-a', organizationId: ORG, label: 'Taller A' };
          }
          if (organizationId === OTHER && locationId === 'loc-foreign') {
            return { id: 'loc-foreign', organizationId: OTHER, label: FOREIGN_NOTE };
          }
          return null;
        },
      };
      const sessionController = new SessionController(workforce as never);
      const parties = new PartiesController(partyStore as never, workforce as never, {} as never, {} as never);
      const locations = new LocationsController(partyStore as never, workforce as never);
      const operations = new OperationsController(
        workforce as never,
        {
          async getHealth(organizationId: string) {
            healthOrgs.push(organizationId);
            return { pending: organizationId === ORG ? 1 : 9 };
          },
        } as never,
        {
          async listDeadLetters(organizationId: string) {
            deadLetterOrgs.push(organizationId);
            if (organizationId !== ORG) return [{ id: 'dl-foreign', eventId: FOREIGN_NOTE }];
            return [{ id: 'dl-a', eventId: 'evt-a' }];
          },
          async getDeadLetterSummary(organizationId: string, outboxId: string) {
            deadLetterOrgs.push(organizationId);
            if (organizationId === ORG && outboxId === 'dl-a') {
              return {
                id: 'dl-a',
                eventId: 'evt-a',
                status: 'dead',
                attemptCount: 1,
                lastError: null,
                createdAt: PAST,
                publishedAt: null,
              };
            }
            return null;
          },
        } as never,
      );
      const quotes = new QuotesController(
        workforce as never,
        {
          async getQuote(_ctx: { organizationId: string }, quoteId: string) {
            if (quoteId !== 'quote-a') throw new Error('NOT_FOUND');
            return { quote: { id: 'quote-a', organizationId: ORG } };
          },
        } as never,
        {
          async renderAuthorizedQuote(quote: { id: string; organizationId: string }) {
            renderedQuoteIds.push(`${quote.organizationId}:${quote.id}`);
            return {
              bytes: Uint8Array.from([37, 80, 68, 70]),
              contentType: 'application/pdf',
              filename: 'cotizacion-quote-a.pdf',
            };
          },
        } as never,
      );

      const http = await listen(async (req, res) => {
        const request = asRequest(req);
        const url = req.url ?? '/';
        let value: unknown;
        if (url === '/v1/session/me') value = await sessionController.current(request);
        else if (url === '/v1/parties/party-a') value = await parties.getParty('party-a', request);
        else if (url === '/v1/parties/party-foreign') value = await parties.getParty('party-foreign', request);
        else if (url === '/v1/parties/party-a/locations') {
          value = await parties.listPartyLocations('party-a', request);
        } else if (url === '/v1/parties/party-foreign/locations') {
          value = await parties.listPartyLocations('party-foreign', request);
        } else if (url === '/v1/locations/loc-a') value = await locations.getLocation('loc-a', request);
        else if (url === '/v1/locations/loc-foreign') value = await locations.getLocation('loc-foreign', request);
        else if (url === '/v1/operations/outbox') value = await operations.outboxHealth(request);
        else if (url === '/v1/operations/outbox/dead-letters') value = await operations.listDeadLetters(request);
        else if (url === '/v1/operations/outbox/dead-letters/dl-foreign') {
          value = await operations.getDeadLetter('dl-foreign', request);
        } else if (url === '/v1/quotes/quote-a/pdf') value = await quotes.getPdf('quote-a', undefined, request);
        else if (url === '/v1/quotes/quote-foreign/pdf') {
          value = await quotes.getPdf('quote-foreign', undefined, request);
        } else {
          res.writeHead(404);
          res.end();
          return;
        }
        if (value instanceof StreamableFile) {
          res.writeHead(200, { 'content-type': 'application/pdf' });
          res.end('pdf');
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(value));
      });

      try {
        const noAuth = await fetch(`${http.base}/v1/session/me`);
        assert.equal(noAuth.status, 401);
        const session = await fetch(`${http.base}/v1/session/me`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(session.status, 200);
        const sessionBody = (await session.json()) as { organizationId: string; memberId: string };
        assert.equal(sessionBody.organizationId, ORG);
        assert.equal(sessionBody.memberId, 'mem-a');

        const noSelector = await fetch(`${http.base}/v1/session/me`, { headers: headers() });
        assert.notEqual(noSelector.status, 200);

        const foreignSelector = await fetch(`${http.base}/v1/session/me`, {
          headers: headers({ 'x-os-organization-id': FOREIGN }),
        });
        assert.equal(foreignSelector.status, 403);
        const foreignBody = await foreignSelector.text();
        assert.equal(foreignBody.includes(FOREIGN_NOTE), false);

        const ambiguous = await fetch(`${http.base}/v1/parties/party-a`, {
          headers: headers({ 'x-os-auth-identity-id': 'auth-1', 'x-os-person-id': 'person-1' }),
        });
        assert.notEqual(ambiguous.status, 200);
        assert.equal((await ambiguous.text()).includes('Cliente A'), false);

        const selected = await fetch(`${http.base}/v1/parties/party-a`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(selected.status, 200);
        const selectedBody = (await selected.json()) as { party: { displayName: string } };
        assert.equal(selectedBody.party.displayName, 'Cliente A');

        const foreignParty = await fetch(`${http.base}/v1/parties/party-foreign`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(foreignParty.status, 404);
        assert.equal((await foreignParty.text()).includes(FOREIGN_NOTE), false);

        const foreignLocations = await fetch(`${http.base}/v1/parties/party-foreign/locations`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(foreignLocations.status, 404);

        const ownLocation = await fetch(`${http.base}/v1/locations/loc-a`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(ownLocation.status, 200);
        const foreignLocation = await fetch(`${http.base}/v1/locations/loc-foreign`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(foreignLocation.status, 404);
        assert.equal((await foreignLocation.text()).includes(FOREIGN_NOTE), false);

        const suspended = await fetch(`${http.base}/v1/session/me`, {
          headers: {
            'x-os-auth-identity-id': 'auth-suspended',
            'x-os-person-id': 'person-suspended',
          },
        });
        assert.equal(suspended.status, 403);

        const salesOnly = store({
          identities: [auth({ id: 'auth-sales', personId: 'person-sales', providerSubject: 'sales' })],
          members: [member({ id: 'mem-sales', personId: 'person-sales' })],
          roles: [role('mem-sales', ORG, 'commercial.team.read')],
        });
        const deniedOps = new OperationsController(salesOnly as never, {
          async getHealth(organizationId: string) {
            healthOrgs.push(organizationId);
            return { pending: 1 };
          },
        } as never, { async listDeadLetters() { return []; }, async getDeadLetterSummary() { return null; } } as never);
        const deniedHttp = await listen(async (req, res) => {
          const value = await deniedOps.outboxHealth(asRequest(req));
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(value));
        });
        const before = healthOrgs.length;
        const wrongScope = await fetch(`${deniedHttp.base}/v1/operations/outbox`, {
          headers: {
            'x-os-auth-identity-id': 'auth-sales',
            'x-os-person-id': 'person-sales',
          },
        });
        assert.equal(wrongScope.status, 403);
        assert.equal(healthOrgs.length, before);
        await deniedHttp.close();

        const outbox = await fetch(`${http.base}/v1/operations/outbox`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(outbox.status, 200);
        assert.deepEqual(healthOrgs.includes(ORG), true);
        assert.equal(healthOrgs.includes(OTHER), false);
        const deadForeign = await fetch(`${http.base}/v1/operations/outbox/dead-letters/dl-foreign`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(deadForeign.status, 404);
        assert.equal((await deadForeign.text()).includes(FOREIGN_NOTE), false);
        assert.equal(deadLetterOrgs.includes(OTHER), false);

        const pdf = await fetch(`${http.base}/v1/quotes/quote-a/pdf`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(pdf.status, 200);
        assert.match(pdf.headers.get('content-type') ?? '', /application\/pdf/);
        assert.deepEqual(renderedQuoteIds, [`${ORG}:quote-a`]);
        const foreignPdf = await fetch(`${http.base}/v1/quotes/quote-foreign/pdf`, {
          headers: headers({ 'x-os-organization-id': ORG }),
        });
        assert.equal(foreignPdf.status, 404);
        assert.equal(renderedQuoteIds.length, 1);
      } finally {
        await http.close();
      }
    });
  });
});
