import type { MemberSearchParams } from './types';

export function administracionHref(): string {
  return '/administracion';
}

export function equipoHref(params?: MemberSearchParams): string {
  const url = new URL('/administracion/equipo', 'http://local');
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.accessStatus) url.searchParams.set('accessStatus', params.accessStatus);
  if (params?.employmentStatus) url.searchParams.set('employmentStatus', params.employmentStatus);
  if (params?.departmentId) url.searchParams.set('departmentId', params.departmentId);
  if (params?.cursor) url.searchParams.set('cursor', params.cursor);
  const qs = url.searchParams.toString();
  return qs ? `/administracion/equipo?${qs}` : '/administracion/equipo';
}

export function memberHref(memberId: string): string {
  return `/administracion/equipo/${encodeURIComponent(memberId)}`;
}

export function capacidadesHref(): string {
  return '/administracion/capacidades';
}

export function accesosHref(): string {
  return '/administracion/accesos';
}
