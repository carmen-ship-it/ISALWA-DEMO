import {
  ISSUE_MANAGE_SCOPE,
  PEOPLE_ADMIN_SCOPE,
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
import { primaryNavIds } from '@/lib/navigation/nav-config';
import { mayOpenSystemControls } from '@/lib/roles/system-controls';
import {
  canEnterProductionWorkspace,
  type ProductionSession,
} from '@/lib/production/access';
import { resolveFinancePageAccess } from '@/lib/finance/desk';

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

/**
 * Effective permission preview for a persona scope set.
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

  const rows: AccessMatrixRow[] = [
    {
      id: 'nav-inicio',
      label: 'Navegación: Inicio',
      allowed: navVisible('inicio', grantedScopes),
      evaluator: 'primaryNavIds',
    },
    {
      id: 'nav-administracion',
      label: 'Navegación: Administración',
      allowed: navVisible('administracion', grantedScopes),
      evaluator: 'primaryNavIds + PEOPLE_ADMIN_SCOPE',
    },
    {
      id: 'nav-incidencias',
      label: 'Navegación: Incidencias',
      allowed: navVisible('incidencias', grantedScopes),
      evaluator: 'primaryNavIds',
    },
    {
      id: 'sistema-controles',
      label: 'Controles del sistema (/sistema)',
      allowed: mayOpenSystemControls(grantedScopes),
      evaluator: 'mayOpenSystemControls',
    },
    {
      id: 'master-data',
      label: 'Alta de clientes (master_data.admin)',
      allowed: hasMasterDataAdminScope(grantedScopes),
      evaluator: 'hasMasterDataAdminScope',
    },
    {
      id: 'finance-desk',
      label: 'Escritorio financiero operativo',
      allowed: finance.status === 'ready' && finance.canRecord,
      evaluator: 'resolveFinancePageAccess',
    },
    {
      id: 'production-entry',
      label: 'Entrada de producción',
      allowed: canEnterProductionWorkspace(productionSession(grantedScopes)),
      evaluator: 'canEnterProductionWorkspace',
    },
    {
      id: 'production-record',
      label: 'Registro operativo de producción',
      allowed: canRecordProduction(grantedScopes),
      evaluator: 'canRecordProduction',
    },
    {
      id: 'warehouse-receive',
      label: 'Recepción de producto terminado',
      allowed: canReceiveFinishedGoods(grantedScopes),
      evaluator: 'canReceiveFinishedGoods',
    },
    {
      id: 'warehouse-outbound',
      label: 'Nota de salida de almacén',
      allowed: canRecordWarehouseOutbound(grantedScopes),
      evaluator: 'canRecordWarehouseOutbound',
    },
    {
      id: 'purchasing-record',
      label: 'Registro de compras',
      allowed: canRecordPurchasing(grantedScopes),
      evaluator: 'canRecordPurchasing',
    },
    {
      id: 'coordination-record',
      label: 'Registro de coordinación',
      allowed: canRecordCoordinatorWork(grantedScopes),
      evaluator: 'canRecordCoordinatorWork',
    },
    {
      id: 'delivery-record',
      label: 'Registro de entrega',
      allowed: canRecordDelivery(grantedScopes),
      evaluator: 'canRecordDelivery',
    },
    {
      id: 'issue-manage',
      label: 'Gestión de incidencias (triage)',
      allowed: hasAssignedOperationsScope(grantedScopes, ISSUE_MANAGE_SCOPE),
      evaluator: 'hasAssignedOperationsScope(issue.manage)',
    },
  ];

  return rows;
}
