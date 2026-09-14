import type { Request } from 'express';
import {
  resolveTrustedMemberContext,
  type ResolveTrustedMemberContextInput,
  type TrustedContextResult,
  type TrustedMembershipReader,
} from '@isalwa/os-domain';
import { resolveAuthenticatedProviderSubject } from './os-session';

type TrustedContextStore = TrustedMembershipReader &
  Parameters<typeof resolveAuthenticatedProviderSubject>[1];

function claimedFromRequest(req: Request): Pick<
  ResolveTrustedMemberContextInput,
  'organizationId' | 'grantedScopes' | 'cargo' | 'title'
> {
  const queryOrg = typeof req.query?.organizationId === 'string' ? req.query.organizationId : null;
  const body = req.body as
    | {
        organizationId?: unknown;
        grantedScopes?: unknown;
        scopes?: unknown;
        cargo?: unknown;
        title?: unknown;
      }
    | undefined;
  const bodyOrg = typeof body?.organizationId === 'string' ? body.organizationId : null;
  const headerOrg = req.header('x-os-organization-id');
  const claimedScopes = Array.isArray(body?.grantedScopes)
    ? body.grantedScopes.filter((scope): scope is string => typeof scope === 'string')
    : Array.isArray(body?.scopes)
      ? body.scopes.filter((scope): scope is string => typeof scope === 'string')
      : null;

  return {
    organizationId: headerOrg ?? queryOrg ?? bodyOrg,
    grantedScopes: claimedScopes,
    cargo: typeof body?.cargo === 'string' ? body.cargo : null,
    title: typeof body?.title === 'string' ? body.title : null,
  };
}

/**
 * Builds the one trusted member context for a live API request.
 *
 * The provider subject comes from the existing session proof. Client
 * organizationId, scope arrays, cargo, and title are forwarded only so the
 * shared resolver can ignore them. This helper does not attach the context
 * onto the Express request for other routes.
 */
export async function loadTrustedMemberContextFromRequest(
  req: Request,
  store: TrustedContextStore,
): Promise<TrustedContextResult> {
  const subject = await resolveAuthenticatedProviderSubject(req, store);
  return resolveTrustedMemberContext(store, {
    provider: subject.provider,
    providerSubject: subject.providerSubject,
    ...claimedFromRequest(req),
  });
}
