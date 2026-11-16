import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { memberIndependentScopes } from '@isalwa/os-domain';
import {
  canGrantCustomerCoverage,
  canRevokeCustomerCoverage,
  canReassignCommercialAccountOwner,
  CursorPaginationSchema,
  ListPartyTimelineQuerySchema,
  resolveAccountAssignmentAuthority,
  SearchPartiesQuerySchema,
  grantableCoverageActionsFor,
  CONTACT_ENDPOINT_CHANNELS,
  deriveCommitmentState,
  customerArchiveBlocked,
  FOLLOWUP_CHANNELS,
  type ContactFollowupPreferenceItem,
  type CustomerArchivePreview,
  isCurrentContact,
  maskContactNumber,
  pickCurrentContact,
  type ContactEndpointHistoryItem,
  type ContactRelationshipEndPreview,
} from '@isalwa/os-contracts';
import { customerAuthorityFlags, type ContactFollowupPreferenceRecord, type OsPartyStore } from '@isalwa/os-party';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type { PrismaOsCommitmentStore } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  assertCustomerReadable,
  buildQueryContext,
  type CustomerVisibilityLookup,
  type DirectReportLookup,
  type PartyQueryService,
  type PartyTimelineQueryService,
} from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { enforceRequestRateLimit, type RateLimitCounter } from './request-rate-limit';
import {
  OS_COMMERCIAL_STORE,
  OS_COMMITMENT_STORE,
  OS_CUSTOMER_VISIBILITY,
  OS_MEMBER_QUERY_STORE,
  OS_PARTY_QUERY_SERVICE,
  OS_PARTY_STORE,
  OS_PARTY_TIMELINE_QUERY_SERVICE,
  OS_RATE_LIMIT_COUNTER,
  OS_STORE,
} from './os-store.module';

@Controller('parties')
export class PartiesController {
  constructor(
    @Inject(OS_PARTY_STORE) private readonly partyStore: OsPartyStore,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMERCIAL_STORE) private readonly commercialStore: OsCommercialStore,
    @Inject(OS_PARTY_QUERY_SERVICE) private readonly partyQuery: PartyQueryService,
    @Inject(OS_PARTY_TIMELINE_QUERY_SERVICE)
    private readonly partyTimelineQuery: PartyTimelineQueryService,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: DirectReportLookup,
    @Inject(OS_RATE_LIMIT_COUNTER) private readonly rateLimits: RateLimitCounter,
    @Inject(OS_COMMITMENT_STORE) private readonly commitmentStore: PrismaOsCommitmentStore,
  ) {}

  /**
   * UI hints only; the commands recheck. Reassignment/coverage needs the action
   * permission plus assignment scope over this account (any eligible target in scope).
   */
  private async accountAssignmentFlags(
    organizationId: string,
    actorMemberId: string,
    asOf: Date,
    grantedScopes: string[],
    ownerMemberId: string | null,
    independentScopes: readonly string[],
  ): Promise<{
    canReassignOwner: boolean;
    canManageCoverage: boolean;
    canRevokeCoverage: boolean;
    grantableCoverageActions: string[];
  }> {
    const authority = resolveAccountAssignmentAuthority({
      grantedScopes,
      currentOwnerMemberId: ownerMemberId,
      actorLeadsCurrentOwner: ownerMemberId
        ? await this.partyStore.isDirectReport(organizationId, actorMemberId, ownerMemberId, asOf)
        : false,
      actorLeadsTarget: true,
    });
    // Granting delegates customer actions: independent authority only, as GrantCustomerCoverage enforces.
    const canManageCoverage = authority !== null && ownerMemberId !== null && canGrantCustomerCoverage(independentScopes);
    return {
      canReassignOwner: authority !== null && canReassignCommercialAccountOwner(grantedScopes),
      canManageCoverage,
      canRevokeCoverage: authority !== null && canRevokeCustomerCoverage(grantedScopes),
      grantableCoverageActions: canManageCoverage ? grantableCoverageActionsFor(independentScopes) : [],
    };
  }

  /** Session, query context and the customer boundary. Unreadable is NOT_FOUND. */
  private async readableCustomer(req: Request, partyId: string) {
    const session = await resolveSession(req, this.workforceStore);
    const ctx = await buildQueryContext(session, this.workforceStore);
    await assertCustomerReadable({
      ctx,
      partyId,
      lookup: this.customerVisibility,
      directReports: this.directReports,
    });
    return { session, ctx };
  }

  @Get()
  async searchParties(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = SearchPartiesQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      await enforceRequestRateLimit(this.rateLimits, 'search', session);
      const ctx = await buildQueryContext(session, this.workforceStore);
      const result = await this.partyQuery.searchParties(ctx, parsed.data);
      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId/timeline')
  async listPartyTimeline(
    @Param('partyId') partyId: string,
    @Query() queryParams: Record<string, string>,
    @Req() req: Request,
  ) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListPartyTimelineQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      // Names, legal values and reasons follow the customer edit rule (C2/C3); the query rechecks readability.
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      const fieldDetail = party
        ? (
            await customerAuthorityFlags({
              store: this.partyStore,
              ctx: session,
              snap: ctx.auth,
              partyId,
              partyStatus: party.status,
            })
          ).canReadLegalName
        : false;
      return await this.partyTimelineQuery.listPartyTimeline(ctx, partyId, parsed.data, { fieldDetail });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId/locations')
  async listPartyLocations(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const parsed = CursorPaginationSchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const { session } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const page = await this.partyStore.listLocationsForParty(session.organizationId, partyId, {
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
      });
      return {
        partyId,
        locations: page.items,
        meta: {
          nextCursor: page.nextCursor,
          limit: parsed.data.limit,
          hasMore: page.hasMore,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId/contacts')
  async listPartyContacts(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const parsed = CursorPaginationSchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const { session } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const page = await this.partyStore.listContactsForOrgParty(session.organizationId, partyId, {
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
      });
      return {
        partyId,
        contacts: page.items,
        meta: {
          nextCursor: page.nextCursor,
          limit: parsed.data.limit,
          hasMore: page.hasMore,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  /**
   * T03 L1: what ending this contact's relationship affects. Commitments belong to the customer,
   * not to a contact, and no automatic sending exists, so none is listed as cancellable.
   */
  @Get(':partyId/contacts/:contactId/relationship-end-preview')
  async contactRelationshipEndPreview(
    @Param('partyId') partyId: string,
    @Param('contactId') contactId: string,
    @Req() req: Request,
  ): Promise<ContactRelationshipEndPreview> {
    try {
      const { session, ctx } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      const flags = await customerAuthorityFlags({
        store: this.partyStore,
        ctx: session,
        snap: ctx.auth,
        partyId,
        partyStatus: party.status,
      });
      if (!flags.canEndContactRelationship) throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
      const contact = await this.partyStore.getContactInOrg(session.organizationId, contactId);
      if (!contact || contact.organizationPartyId !== partyId) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const contacts = (await this.partyStore.listContactsForOrgParty(session.organizationId, partyId)).items;
      const currentDefault = pickCurrentContact(contacts);
      const replacement = pickCurrentContact(contacts.filter((c) => c.id !== contact.id));
      let openIdentityReviews = 0;
      for (const channel of CONTACT_ENDPOINT_CHANNELS) {
        if (await this.partyStore.getOpenIdentityReview(session.organizationId, contact.id, channel)) openIdentityReviews += 1;
      }
      const preferences = await this.partyStore.listFollowupPreferences(session.organizationId, contact.id);
      const commitments = await this.commitmentStore.listCommitmentsByParty(session.organizationId, partyId);
      const asOf = new Date();
      return {
        partyId,
        contactId: contact.id,
        version: contact.version,
        relationStatus: contact.relationEndedAt ? 'ended' : 'current',
        documentRecipient: {
          isCurrentDefault: currentDefault?.id === contact.id,
          replacementContactId: isCurrentContact(contact) && currentDefault?.id === contact.id ? (replacement?.id ?? null) : null,
        },
        channels: CONTACT_ENDPOINT_CHANNELS.flatMap((channel) => {
          const number = channel === 'phone' ? contact.phone : contact.whatsapp;
          if (!number) return [];
          const status = (channel === 'phone' ? contact.phoneStatus : contact.whatsappStatus) ?? null;
          return [{ channel, number: maskContactNumber(number), status }];
        }),
        followupPreferences: preferences.length,
        openIdentityReviews,
        customerOpenCommitments: commitments
          .filter((c) => c.lifecycle === 'open')
          .map((c) => ({
            id: c.id,
            dueAt: c.dueAt ? c.dueAt.toISOString() : null,
            ownerMemberId: c.ownerMemberId,
            state: deriveCommitmentState({ lifecycle: 'open', dueAt: c.dueAt ? c.dueAt.toISOString() : null }, asOf),
          })),
        commitmentLinkage: 'customer',
        automaticSends: { configured: false, label: 'Envíos automáticos no configurados.' },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  /** T03 L3: open obligations that block archiving, and what archiving or reactivating would affect. */
  @Get(':partyId/archive-preview')
  async customerArchivePreview(@Param('partyId') partyId: string, @Req() req: Request): Promise<CustomerArchivePreview> {
    try {
      const { session, ctx } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      const flags = await customerAuthorityFlags({
        store: this.partyStore,
        ctx: session,
        snap: ctx.auth,
        partyId,
        partyStatus: party.status,
      });
      if (!flags.canArchiveCustomer && !flags.canReactivateCustomer) {
        throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
      }
      const facts = await this.partyStore.customerArchiveFacts(session.organizationId, partyId);
      const obligations = {
        openOrders: facts.openOrders,
        openCommitments: facts.openCommitments,
        openIssues: facts.openIssues,
        openWorkItems: facts.openWorkItems,
        pendingPayments: facts.pendingPayments,
        unassignedPayments: facts.unassignedPayments,
      };
      return {
        partyId,
        version: party.version,
        status: party.status,
        obligations,
        payments: { checked: true },
        blocked: customerArchiveBlocked(obligations),
        effects: { openOpportunities: facts.openOpportunities, openQuotes: facts.openQuotes, currentContacts: facts.currentContacts },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  /**
   * T03 L2: the contact's follow-up preference per channel, for anyone who may read the customer,
   * so that whoever contacts them can respect it. Notes stay in the restricted timeline.
   */
  @Get(':partyId/contacts/:contactId/followup-preferences')
  async contactFollowupPreferences(
    @Param('partyId') partyId: string,
    @Param('contactId') contactId: string,
    @Req() req: Request,
  ): Promise<{ partyId: string; contactId: string; items: ContactFollowupPreferenceItem[] }> {
    try {
      const { session } = await this.readableCustomer(req, partyId);
      const contact = await this.partyStore.getContactInOrg(session.organizationId, contactId);
      if (!contact || contact.organizationPartyId !== partyId) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const rows = await this.partyStore.listFollowupPreferences(session.organizationId, contactId);
      return { partyId, contactId, items: followupItems(rows) };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  /**
   * T03 L2: the recorded follow-up preferences of every contact of this customer in one read, so
   * the customer page does not ask once per contact. Contacts without a record are omitted.
   */
  @Get(':partyId/followup-preferences')
  async customerFollowupPreferences(
    @Param('partyId') partyId: string,
    @Req() req: Request,
  ): Promise<{ partyId: string; contacts: { contactId: string; items: ContactFollowupPreferenceItem[] }[] }> {
    try {
      const { session } = await this.readableCustomer(req, partyId);
      const rows = await this.partyStore.listFollowupPreferencesForParty(session.organizationId, partyId);
      const byContact = new Map<string, typeof rows>();
      for (const row of rows) byContact.set(row.contactId, [...(byContact.get(row.contactId) ?? []), row]);
      return {
        partyId,
        contacts: [...byContact.entries()].map(([contactId, contactRows]) => ({ contactId, items: followupItems(contactRows) })),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  /** T03 C6: this contact's own number history, masked. Earlier customers of a number never appear. */
  @Get(':partyId/contacts/:contactId/endpoints')
  async listContactEndpointHistory(
    @Param('partyId') partyId: string,
    @Param('contactId') contactId: string,
    @Req() req: Request,
  ): Promise<{ partyId: string; contactId: string; items: ContactEndpointHistoryItem[] }> {
    try {
      const { session, ctx } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      const flags = await customerAuthorityFlags({
        store: this.partyStore,
        ctx: session,
        snap: ctx.auth,
        partyId,
        partyStatus: party.status,
      });
      if (!flags.canReviewEndpointHistory) throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
      const contact = await this.partyStore.getContactInOrg(session.organizationId, contactId);
      if (!contact || contact.organizationPartyId !== partyId) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const rows = await this.partyStore.listEndpointAssociations(session.organizationId, contactId);
      return {
        partyId,
        contactId,
        items: rows
          .filter((row) => row.partyId === partyId)
          .map((row) => ({
            associationId: row.id,
            channel: row.channel,
            numberMasked: maskContactNumber(row.numberE164),
            startedAt: row.startedAt.toISOString(),
            endedAt: row.endedAt ? row.endedAt.toISOString() : null,
            endReason: row.endReason,
            verificationMethod: row.verificationMethod,
          })),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId')
  async getParty(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const { session, ctx: queryCtx } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const roles = await this.partyStore.listActivePartyRoles(
        session.organizationId,
        partyId,
        session.effectiveAt,
      );
      const contactsPage = await this.partyStore.listContactsForOrgParty(
        session.organizationId,
        partyId,
        { limit: 25 },
      );
      const contacts = contactsPage.items;
      const contactsMeta = {
        limit: 25,
        hasMore: contactsPage.hasMore,
        nextCursor: contactsPage.nextCursor,
      };
      const commercialAccount = await this.partyStore.getCommercialAccountForParty(
        session.organizationId,
        partyId,
      );
      const asOf = session.effectiveAt ?? new Date();
      const coverageRows = await this.commercialStore.listActiveCustomerCoverageForParty({
        organizationId: session.organizationId,
        customerPartyId: partyId,
        asOf,
        includeScheduled: true,
      });
      const commercialAuthority = await this.accountAssignmentFlags(
        session.organizationId,
        session.actorMemberId,
        asOf,
        [...queryCtx.auth.roleKeys, ...queryCtx.auth.delegatedScopes],
        commercialAccount?.ownerMemberId ?? null,
        memberIndependentScopes(queryCtx.auth),
      );
      const coverageGrants = coverageRows.map((row) => ({
        grantId: row.id,
        actingAdvisorMemberId: row.actingAdvisorMemberId,
        primaryOwnerMemberId: row.primaryOwnerMemberId,
        coveredActions: [...row.coveredActions],
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt?.toISOString() ?? null,
        status: row.startsAt > asOf ? ('scheduled' as const) : ('active' as const),
        recordedByMemberId: row.recordedByMemberId,
        canRevoke: commercialAuthority.canRevokeCoverage,
      }));
      // Deprecated: the first active grant only. Removed when the customer page reads coverageGrants.
      const firstActive = coverageRows.filter((row) => row.startsAt <= asOf);
      const activeCoverage = firstActive[0]
        ? {
            grantId: firstActive[0].id,
            primaryOwnerMemberId: firstActive[0].primaryOwnerMemberId,
            actingAdvisorMemberId: firstActive[0].actingAdvisorMemberId,
            startsAt: firstActive[0].startsAt.toISOString(),
            endsAt: firstActive[0].endsAt?.toISOString() ?? null,
            recordedByMemberId: firstActive[0].recordedByMemberId,
            coveredActions: [...firstActive[0].coveredActions],
          }
        : null;
      const customerAuthority = await customerAuthorityFlags({
        store: this.partyStore,
        ctx: session,
        snap: queryCtx.auth,
        partyId,
        partyStatus: party.status,
      });
      return {
        party: customerAuthority.canReadLegalName ? party : { ...party, legalName: null },
        customerAuthority,
        roles,
        contacts,
        contactsMeta,
        commercialAccount,
        activeCoverage,
        coverageGrants,
        commercialAuthority,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }
}

function followupItems(rows: ContactFollowupPreferenceRecord[]): ContactFollowupPreferenceItem[] {
  return FOLLOWUP_CHANNELS.map((channel) => {
    const row = rows.find((r) => r.channel === channel);
    return {
      channel,
      preference: row?.preference ?? null,
      source: row?.source ?? null,
      identityConfirmed: row?.identityConfirmed ?? false,
      version: row?.version ?? 0,
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  });
}
