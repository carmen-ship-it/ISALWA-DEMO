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
import { createId } from '@isalwa/ts-utils';
import { resolveSession } from './os-session';
import {
  OS_COMMAND_SERVICE,
  OS_LOCATION_COMMAND_SERVICE,
  OS_PARTY_COMMAND_SERVICE,
  OS_IMPORT_COMMAND_SERVICE,
  OS_STORE,
  OS_WORK_COMMAND_SERVICE,
  OS_COMMERCIAL_COMMAND_SERVICE,
  OS_COMMITMENT_COMMAND_SERVICE,
  OS_ISSUE_COMMAND_SERVICE,
  OS_PRODUCT_FEEDBACK_STORE,
  OS_DELIVERY_COMMAND_SERVICE,
} from './os-store.module';

function mapError(err: unknown): HttpException {
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const status =
    code === 'AUTH_REQUIRED' || code === 'PROVIDER_NOT_CONFIGURED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'PERMISSION_DENIED' || code === 'TENANT_FORBIDDEN' || code === 'ACCESS_REVOKED'
        ? HttpStatus.FORBIDDEN
        : code === 'NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : code === 'IMPORT_DISABLED'
            ? HttpStatus.FORBIDDEN
          : code === 'VALIDATION_FAILED' || code === 'CONFLICT'
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
        return await this.deliveryCommands.execute(command, session, parsed.data as Record<string, unknown>);
      }
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    } catch (err) {
      throw mapError(err);
    }
  }
}
