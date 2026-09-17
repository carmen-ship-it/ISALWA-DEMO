import type { DataHealthIssue } from '@/lib/party/data-health';

export type DataHealthCta = {
  href: string;
  label: string;
};

/** Actionable fix path — list filters only, no auto-merge or geocode. */
export function dataHealthCta(issue: DataHealthIssue): DataHealthCta {
  switch (issue.id) {
    case 'missing-phone':
      return { href: '/clientes', label: 'Revisar clientes' };
    case 'missing-location':
      return { href: '/mapa', label: 'Abrir mapa' };
    case 'unassigned':
      return { href: '/clientes', label: 'Asignar en clientes' };
    case 'duplicate-review':
      return { href: '/clientes', label: 'Revisar duplicados' };
    case 'provenance-not-location':
      return { href: '/clientes', label: 'Revisar ubicación' };
    case 'missing-name':
      return { href: '/clientes', label: 'Corregir nombres' };
    default:
      if (issue.id.startsWith('shared-provenance:') || issue.id.startsWith('shared-phone:')) {
        return { href: '/clientes', label: 'Revisar en clientes' };
      }
      return { href: '/clientes', label: 'Ir a clientes' };
  }
}
