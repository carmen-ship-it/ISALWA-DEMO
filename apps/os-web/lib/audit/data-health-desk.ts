import type { DataHealthIssue } from '@/lib/party/data-health';

/** Quién for aggregate data-health findings — honest, never invented actors. */
export function dataHealthWho(issue: DataHealthIssue): string {
  switch (issue.id) {
    case 'missing-phone':
      return 'Responsable no inferido en este resumen.';
    case 'missing-location':
      return 'Origen del dato en la ficha del cliente.';
    case 'unassigned':
      return 'Sin responsable comercial en la ficha.';
    case 'provenance-not-location':
      return 'Quien cargó el enlace de procedencia.';
    case 'duplicate-review':
      return 'Marca de revisión en el registro; no decide quién fusiona.';
    case 'missing-name':
      return 'Dato en la ficha del cliente.';
    default:
      if (issue.id.startsWith('shared-provenance:') || issue.id.startsWith('shared-phone:')) {
        return 'Revise con quien conozca a esos clientes.';
      }
      return 'No se infiere una persona desde esta lectura.';
  }
}
