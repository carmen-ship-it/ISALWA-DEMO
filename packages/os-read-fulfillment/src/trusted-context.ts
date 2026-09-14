/**
 * Organization comes only from trusted context. A client-supplied organization
 * id is ignored. A missing trusted organization is a denial, not a fallback
 * to the resource organization.
 */
export type TrustedReadContext = {
  organizationId: string | null | undefined;
  actorMemberId: string;
  grantedScopes: readonly string[] | null | undefined;
};

export type ClientReadFields = {
  organizationId?: unknown;
  grantedScopes?: unknown;
  orderId?: string | null;
  id?: string | null;
  caseId?: string | null;
};

export type TrustedOrganization =
  | { ok: true; organizationId: string }
  | { ok: false; code: 'AUTH_REQUIRED' };

export function trustedOrganization(ctx: TrustedReadContext): TrustedOrganization {
  const organizationId = typeof ctx.organizationId === 'string' ? ctx.organizationId.trim() : '';
  if (!organizationId) return { ok: false, code: 'AUTH_REQUIRED' };
  return { ok: true, organizationId };
}

export function optionalId(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
