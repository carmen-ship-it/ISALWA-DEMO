import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  COMMAND_PAYLOAD_SCHEMAS,
  type OsCommandName,
  OS_COMMAND_NAMES,
  PARTY_COMMAND_NAMES,
  LOCATION_COMMAND_NAMES,
  WORK_COMMAND_NAMES,
  WORKFORCE_COMMAND_NAMES,
  COMMERCIAL_COMMAND_NAMES,
  IMPORT_COMMAND_NAMES,
  COMMITMENT_COMMAND_NAMES,
  ISSUE_COMMAND_NAMES,
  PRODUCT_FEEDBACK_COMMAND_NAMES,
  DELIVERY_COMMAND_NAMES,
  FINISHED_GOODS_COMMAND_NAMES,
  type PartyCommandName,
  type LocationCommandName,
  type ImportCommandName,
  type WorkCommandName,
  type WorkforceCommandName,
  type CommercialCommandName,
  type CommitmentCommandName,
  type IssueCommandName,
  type ProductFeedbackCommandName,
  type DeliveryCommandName,
  type FinishedGoodsCommandName,
  type ReceiveFinishedGoodsPayload,
  type AllocateFinishedGoodsPayload,
  ORDER_ALLOCATION_SOURCE,
} from '@isalwa/os-contracts';
import type { LocationCommandService, PartyCommandService } from '@isalwa/os-party';
import type { ImportCommandService } from '@isalwa/os-import';
import type { WorkCommandService } from '@isalwa/os-work';
import type { CommercialCommandService } from '@isalwa/os-commercial';
import type { CommitmentCommandService } from '@isalwa/os-commitment';
import type { IssueCommandService } from '@isalwa/os-issue';
import type { DeliveryCommandService } from '@isalwa/os-delivery';
import type { OsWorkforceStore, WorkforceCommandService } from '@isalwa/os-workforce';
import type { OsProductFeedbackStore } from '@isalwa/os-database';
import { getOsPrisma } from '@isalwa/os-database';
import {
  createPrismaFinishedGoodsWriteStore,
  receiveFinishedGoods,
} from '@isalwa/os-finished-goods';
import {
  allocateFinishedGoodsForSession,
  createPrismaOrderAllocationStore,
} from '@isalwa/os-allocation';
import { createId } from '@isalwa/ts-utils';
import { REPLAY_REVIEW_REQUIRED, REPLAY_REVIEW_REQUIRED_MESSAGE } from '@isalwa/os-events';
import { resolveSession } from './os-session';
import { enforceRequestRateLimit, type RateLimitCounter } from './request-rate-limit';
import {
  OS_COMMAND_SERVICE,
  OS_LOCATION_COMMAND_SERVICE,
  OS_PARTY_COMMAND_SERVICE,
  OS_IMPORT_COMMAND_SERVICE,
  OS_STORE,
  OS_RATE_LIMIT_COUNTER,
  OS_WORK_COMMAND_SERVICE,
  OS_COMMERCIAL_COMMAND_SERVICE,
  OS_COMMITMENT_COMMAND_SERVICE,
  OS_ISSUE_COMMAND_SERVICE,
  OS_PRODUCT_FEEDBACK_STORE,
  OS_DELIVERY_COMMAND_SERVICE,
} from './os-store.module';

function mapError(err: unknown): HttpException {
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  if (code === REPLAY_REVIEW_REQUIRED) {
    return new HttpException({ code, message: REPLAY_REVIEW_REQUIRED_MESSAGE }, HttpStatus.CONFLICT);
  }
  if (
    code === 'DUPLICATE_REVIEW_REQUIRED' ||
    code === 'IMPORT_PHONE_REVIEW_REQUIRED' ||
    code === 'ARCHIVE_BLOCKED_BY_OBLIGATIONS' ||
    code === 'IMPORT_DRY_RUN_OUTDATED' ||
    code === 'CORRECTION_EVIDENCE_INVALID' ||
    code === 'CORRECTION_VALUE_DIFFERS' ||
    code === 'COMMITMENT_CHANGED'
  ) {
    return new HttpException({ code }, HttpStatus.CONFLICT);
  }
  const status =
    code === 'AUTH_REQUIRED' || code === 'PROVIDER_NOT_CONFIGURED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'PERMISSION_DENIED' || code === 'TENANT_FORBIDDEN' || code === 'ACCESS_REVOKED'
        ? HttpStatus.FORBIDDEN
        : code === 'NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : code === 'IMPORT_DISABLED'
            ? HttpStatus.FORBIDDEN
          : code === 'VALIDATION_FAILED' || code === 'CONFLICT' || code === 'TARGET_PREREQUISITE_MISSING'
            ? HttpStatus.BAD_REQUEST
            : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}

function isWorkforceCommand(command: OsCommandName): command is WorkforceCommandName {
  return (WORKFORCE_COMMAND_NAMES as readonly string[]).includes(command);
}

function isPartyCommand(command: OsCommandName): command is PartyCommandName {
  return (PARTY_COMMAND_NAMES as readonly string[]).includes(command);
}

function isLocationCommand(command: OsCommandName): command is LocationCommandName {
  return (LOCATION_COMMAND_NAMES as readonly string[]).includes(command);
}

function isImportCommand(command: OsCommandName): command is ImportCommandName {
  return (IMPORT_COMMAND_NAMES as readonly string[]).includes(command);
}

function isWorkCommand(command: OsCommandName): command is WorkCommandName {
  return (WORK_COMMAND_NAMES as readonly string[]).includes(command);
}

function isCommercialCommand(command: OsCommandName): command is CommercialCommandName {
  return (COMMERCIAL_COMMAND_NAMES as readonly string[]).includes(command);
}

function isCommitmentCommand(command: OsCommandName): command is CommitmentCommandName {
  return (COMMITMENT_COMMAND_NAMES as readonly string[]).includes(command);
}

function isIssueCommand(command: OsCommandName): command is IssueCommandName {
  return (ISSUE_COMMAND_NAMES as readonly string[]).includes(command);
}

function isProductFeedbackCommand(command: OsCommandName): command is ProductFeedbackCommandName {
  return (PRODUCT_FEEDBACK_COMMAND_NAMES as readonly string[]).includes(command);
}

function isDeliveryCommand(command: OsCommandName): command is DeliveryCommandName {
  return (DELIVERY_COMMAND_NAMES as readonly string[]).includes(command);
}

function isFinishedGoodsCommand(command: OsCommandName): command is FinishedGoodsCommandName {
  return (FINISHED_GOODS_COMMAND_NAMES as readonly string[]).includes(command);
}

function mapReceiveDenial(reason: string): HttpException {
  if (reason === 'unauthorized' || reason === 'access_revoked') {
    return new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
  }
  if (reason === 'session_org_required') {
    return new HttpException({ code: 'AUTH_REQUIRED' }, HttpStatus.UNAUTHORIZED);
  }
  if (reason === 'not_found' || reason === 'citation_not_in_org' || reason === 'invalid_order_context') {
    return new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
  }
  if (reason === 'conflict') {
    return new HttpException({ code: 'CONFLICT' }, HttpStatus.BAD_REQUEST);
  }
  return new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
}

function mapAllocateDenial(reason: string): HttpException {
  if (
    reason === 'unauthorized_role' ||
    reason === 'permission_unconfirmed' ||
    reason === 'cross_tenant'
  ) {
    return new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
  }
  if (reason === 'no_session_org') {
    return new HttpException({ code: 'AUTH_REQUIRED' }, HttpStatus.UNAUTHORIZED);
  }
  if (reason === 'not_found') {
    return new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
  }
  if (reason === 'conflict' || reason === 'exceeds_available' || reason === 'missing_availability') {
    return new HttpException({ code: 'CONFLICT', reason }, HttpStatus.CONFLICT);
  }
  return new HttpException({ code: 'VALIDATION_FAILED', reason }, HttpStatus.BAD_REQUEST);
}

@Controller('commands')
export class CommandsController {
  constructor(
    @Inject(OS_COMMAND_SERVICE) private readonly workforceCommands: WorkforceCommandService,
    @Inject(OS_PARTY_COMMAND_SERVICE) private readonly partyCommands: PartyCommandService,
    @Inject(OS_LOCATION_COMMAND_SERVICE) private readonly locationCommands: LocationCommandService,
    @Inject(OS_IMPORT_COMMAND_SERVICE) private readonly importCommands: ImportCommandService,
    @Inject(OS_WORK_COMMAND_SERVICE) private readonly workCommands: WorkCommandService,
    @Inject(OS_COMMERCIAL_COMMAND_SERVICE) private readonly commercialCommands: CommercialCommandService,
    @Inject(OS_COMMITMENT_COMMAND_SERVICE) private readonly commitmentCommands: CommitmentCommandService,
    @Inject(OS_ISSUE_COMMAND_SERVICE) private readonly issueCommands: IssueCommandService,
    @Inject(OS_PRODUCT_FEEDBACK_STORE) private readonly feedbackStore: OsProductFeedbackStore,
    @Inject(OS_DELIVERY_COMMAND_SERVICE) private readonly deliveryCommands: DeliveryCommandService,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_RATE_LIMIT_COUNTER) private readonly rateLimits: RateLimitCounter,
  ) {}

  @Post(':commandName')
  async execute(
    @Param('commandName') commandName: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!OS_COMMAND_NAMES.includes(commandName as OsCommandName)) {
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    }
    const command = commandName as OsCommandName;
    const schema = COMMAND_PAYLOAD_SCHEMAS[command];
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    }

    try {
      const session = await resolveSession(req, this.workforceStore);
      await enforceRequestRateLimit(this.rateLimits, 'command', session);
      if (command === 'InviteMember') {
        await enforceRequestRateLimit(this.rateLimits, 'invitation', session);
      }
      if (isWorkforceCommand(command)) {
        return await this.workforceCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isPartyCommand(command)) {
        return await this.partyCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isLocationCommand(command)) {
        return await this.locationCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isImportCommand(command)) {
        return await this.importCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isWorkCommand(command)) {
        return await this.workCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isCommercialCommand(command)) {
        return await this.commercialCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isCommitmentCommand(command)) {
        return await this.commitmentCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isIssueCommand(command)) {
        return await this.issueCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isProductFeedbackCommand(command)) {
        // SubmitProductFeedback — member_active
        const payload = parsed.data as { content: string; category?: string; productRef?: string };
        const feedbackId = createId();
        await this.feedbackStore.insertFeedback({
          id: feedbackId,
          organizationId: session.organizationId,
          memberId: session.actorMemberId,
          route: payload.productRef ?? '',
          message: payload.content,
          entityType: payload.category ?? null,
          entityId: null,
          createdAt: session.effectiveAt,
        });
        return {
          commandId: feedbackId,
          correlationId: session.correlationId,
          data: { feedbackId },
        };
      }
      if (isDeliveryCommand(command)) {
        return await this.deliveryCommands.execute(
          command,
          session,
          parsed.data as Record<string, unknown>,
          idempotencyKey,
        );
      }
      if (isFinishedGoodsCommand(command) && command === 'ReceiveFinishedGoods') {
        // Physical FG receive — not allocate, not delivery (Agent 3).
        const prisma = getOsPrisma();
        if (!prisma) {
          throw new HttpException({ code: 'PROVIDER_NOT_CONFIGURED' }, HttpStatus.UNAUTHORIZED);
        }
        const payload = parsed.data as ReceiveFinishedGoodsPayload;
        const member = await this.workforceStore.getMemberInOrg(
          session.organizationId,
          session.actorMemberId,
        );
        if (!member || member.organizationId !== session.organizationId) {
          throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
        }
        const person = await this.workforceStore.getPerson(member.personId);
        const actorLabel =
          [person?.givenName, person?.familyName].filter(Boolean).join(' ').trim() || 'Almacén';
        const store = createPrismaFinishedGoodsWriteStore(
          prisma as unknown as Parameters<typeof createPrismaFinishedGoodsWriteStore>[0],
        );
        let result;
        try {
          result = await receiveFinishedGoods({
            session: {
              organizationId: session.organizationId,
              actorMemberId: session.actorMemberId,
              actorLabel,
              accessStatus: member.accessStatus,
              grantedScopes: session.grantedScopes,
            },
            store,
            command: {
              ...payload,
              receivedAt: payload.receivedAt ?? session.effectiveAt.toISOString(),
              idempotencyKey: idempotencyKey?.trim() || null,
              correlationId: session.correlationId,
            },
            now: session.effectiveAt,
            id: createId(),
          });
        } catch (err) {
          // Surface durable-write failures without dumping Prisma stacks to clients.
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            JSON.stringify({
              level: 'error',
              component: 'ReceiveFinishedGoods',
              organizationId: session.organizationId,
              message: message.slice(0, 500),
            }),
          );
          throw mapError(err);
        }
        if (!result.ok) {
          throw mapReceiveDenial(result.reason);
        }
        return {
          commandId: result.receipt.id,
          correlationId: session.correlationId,
          data: {
            receiptId: result.receipt.id,
            eventId: result.event.id,
            allocatesToOrder: false,
            postsStock: false,
            replayed: result.replayed,
            migrationApplied: result.migrationApplied,
          },
        };
      }
      if (isFinishedGoodsCommand(command) && command === 'AllocateFinishedGoods') {
        // Explicit Pedido assignment — not receive, not delivery, not official stock.
        const prisma = getOsPrisma();
        if (!prisma) {
          throw new HttpException({ code: 'PROVIDER_NOT_CONFIGURED' }, HttpStatus.UNAUTHORIZED);
        }
        const payload = parsed.data as AllocateFinishedGoodsPayload;
        const member = await this.workforceStore.getMemberInOrg(
          session.organizationId,
          session.actorMemberId,
        );
        if (!member || member.organizationId !== session.organizationId) {
          throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
        }
        const person = await this.workforceStore.getPerson(member.personId);
        const actorLabel =
          [person?.givenName, person?.familyName].filter(Boolean).join(' ').trim() || 'Almacén';
        const organizationId = session.organizationId;
        const nowIso = session.effectiveAt.toISOString();
        const receiptRows = await prisma.osFinishedGoodsReceipt.findMany({
          where: { organizationId, productId: payload.productId },
          orderBy: { receivedAt: 'asc' },
          take: 500,
        });
        const receipts = receiptRows.map((row) => ({
          organizationId: row.organizationId,
          productId: row.productId,
          quantity: row.quantity,
          receiptId: row.id,
        }));
        const store = createPrismaOrderAllocationStore(
          prisma as unknown as Parameters<typeof createPrismaOrderAllocationStore>[0],
        );
        const targets = {
          orderLineInOrg: async (orgId: string, orderLineId: string) => {
            const line = await prisma.osOrderLine.findFirst({
              where: { id: orderLineId, organizationId: orgId },
              select: { id: true, organizationId: true },
            });
            if (!line) return null;
            return { organizationId: line.organizationId, id: line.id };
          },
          receiptInOrg: async (orgId: string, receiptId: string) => {
            const receipt = await prisma.osFinishedGoodsReceipt.findFirst({
              where: { organizationId: orgId, id: receiptId },
              select: { id: true, organizationId: true },
            });
            if (!receipt) return null;
            return { organizationId: receipt.organizationId, id: receipt.id };
          },
        };
        let result;
        try {
          result = await allocateFinishedGoodsForSession(
            store,
            {
              organizationId,
              actorMemberId: session.actorMemberId,
              actorLabel,
              accessStatus: member.accessStatus,
              grantedScopes: session.grantedScopes,
            },
            {
              id: createId(),
              organizationId,
              productId: payload.productId,
              quantity: payload.quantity,
              orderLineId: payload.orderLineId,
              orderLineOrganizationId: organizationId,
              allocatedAt: nowIso,
              recordedAt: nowIso,
              actorMemberId: session.actorMemberId,
              actorLabel,
              source: ORDER_ALLOCATION_SOURCE,
              finishedGoodsReceiptId: payload.finishedGoodsReceiptId,
              finishedGoodsReceiptOrganizationId: payload.finishedGoodsReceiptId
                ? organizationId
                : null,
              receipts,
              idempotencyKey: idempotencyKey?.trim() || null,
            },
            targets,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            JSON.stringify({
              level: 'error',
              component: 'AllocateFinishedGoods',
              organizationId,
              message: message.slice(0, 500),
            }),
          );
          throw mapError(err);
        }
        if (!result.ok) {
          throw mapAllocateDenial(result.reason);
        }
        return {
          commandId: result.allocation.id,
          correlationId: session.correlationId,
          data: {
            allocationId: result.allocation.id,
            orderLineId: result.allocation.orderLineId,
            quantity: result.allocation.quantity,
            officialStock: false,
            postsStock: false,
            liveWrite: result.liveWrite,
            tenantProof: result.tenantProof,
          },
        };
      }
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw mapError(err);
    }
  }
}
