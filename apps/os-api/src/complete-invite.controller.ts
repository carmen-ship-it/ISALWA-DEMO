import { Controller, HttpException, Inject, Post, Req } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';
import { completeInvitedAccess, type OsWorkforceStore, type WorkforceCommandService } from '@isalwa/os-workforce';
import { decideInviteCompletionHttp, inviteCompletionHttpBody, inviteCompletionHttpStatus } from './complete-invite';
import { OS_COMMAND_SERVICE, OS_STORE } from './os-store.module';

/**
 * Completes an invitation from a trusted provider session.
 * Query, body, and client member/org/subject fields are not authority.
 */
@Controller('auth')
export class CompleteInviteController {
  constructor(
    @Inject(OS_STORE) private readonly store: OsWorkforceStore,
    @Inject(OS_COMMAND_SERVICE) private readonly commands: WorkforceCommandService,
  ) {}

  @Post('complete-invite')
  async complete(@Req() req: Request) {
    const verified = await verifyProviderUser(req.header('authorization'));
    const decision = decideInviteCompletionHttp(verified, req.body);
    if (!decision.ok) {
      throw new HttpException({ code: decision.code }, decision.status);
    }

    try {
      const result = await completeInvitedAccess(
        this.store,
        this.commands,
        {
          provider: 'supabase',
          providerSubject: decision.providerSubject,
          verifiedEmail: decision.verifiedEmail,
        },
        new Date(),
      );
      const status = inviteCompletionHttpStatus(result.code);
      const body = inviteCompletionHttpBody(result.code);
      if (status !== 200) {
        throw new HttpException(body, status);
      }
      return body;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException({ code: 'INTERNAL_ERROR' }, 500);
    }
  }
}

async function verifyProviderUser(
  authorization: string | undefined,
): Promise<{ id: string; email: string | null; emailConfirmedAt: string | null } | null> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    emailConfirmedAt: data.user.email_confirmed_at ?? data.user.confirmed_at ?? null,
  };
}
