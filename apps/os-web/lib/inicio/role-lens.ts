import { hasTeamCommercialRead } from '@/lib/roles/access';
import { viewerHasManagementOrgRead } from '@/lib/management/scope';

export type InicioRoleLens = 'operator' | 'manager' | 'owner';

export type InicioRoleLensInput = {
  roleKeys: readonly string[];
  leadershipTeamReady: boolean;
  leadershipOrgReady: boolean;
};

/**
 * Operator = personal queues. Manager = team commercial read or team leadership lane.
 * Owner = management org read or org leadership lane.
 */
export function resolveInicioRoleLens(input: InicioRoleLensInput): InicioRoleLens {
  if (viewerHasManagementOrgRead(input.roleKeys) || input.leadershipOrgReady) {
    return 'owner';
  }
  if (hasTeamCommercialRead(input.roleKeys) || input.leadershipTeamReady) {
    return 'manager';
  }
  return 'operator';
}

export function inicioRoleLensLabel(lens: InicioRoleLens): string {
  switch (lens) {
    case 'owner':
      return 'Empresa';
    case 'manager':
      return 'Equipo';
    case 'operator':
      return 'Personal';
  }
}
