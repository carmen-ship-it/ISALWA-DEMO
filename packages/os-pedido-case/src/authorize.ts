/**
 * Exact assigned scopes. A sibling scope, people.admin, cargo, and title do not unlock.
 * commercial.org.read is not this read.
 */
export const PEDIDO_READ_SCOPES = ['commercial.team.read', 'management.org.read'] as const;

export type PedidoReadScope = (typeof PEDIDO_READ_SCOPES)[number];

/**
 * Server session only. organizationId is the tenant.
 * Do not pass a client organizationId. Extra fields are ignored.
 */
export type PedidoTrustedContext = {
  organizationId: string;
  actorMemberId: string;
  grantedScopes: readonly string[];
  /** Display only. Never authorizes this read. */
  cargo?: string | null;
  title?: string | null;
};

export type PedidoAccess =
  | { ok: true; organizationId: string; actorMemberId: string }
  | { ok: false; reason: 'context_required' | 'role_forbidden' };

function exactScope(value: string): string {
  return value.trim();
}

export function hasExactPedidoRead(grantedScopes: readonly string[] | null | undefined): boolean {
  if (!grantedScopes) return false;
  return grantedScopes.some((scope) => {
    const held = exactScope(scope);
    return (PEDIDO_READ_SCOPES as readonly string[]).includes(held);
  });
}

/**
 * Cargo and title are accepted so a caller can prove they do not unlock.
 * They are never compared to a scope.
 */
export function authorizePedidoRead(trustedContext: PedidoTrustedContext | null | undefined): PedidoAccess {
  if (!trustedContext) return { ok: false, reason: 'context_required' };
  const organizationId = trustedContext.organizationId?.trim() ?? '';
  const actorMemberId = trustedContext.actorMemberId?.trim() ?? '';
  if (!organizationId || !actorMemberId) return { ok: false, reason: 'context_required' };
  void trustedContext.cargo;
  void trustedContext.title;
  if (!hasExactPedidoRead(trustedContext.grantedScopes)) {
    return { ok: false, reason: 'role_forbidden' };
  }
  return { ok: true, organizationId, actorMemberId };
}
