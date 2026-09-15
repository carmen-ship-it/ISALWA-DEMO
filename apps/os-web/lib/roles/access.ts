import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  canAuthorizePaymentException,
  continueCoveredCustomerWorkflow,
  hasAssignedOperationsScope,
  scopesGrantedByCargoOrTitle,
  type CustomerCoverageGrant,
} from '@isalwa/os-contracts';

/** Existing explicit scopes for an advisor's own commercial work. Not cargo. */
export const COMMERCIAL_OWN_WORK_SCOPES = [
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
] as const;

export type Visibility = 'own' | 'team' | 'org';

export type RoleSession = {
  organizationId: string | null | undefined;
  actorMemberId: string | null | undefined;
  grantedScopes: readonly string[];
  coverageGrants?: readonly CustomerCoverageGrant[];
  asOf?: Date;
};

export type CommercialRow = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  partyId: string | null;
  visibility: Visibility;
};

export type AccessDenial = 'missing-organization' | 'unauthorized-role';

export function requireSessionOrganization(
  session: RoleSession | null | undefined,
): string | null {
  const organizationId = session?.organizationId?.trim() ?? '';
  return organizationId || null;
}

/** Cargo and title are ignored. Callers must pass an explicit grant list. */
export function scopesFromAssignment(
  grantedScopes: readonly string[],
  cargo?: string | null,
  title?: string | null,
): readonly string[] {
  void scopesGrantedByCargoOrTitle(cargo, title);
  return grantedScopes;
}

export function hasCommercialOwnWorkScope(grantedScopes: readonly string[]): boolean {
  return COMMERCIAL_OWN_WORK_SCOPES.some((scope) =>
    hasAssignedOperationsScope(grantedScopes, scope),
  );
}

export function hasTeamCommercialRead(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, COMMERCIAL_TEAM_READ_SCOPE);
}

export function hasCompanyCommercialRead(grantedScopes: readonly string[]): boolean {
  return (
    hasAssignedOperationsScope(grantedScopes, MANAGEMENT_ORG_READ_SCOPE) ||
    hasAssignedOperationsScope(grantedScopes, COMMERCIAL_ORG_READ_SCOPE)
  );
}

export function hasCommercialSearchScope(grantedScopes: readonly string[]): boolean {
  return (
    hasCommercialOwnWorkScope(grantedScopes) ||
    hasTeamCommercialRead(grantedScopes) ||
    hasCompanyCommercialRead(grantedScopes)
  );
}

export function mayAuthorizePaymentException(grantedScopes: readonly string[]): boolean {
  return canAuthorizePaymentException(grantedScopes);
}

export function paymentExceptionScope(): typeof COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE {
  return COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE;
}

export function sameTenant(
  session: RoleSession | null | undefined,
  organizationId: string | null | undefined,
): boolean {
  const tenant = requireSessionOrganization(session);
  const rowTenant = organizationId?.trim() ?? '';
  return Boolean(tenant && rowTenant && tenant === rowTenant);
}

export function coversCustomer(
  session: RoleSession,
  partyId: string | null | undefined,
  primaryOwnerMemberId: string | null | undefined,
): boolean {
  const actorMemberId = session.actorMemberId?.trim() ?? '';
  const organizationId = requireSessionOrganization(session);
  const customerPartyId = partyId?.trim() ?? '';
  const owner = primaryOwnerMemberId?.trim() ?? '';
  if (!actorMemberId || !organizationId || !customerPartyId || !owner) return false;
  return continueCoveredCustomerWorkflow({
    actorMemberId,
    organizationId,
    customerPartyId,
    primaryOwnerMemberId: owner,
    grants: session.coverageGrants ?? [],
    asOf: session.asOf ?? new Date(),
  }).allowed;
}

export function asesorMaySee(session: RoleSession, row: CommercialRow): boolean {
  if (!hasCommercialOwnWorkScope(session.grantedScopes)) return false;
  if (!sameTenant(session, row.organizationId)) return false;
  const actor = session.actorMemberId?.trim() ?? '';
  if (!actor) return false;
  if (row.ownerMemberId.trim() === actor) return true;
  return coversCustomer(session, row.partyId, row.ownerMemberId);
}

export function jefeMaySee(session: RoleSession, row: CommercialRow): boolean {
  if (!hasTeamCommercialRead(session.grantedScopes)) return false;
  if (!sameTenant(session, row.organizationId)) return false;
  const actor = session.actorMemberId?.trim() ?? '';
  return row.visibility === 'team' || (Boolean(actor) && row.ownerMemberId.trim() === actor);
}

export function gerenteMaySeeCommercial(session: RoleSession, row: CommercialRow): boolean {
  if (!hasCompanyCommercialRead(session.grantedScopes)) return false;
  if (!sameTenant(session, row.organizationId)) return false;
  return row.visibility === 'org' || row.visibility === 'team';
}

export const DEPARTMENT_LENSES = [
  {
    id: 'produccion',
    kicker: 'Producción',
    title: 'Qué espera producción',
    description: 'El siguiente paso está en producción. Esta lectura no edita el registro.',
    href: '/produccion',
    action: 'Abrir producción',
    scopes: [PRODUCTION_OPERATIONAL_RECORD_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE],
  },
  {
    id: 'almacen',
    kicker: 'Almacén',
    title: 'Qué espera almacén',
    description: 'Producto terminado y salida. Esta lectura no inventa existencia.',
    href: '/almacen',
    action: 'Abrir almacén',
    scopes: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE],
  },
  {
    id: 'compras',
    kicker: 'Compras',
    title: 'Qué espera compras',
    description: 'Solicitudes pendientes de registro. Esta lectura no edita la compra.',
    href: '/compras',
    action: 'Abrir compras',
    scopes: [PURCHASING_OPERATIONAL_RECORD_SCOPE],
  },
  {
    id: 'contabilidad',
    kicker: 'Contabilidad',
    title: 'Qué espera el registro operativo',
    description: 'No es un libro contable. Solo el siguiente paso operativo.',
    href: '/finanzas',
    action: 'Abrir el registro operativo',
    scopes: [FINANCE_OPERATIONAL_RECORD_SCOPE],
  },
  {
    id: 'auxiliar',
    kicker: 'Auxiliar',
    title: 'Qué espera coordinación',
    description: 'Coordinación de lo que ya está registrado. Esta lectura no confirma finanzas.',
    href: '/coordinacion',
    action: 'Abrir coordinación',
    scopes: [OPERATIONS_COORDINATOR_RECORD_SCOPE],
  },
] as const;

export function departmentLensAllowed(
  grantedScopes: readonly string[],
  scopes: readonly string[],
): boolean {
  return scopes.some((scope) => hasAssignedOperationsScope(grantedScopes, scope));
}

export function systemControlsAllowed(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, SYSTEM_ADMIN_SCOPE);
}
