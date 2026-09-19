import { hasTeamCommercialRead } from '@/lib/roles/access';
import { viewerHasManagementOrgRead } from '@/lib/management/scope';
import type { InicioRoleLensInput } from '@/lib/inicio/role-lens';

export type InicioPageLens = 'personal' | 'team' | 'org';

export function canShowTeamLens(input: InicioRoleLensInput): boolean {
  return hasTeamCommercialRead(input.roleKeys) || input.leadershipTeamReady;
}

export function canShowOrgLens(input: InicioRoleLensInput): boolean {
  return viewerHasManagementOrgRead(input.roleKeys) || input.leadershipOrgReady;
}

/**
 * View As narrows the lens. An asesor projection never inherits the
 * authenticated actor's company-wide read. Jefe keeps team; Gerencia keeps org.
 */
export function lensInputForEvaluation(
  owner: InicioRoleLensInput,
  evaluation: {
    active: boolean;
    persona: string | null;
    presentationScopes: readonly string[];
  },
): InicioRoleLensInput {
  if (!evaluation.active) return owner;
  if (evaluation.persona === 'gerencia') {
    return {
      roleKeys: evaluation.presentationScopes,
      leadershipTeamReady: true,
      leadershipOrgReady: true,
    };
  }
  if (evaluation.persona === 'jefe-comercial') {
    return {
      roleKeys: evaluation.presentationScopes,
      leadershipTeamReady: true,
      leadershipOrgReady: false,
    };
  }
  return {
    roleKeys: evaluation.presentationScopes,
    leadershipTeamReady: false,
    leadershipOrgReady: false,
  };
}

export function resolveInicioPageLens(
  raw: string | undefined,
  input: InicioRoleLensInput,
): InicioPageLens {
  // `gerencia` is the Story Mode / seeded deep-link alias for Empresa org metrics.
  if ((raw === 'empresa' || raw === 'gerencia') && canShowOrgLens(input)) return 'org';
  if (raw === 'equipo' && canShowTeamLens(input)) return 'team';
  return 'personal';
}

export function inicioLensTabHref(lens: InicioPageLens, periodo?: string): string {
  const params = new URLSearchParams();
  if (lens === 'team') params.set('lente', 'equipo');
  if (lens === 'org') params.set('lente', 'empresa');
  if (periodo && periodo !== '7') params.set('periodo', periodo);
  const q = params.toString();
  return q ? `/inicio?${q}` : '/inicio';
}

export function availableInicioPageLenses(input: InicioRoleLensInput): InicioPageLens[] {
  const lenses: InicioPageLens[] = ['personal'];
  if (canShowTeamLens(input)) lenses.push('team');
  if (canShowOrgLens(input)) lenses.push('org');
  return lenses;
}

export function inicioPageLensLabel(lens: InicioPageLens): string {
  switch (lens) {
    case 'personal':
      return 'Mi trabajo';
    case 'team':
      return 'Equipo';
    case 'org':
      return 'Empresa';
  }
}

export function parseManagementPeriodPreset(raw: string | undefined): '7' | '30' | '90' {
  if (raw === '30') return '30';
  if (raw === '90') return '90';
  return '7';
}
