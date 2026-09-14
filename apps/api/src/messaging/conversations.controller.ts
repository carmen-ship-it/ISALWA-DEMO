import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import {
  sessionFromAuthenticatedRequest,
  type AuthenticatedTenantRequest,
} from '../auth/trusted-session';
import {
  listConversations,
  readConversation,
  type ConversationListResult,
  type ConversationOneResult,
  type ConversationReadDb,
} from './conversations-query';

export type { ConversationListResult, ConversationOneResult, ConversationReadDb };
export { CONVERSATION_READ_CAPABILITY } from './conversations-query';

export type ConversationHttpRequest = AuthenticatedTenantRequest & {
  headers?: Record<string, string | undefined>;
  readDb?: ConversationReadDb | null;
};

function resolveDb(req: ConversationHttpRequest | undefined): ConversationReadDb | null {
  if (req && Object.prototype.hasOwnProperty.call(req, 'readDb')) return req.readDb ?? null;
  return getPrisma() as unknown as ConversationReadDb | null;
}

@Controller('conversations')
export class ConversationsController {
  /**
   * Client organizationId, q, email, and name are not inputs.
   * The session is taken only from an already-authenticated request.
   */
  @Get()
  async list(
    @Query('take') take?: string,
    @Req() req?: ConversationHttpRequest,
  ): Promise<ConversationListResult> {
    const session = sessionFromAuthenticatedRequest(req);
    return listConversations({
      take,
      session,
      db: () => resolveDb(req),
    });
  }

  @Get(':id')
  async one(
    @Param('id') id: string,
    @Req() req?: ConversationHttpRequest,
  ): Promise<ConversationOneResult> {
    const session = sessionFromAuthenticatedRequest(req);
    return readConversation({
      id,
      session,
      db: () => resolveDb(req),
    });
  }
}
