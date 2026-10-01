/**
 * Tenant-scoped list of company-entered OsCustomerConversation rows.
 * Not the legacy messaging GET /conversations shape (apps/api).
 * Recording WhatsApp as a channel label does not connect a provider.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CUSTOMER_CONVERSATION_PROVENANCE,
  CUSTOMER_CONVERSATION_SOURCE,
  WHATSAPP_NUMBER_PENDING,
  recordManualCustomerConversation,
  type CustomerConversationAdmission,
  type ManualCustomerConversation,
  type CustomerConversationChannel,
  type RecordCustomerConversationInput,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { createId } from '@isalwa/ts-utils';
import { OS_STORE } from './os-store.module';

function toManual(row: {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel: string | null;
  channel: string;
  occurredAt: Date;
  enteredByMemberId: string | null;
  enteredByLabel: string;
  summary: string;
  pastedEvidence: string | null;
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
  customerQuestion: string | null;
  commitmentCandidate: string | null;
  possibleRequestedDate: Date | null;
  nextAction: string | null;
}): ManualCustomerConversation | null {
  const channel = row.channel === 'whatsapp' || row.channel === 'manual'
    ? (row.channel as CustomerConversationChannel)
    : null;
  if (!channel) return null;
  const admitted = recordManualCustomerConversation({
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    customerLabel: row.customerLabel,
    contactLabel: row.contactLabel,
    channel,
    occurredAt: row.occurredAt.toISOString(),
    enteredByMemberId: row.enteredByMemberId,
    enteredByLabel: row.enteredByLabel,
    summary: row.summary,
    pastedEvidence: row.pastedEvidence,
    opportunityId: row.opportunityId,
    quoteId: row.quoteId,
    orderId: row.orderId,
    customerQuestion: row.customerQuestion,
    commitmentCandidate: row.commitmentCandidate,
    possibleRequestedDate: row.possibleRequestedDate
      ? row.possibleRequestedDate.toISOString().slice(0, 10)
      : null,
    nextAction: row.nextAction,
  });
  return admitted.ok ? admitted.record : null;
}

function prismaCreateFromManual(record: ManualCustomerConversation, createdAtIso: string) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    customerId: record.customerId,
    customerLabel: record.customerLabel,
    contactLabel: record.contactLabel,
    channel: record.channel,
    occurredAt: new Date(record.occurredAt),
    enteredByMemberId: record.enteredByMemberId,
    enteredByLabel: record.enteredByLabel,
    summary: record.summary,
    pastedEvidence: record.pastedEvidence,
    opportunityId: record.opportunityId,
    quoteId: record.quoteId,
    orderId: record.orderId,
    customerQuestion: record.customerQuestion,
    commitmentCandidate: record.commitmentCandidate,
    possibleRequestedDate: record.possibleRequestedDate
      ? new Date(`${record.possibleRequestedDate}T00:00:00.000Z`)
      : null,
    nextAction: record.nextAction,
    source: record.source ?? CUSTOMER_CONVERSATION_SOURCE,
    provenance: record.provenance ?? CUSTOMER_CONVERSATION_PROVENANCE,
    advisorNumberStatus: record.advisorNumberStatus ?? WHATSAPP_NUMBER_PENDING,
    createdAt: new Date(createdAtIso),
  };
}

/**
 * Admits a conversation using only what the server knows. The client chooses the
 * customer, channel, time and content. The record id, tenant, the member who
 * entered it and that member's label come from the session / server and are never
 * read from the request body.
 */
export function admitSessionConversation(input: {
  body: unknown;
  session: { organizationId: string; actorMemberId?: string | null };
  /** Display label of the authenticated member, resolved server-side. */
  enteredByLabel: string;
  /** Canonical customer label from the Party record in this tenant. */
  customerLabel: string;
  id: string;
}): CustomerConversationAdmission {
  const actorMemberId = input.session.actorMemberId?.trim();
  if (!actorMemberId) return { ok: false, reason: 'missing_entered_by' };

  const draft =
    input.body && typeof input.body === 'object' && !Array.isArray(input.body)
      ? (input.body as RecordCustomerConversationInput)
      : ({} as RecordCustomerConversationInput);

  return recordManualCustomerConversation({
    ...draft,
    id: input.id,
    organizationId: input.session.organizationId,
    customerLabel: input.customerLabel,
    enteredByMemberId: actorMemberId,
    enteredByLabel: input.enteredByLabel,
  });
}

/**
 * Who may see a stored conversation. Company membership is not enough.
 * An organization reader sees the tenant. Otherwise the member who entered it,
 * the customer-account owner, or a team lead of that owner.
 */
export function memberCanSeeConversation(input: {
  actorMemberId: string;
  grantedScopes: readonly string[];
  enteredByMemberId: string | null;
  accountOwnerMemberId: string | null;
  directReportMemberIds: readonly string[];
}): boolean {
  if (
    input.grantedScopes.includes('people.admin') ||
    input.grantedScopes.includes('commercial.org.read')
  ) {
    return true;
  }
  if (input.enteredByMemberId && input.enteredByMemberId === input.actorMemberId) return true;
  if (input.accountOwnerMemberId && input.accountOwnerMemberId === input.actorMemberId) return true;
  return (
    input.grantedScopes.includes('commercial.team.read') &&
    !!input.accountOwnerMemberId &&
    input.directReportMemberIds.includes(input.accountOwnerMemberId)
  );
}

/**
 * A supplied opportunity, quote, or order must exist in this company, belong to
 * the same customer, and be readable by this actor. A missing record and a
 * record in another company are the same denial, so the response does not
 * reveal which one it was.
 */
export function commercialLinkDenial(input: {
  record: { organizationId: string; partyId: string; ownerMemberId: string | null } | null;
  sessionOrganizationId: string;
  customerId: string;
  actorMemberId: string;
  grantedScopes: readonly string[];
  directReportMemberIds: readonly string[];
}): 'not_found' | 'wrong_customer' | 'not_allowed' | null {
  if (!input.record || input.record.organizationId !== input.sessionOrganizationId) return 'not_found';
  if (input.record.partyId !== input.customerId) return 'wrong_customer';
  const allowed = memberCanSeeConversation({
    actorMemberId: input.actorMemberId,
    grantedScopes: input.grantedScopes,
    enteredByMemberId: null,
    accountOwnerMemberId: input.record.ownerMemberId,
    directReportMemberIds: input.directReportMemberIds,
  });
  return allowed ? null : 'not_allowed';
}

@Controller('customer-conversations')
export class CustomerConversationsController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get()
  async listCustomerConversations(
    @Query('partyId') partyId: string | undefined,
    @Req() req: Request,
  ): Promise<{ items: ManualCustomerConversation[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException('Database unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const customerId = partyId?.trim() || undefined;
      const rows = await prisma.osCustomerConversation.findMany({
        where: {
          organizationId: session.organizationId,
          ...(customerId ? { customerId } : {}),
        },
        orderBy: { occurredAt: 'desc' },
      });

      const customerIds = [...new Set(rows.map((row) => row.customerId))];
      const accounts = customerIds.length
        ? await prisma.osCommercialAccount.findMany({
            where: { organizationId: session.organizationId, partyId: { in: customerIds } },
            select: { partyId: true, ownerMemberId: true },
          })
        : [];
      const ownerByCustomer = new Map(accounts.map((account) => [account.partyId, account.ownerMemberId]));
      const reports = session.grantedScopes.includes('commercial.team.read')
        ? await this.workforceStore.listActiveDirectReportAssignments(
            session.organizationId,
            session.actorMemberId,
            new Date(),
          )
        : [];
      const directReportMemberIds = reports.map((report) => report.memberId);

      const items: ManualCustomerConversation[] = [];
      for (const row of rows) {
        if (
          !memberCanSeeConversation({
            actorMemberId: session.actorMemberId,
            grantedScopes: session.grantedScopes,
            enteredByMemberId: row.enteredByMemberId,
            accountOwnerMemberId: ownerByCustomer.get(row.customerId) ?? null,
            directReportMemberIds,
          })
        ) {
          continue;
        }
        const record = toManual(row);
        if (record) items.push(record);
      }
      return { items };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Unable to list conversations';
      throw new HttpException(message, HttpStatus.FORBIDDEN);
    }
  }

  @Post()
  async createCustomerConversation(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ item: ManualCustomerConversation }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException('Database unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const customerId =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as { customerId?: unknown }).customerId
          : undefined;
      const requestedCustomerId = typeof customerId === 'string' ? customerId.trim() : '';
      if (!requestedCustomerId) {
        throw new HttpException('Invalid conversation: missing_customer', HttpStatus.BAD_REQUEST);
      }
      // The customer must be a Party of the session tenant. Label comes from that record.
      const party = await prisma.osParty.findFirst({
        where: { id: requestedCustomerId, organizationId: session.organizationId },
        select: { displayName: true },
      });
      if (!party) {
        throw new HttpException('Invalid conversation: unknown_customer', HttpStatus.BAD_REQUEST);
      }

      const reports = session.grantedScopes.includes('commercial.team.read')
        ? await this.workforceStore.listActiveDirectReportAssignments(
            session.organizationId,
            session.actorMemberId,
            new Date(),
          )
        : [];
      const directReportMemberIds = reports.map((report) => report.memberId);
      const draft =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {};
      const linkLookups: Array<['opportunityId' | 'quoteId' | 'orderId', Promise<{ organizationId: string; partyId: string; ownerMemberId: string | null } | null>]> = [];
      const opportunityId = typeof draft.opportunityId === 'string' ? draft.opportunityId.trim() : '';
      const quoteId = typeof draft.quoteId === 'string' ? draft.quoteId.trim() : '';
      const orderId = typeof draft.orderId === 'string' ? draft.orderId.trim() : '';
      if (opportunityId) {
        linkLookups.push(['opportunityId', prisma.osOpportunity.findFirst({ where: { id: opportunityId }, select: { organizationId: true, partyId: true, ownerMemberId: true } })]);
      }
      if (quoteId) {
        linkLookups.push(['quoteId', prisma.osQuote.findFirst({ where: { id: quoteId }, select: { organizationId: true, partyId: true, ownerMemberId: true } })]);
      }
      if (orderId) {
        linkLookups.push(['orderId', prisma.osOrder.findFirst({ where: { id: orderId }, select: { organizationId: true, partyId: true, ownerMemberId: true } })]);
      }
      for (const [, lookup] of linkLookups) {
        const denial = commercialLinkDenial({
          record: await lookup,
          sessionOrganizationId: session.organizationId,
          customerId: requestedCustomerId,
          actorMemberId: session.actorMemberId,
          grantedScopes: session.grantedScopes,
          directReportMemberIds,
        });
        if (denial) {
          throw new HttpException(`Invalid conversation: ${denial}`, HttpStatus.BAD_REQUEST);
        }
      }

      const idempotencyKey = req.header('idempotency-key')?.trim();
      if (idempotencyKey) {
        const prior = await prisma.osIdempotencyKey.findUnique({
          where: { organizationId_key: { organizationId: session.organizationId, key: idempotencyKey } },
        });
        const stored = prior?.resultJson as { actorMemberId?: string; conversationId?: string } | null;
        if (stored?.conversationId) {
          if (stored.actorMemberId !== session.actorMemberId) {
            throw new HttpException('CONFLICT', HttpStatus.CONFLICT);
          }
          const existing = await prisma.osCustomerConversation.findFirst({
            where: { id: stored.conversationId, organizationId: session.organizationId },
          });
          const replay = existing ? toManual(existing) : null;
          if (replay) return { item: replay };
        }
      }

      const person = await prisma.osPerson.findUnique({
        where: { id: session.personId },
        select: { givenName: true, familyName: true },
      });
      const enteredByLabel =
        [person?.givenName, person?.familyName].filter(Boolean).join(' ').trim() ||
        'Miembro del equipo';

      const admitted = admitSessionConversation({
        body,
        session,
        enteredByLabel,
        customerLabel: party.displayName,
        id: createId(),
      });
      if (!admitted.ok) {
        throw new HttpException(`Invalid conversation: ${admitted.reason}`, HttpStatus.BAD_REQUEST);
      }
      if (admitted.record.organizationId !== session.organizationId) {
        throw new HttpException('Invalid tenant', HttpStatus.FORBIDDEN);
      }

      const data = prismaCreateFromManual(admitted.record, new Date().toISOString());
      await prisma.osCustomerConversation.create({ data });
      if (idempotencyKey) {
        await prisma.osIdempotencyKey.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            key: idempotencyKey,
            commandName: 'RecordCustomerConversation',
            resultJson: { actorMemberId: session.actorMemberId, conversationId: admitted.record.id },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
      return { item: admitted.record };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Unable to create conversation';
      throw new HttpException(message, HttpStatus.FORBIDDEN);
    }
  }
}
