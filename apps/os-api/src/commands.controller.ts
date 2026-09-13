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
  WORK_COMMAND_NAMES,
  WORKFORCE_COMMAND_NAMES,
  COMMERCIAL_COMMAND_NAMES,
  type PartyCommandName,
  type WorkCommandName,
  type WorkforceCommandName,
  type CommercialCommandName,
} from '@isalwa/os-contracts';
import type { PartyCommandService } from '@isalwa/os-party';
import type { WorkCommandService } from '@isalwa/os-work';
import type { CommercialCommandService } from '@isalwa/os-commercial';
import type { OsWorkforceStore, WorkforceCommandService } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import {
  OS_COMMAND_SERVICE,
  OS_PARTY_COMMAND_SERVICE,
  OS_STORE,
  OS_WORK_COMMAND_SERVICE,
  OS_COMMERCIAL_COMMAND_SERVICE,
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

function isWorkCommand(command: OsCommandName): command is WorkCommandName {
  return (WORK_COMMAND_NAMES as readonly string[]).includes(command);
}

function isCommercialCommand(command: OsCommandName): command is CommercialCommandName {
  return (COMMERCIAL_COMMAND_NAMES as readonly string[]).includes(command);
}

@Controller('commands')
export class CommandsController {
  constructor(
    @Inject(OS_COMMAND_SERVICE) private readonly workforceCommands: WorkforceCommandService,
    @Inject(OS_PARTY_COMMAND_SERVICE) private readonly partyCommands: PartyCommandService,
    @Inject(OS_WORK_COMMAND_SERVICE) private readonly workCommands: WorkCommandService,
    @Inject(OS_COMMERCIAL_COMMAND_SERVICE) private readonly commercialCommands: CommercialCommandService,
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
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    } catch (err) {
      throw mapError(err);
    }
  }
}
