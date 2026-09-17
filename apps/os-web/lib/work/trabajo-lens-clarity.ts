/**
 * Honest captions for Mi trabajo Mío / Equipo / Empresa lenses.
 * Describes visibility only — does not invent assignees or SLAs.
 */

export type TrabajoLensId = 'mine' | 'overdue' | 'team' | 'org';

export function trabajoLensClarity(view: TrabajoLensId): string {
  switch (view) {
    case 'mine':
      return 'Solo trabajo abierto a su nombre. No incluye el asignado a otras personas.';
    case 'team':
      return 'Trabajo abierto del equipo según su acceso de lectura. No reasigna responsables.';
    case 'org':
      return 'Trabajo abierto de la empresa según su acceso de lectura. No inventa asignaciones.';
    case 'overdue':
      return 'Trabajo abierto con fecha vencida en la vista activa. Las fechas son las ya registradas.';
  }
}
