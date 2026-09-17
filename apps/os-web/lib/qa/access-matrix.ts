import {
  ISSUE_MANAGE_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  canReassignCommercialAccountOwner,
  canRecordCoordinatorWork,
  canRecordDelivery,
  canRecordOperationalFinance,
  canRecordProduction,
  canRecordPurchasing,
  canRecordWarehouseOutbound,
  canReceiveFinishedGoods,
  hasAssignedOperationsScope,
} from '@isalwa/os-contracts';
import { hasMasterDataAdminScope } from '@/lib/party/customer-self-service';
import { PRIMARY_NAV, primaryNavIds } from '@/lib/navigation/nav-config';
import { mayOpenSystemControls } from '@/lib/roles/system-controls';
import {
  canEnterProductionWorkspace,
  type ProductionSession,
} from '@/lib/production/access';
import { resolveFinancePageAccess } from '@/lib/finance/desk';
import { t } from '@/lib/i18n/es';

export type AccessMatrixRow = {
  id: string;
  label: string;
  allowed: boolean;
  evaluator: string;
};

function navVisible(navId: string, grantedScopes: readonly string[]): boolean {
  const showAdmin = hasAssignedOperationsScope(grantedScopes, PEOPLE_ADMIN_SCOPE);
  return primaryNavIds({ showAdmin }).includes(navId);
}

function productionSession(grantedScopes: readonly string[]): ProductionSession {
  return {
    organizationId: 'synth',
    memberId: 'synth',
    grantedScopes,
  };
}

const AREA_NAV_IDS = [
  'inicio',
  'clientes',
  'mapa',
  'oportunidades',
  'cotizaciones',
  'trabajo',
  'conversaciones',
  'productos',
  'produccion',
  'almacen',
  'compras',
  'finanzas',
  'entregas',
  'coordinacion',
  'aprobaciones',
  'incidencias',
  'administracion',
] as const;

/**
 * Effective permission preview for a live granted-scope set.
 * Uses the same helpers as shell and desk gates — no hardcoded checkmarks.
 */
export function buildAccessMatrix(grantedScopes: readonly string[]): AccessMatrixRow[] {
  const finance = resolveFinancePageAccess({
    session: {
      organizationId: 'synth',
      memberId: 'synth',
      accessStatus: 'active',
    },
    grantedScopes: [...grantedScopes],
  });
  const memberActive = grantedScopes.length > 0;

  const navRows: AccessMatrixRow[] = AREA_NAV_IDS.map((id) => {
    const item = PRIMARY_NAV.find((n) => n.id === id);
    const label = item ? t(item.labelKey) : id;
    return {
      id: `nav-${id}`,
      label: `Área: ${label}`,
      allowed: navVisible(id, grantedScopes),
      evaluator: 'Navegación según permisos efectivos',
    };
  });

  const actionRows: AccessMatrixRow[] = [
    {
      id: 'sistema-controles',
      label: 'Controles del sistema',
      allowed: mayOpenSystemControls(grantedScopes),
      evaluator: 'Autorización system.admin',
    },
    {
      id: 'issue-report',
      label: 'Reportar incidencia',
      allowed: memberActive,
      evaluator: 'Miembro activo',
    },
    {
      id: 'issue-manage',
      label: 'Gestionar incidencia',
      allowed: hasAssignedOperationsScope(grantedScopes, ISSUE_MANAGE_SCOPE),
      evaluator: 'Autorización issue.manage',
    },
    {
      id: 'work-create',
      label: 'Crear o editar trabajo',
      allowed: memberActive,
      evaluator: 'Miembro activo',
    },
    {
      id: 'approve',
      label: 'Aprobar (si es el decisor asignado)',
      allowed: memberActive,
      evaluator: 'Miembro activo; la decisión sigue al asignado',
    },
    {
      id: 'work-reassign',
      label: 'Reasignar trabajo',
      allowed: hasAssignedOperationsScope(grantedScopes, PEOPLE_ADMIN_SCOPE),
      evaluator: 'Autorización people.admin',
    },
    {
      id: 'people-admin',
      label: 'Administración de personas',
      allowed: hasAssignedOperationsScope(grantedScopes, PEOPLE_ADMIN_SCOPE),
      evaluator: 'Autorización people.admin',
    },
    {
      id: 'finance-write',
      label: 'Registro financiero operativo',
      allowed: canRecordOperationalFinance(grantedScopes),
      evaluator: 'Autorización finance.operational.record',
    },
    {
      id: 'commercial-reassign',
      label: 'Reasignación comercial',
      allowed: canReassignCommercialAccountOwner(grantedScopes),
      evaluator: 'Autorización commercial.account.reassign',
    },
    {
      id: 'master-data',
      label: 'Alta de clientes',
      allowed: hasMasterDataAdminScope(grantedScopes),
      evaluator: 'Autorización master_data.admin',
    },
    {
      id: 'finance-desk',
      label: 'Escritorio financiero operativo',
      allowed: finance.status === 'ready' && finance.canRecord,
      evaluator: 'Acceso al escritorio financiero',
    },
    {
      id: 'production-entry',
      label: 'Entrada de producción',
      allowed: canEnterProductionWorkspace(productionSession(grantedScopes)),
      evaluator: 'Acceso al escritorio de producción',
    },
    {
      id: 'production-record',
      label: 'Registro operativo de producción',
      allowed: canRecordProduction(grantedScopes),
      evaluator: 'Autorización production.operational.record',
    },
    {
      id: 'warehouse-receive',
      label: 'Recepción de producto terminado',
      allowed: canReceiveFinishedGoods(grantedScopes),
      evaluator: 'Autorización warehouse.finished_goods.receive',
    },
    {
      id: 'warehouse-outbound',
      label: 'Nota de salida de almacén',
      allowed: canRecordWarehouseOutbound(grantedScopes),
      evaluator: 'Autorización warehouse.outbound.record',
    },
    {
      id: 'purchasing-record',
      label: 'Registro de compras',
      allowed: canRecordPurchasing(grantedScopes),
      evaluator: 'Autorización purchasing.operational.record',
    },
    {
      id: 'coordination-record',
      label: 'Registro de coordinación',
      allowed: canRecordCoordinatorWork(grantedScopes),
      evaluator: 'Autorización operations.coordinator.record',
    },
    {
      id: 'delivery-record',
      label: 'Registro de entrega',
      allowed: canRecordDelivery(grantedScopes),
      evaluator: 'Autorización delivery.record',
    },
  ];

  return [...navRows, ...actionRows];
}
