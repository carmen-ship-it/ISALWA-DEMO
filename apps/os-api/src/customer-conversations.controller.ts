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
  type ManualCustomerConversation,
  type CustomerConversationChannel,
  type RecordCustomerConversationInput,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
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

      const items: ManualCustomerConversation[] = [];
      for (const row of rows) {
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

      const draft =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as RecordCustomerConversationInput)
          : ({} as RecordCustomerConversationInput);

      const admitted = recordManualCustomerConversation({
        ...draft,
        organizationId: session.organizationId,
        enteredByMemberId: draft.enteredByMemberId ?? session.actorMemberId ?? null,
      });
      if (!admitted.ok) {
        throw new HttpException(`Invalid conversation: ${admitted.reason}`, HttpStatus.BAD_REQUEST);
      }
      if (admitted.record.organizationId !== session.organizationId) {
        throw new HttpException('Invalid tenant', HttpStatus.FORBIDDEN);
      }

      const data = prismaCreateFromManual(admitted.record, new Date().toISOString());
      await prisma.osCustomerConversation.create({ data });
      return { item: admitted.record };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Unable to create conversation';
      throw new HttpException(message, HttpStatus.FORBIDDEN);
    }
  }
}
