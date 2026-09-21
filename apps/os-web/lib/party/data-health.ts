import { normalizeProvenanceUrl, type PartySummaryReadModel } from '@isalwa/os-contracts';

export const DATA_HEALTH_BOUNDARY =
  'Esta lectura no fusiona clientes ni elige cuál dato es correcto.';

export const MAP_COVERAGE_LIMIT =
  'Se muestran clientes con ubicación confirmada.';

/** Category for scanability — not severity. Never invent critical/high/low. */
export type DataHealthIssueType =
  | 'contacto'
  | 'ubicacion'
  | 'asignacion'
  | 'duplicado'
  | 'identidad'
  | 'revision';

export const DATA_HEALTH_TYPE_LABEL: Record<DataHealthIssueType, string> = {
  contacto: 'Contacto',
  ubicacion: 'Ubicación',
  asignacion: 'Asignación',
  duplicado: 'Duplicado',
  identidad: 'Identidad',
  revision: 'Revisión',
};

/**
 * Marker by factual category (teal / amber / red roles).
 * Not a severity ladder — only category color for scan.
 */
export const DATA_HEALTH_TYPE_MARKER: Record<DataHealthIssueType, string> = {
  contacto: 'border-l-[var(--isalwa-glaze)] bg-[var(--isalwa-teal-100)]',
  ubicacion: 'border-l-[var(--isalwa-glaze)] bg-[var(--isalwa-teal-100)]',
  asignacion: 'border-l-[var(--isalwa-kiln)] bg-[color-mix(in_srgb,var(--isalwa-kiln)_6%,white)]',
  /* Duplicate marks on record — red edge without inventing "critical". */
  duplicado:
    'border-l-[var(--isalwa-danger)] bg-[var(--isalwa-status-red-bg)]',
  identidad: 'border-l-[var(--isalwa-kiln)] bg-[var(--isalwa-surface-ops)]',
  revision: 'border-l-[var(--isalwa-warning)] bg-[var(--isalwa-status-amber-bg)]',
};

export function dataHealthPillTone(
  type: DataHealthIssueType,
): 'info' | 'warning' | 'danger' | 'neutral' {
  if (type === 'duplicado') return 'danger';
  if (type === 'revision') return 'warning';
  if (type === 'contacto' || type === 'ubicacion') return 'info';
  return 'neutral';
}

export type DataHealthIssue = {
  id: string;
  type: DataHealthIssueType;
  /** Factual status word — never a severity rank. */
  status: 'hallazgo';
  title: string;
  what: string;
  why: string;
  action: string;
  /** What this reading will not do. Never a correction. */
  boundary: string;
};

function issue(
  partial: Omit<DataHealthIssue, 'status'> & { type: DataHealthIssueType },
): DataHealthIssue {
  return { status: 'hallazgo', ...partial };
}

export function dataHealthFromSummaries(items: readonly PartySummaryReadModel[]): DataHealthIssue[] {
  const issues: DataHealthIssue[] = [];
  const missingPhone = items.filter((item) => item.primaryPhone === null);
  const noCoordinates = items.filter((item) => item.hasCoordinates === false);
  const unassigned = items.filter(
    (item) => item.hasCommercialAccount && item.commercialOwnerMemberId === null,
  );

  if (itemFactsPresent(items) && missingPhone.length > 0) {
    issues.push(
      issue({
        id: 'missing-phone',
        type: 'contacto',
        title: 'Sin teléfono',
        what: `${missingPhone.length} cliente${missingPhone.length === 1 ? '' : 's'} visible${missingPhone.length === 1 ? '' : 's'} no tiene teléfono registrado.`,
        why: 'Sin teléfono, el seguimiento depende de buscar el contacto en otro lado.',
        action: 'Agregue el teléfono en la ficha del cliente. No se crea un contacto nuevo desde aquí.',
        boundary: 'No se inventa un teléfono.',
      }),
    );
  }

  if (itemFactsPresent(items) && noCoordinates.length > 0) {
    issues.push(
      issue({
        id: 'missing-location',
        type: 'ubicacion',
        title: 'Sin ubicación en mapa',
        what: `${noCoordinates.length} cliente${noCoordinates.length === 1 ? '' : 's'} visible${noCoordinates.length === 1 ? '' : 's'} no tiene coordenadas.`,
        why: 'Un enlace de Maps no es una ubicación confirmada en el mapa.',
        action: 'Revise la ficha si el origen está incompleto. No se corrige solo.',
        boundary: 'Se muestran clientes con ubicación confirmada.',
      }),
    );
  }

  if (itemFactsPresent(items) && unassigned.length > 0) {
    issues.push(
      issue({
        id: 'unassigned',
        type: 'asignacion',
        title: 'Sin responsable',
        what: `${unassigned.length} cliente${unassigned.length === 1 ? '' : 's'} con cuenta comercial no tiene responsable asignado.`,
        why: 'El cargo no asigna la cuenta. Sin responsable, no queda claro quién la maneja.',
        action: 'Asigne un responsable comercial en la ficha. No se infiere del cargo.',
        boundary: 'No se asigna un responsable desde el cargo.',
      }),
    );
  }

  for (const group of sharedProvenanceGroups(items)) {
    const names = group.names.join(' y ');
    issues.push(
      issue({
        id: `shared-provenance:${group.key}`,
        type: 'revision',
        title: 'Necesita revisión',
        what: `${names} comparten el mismo enlace de ubicación.`,
        why: 'Puede ser el mismo lugar o un dato repetido. Esta lectura no decide cuál es correcto.',
        action: 'Revise el origen con quien conozca a esos clientes. No se fusiona ni se corrige solo.',
        boundary: 'No se elige un ganador. No se fusiona.',
      }),
    );
  }

  const provenanceOnly = items.filter(hasProvenanceOnly);
  if (provenanceOnly.length > 0) {
    issues.push(
      issue({
        id: 'provenance-not-location',
        type: 'ubicacion',
        title: 'Enlace sin coordenadas',
        what: `${countLabel(
          provenanceOnly.length,
          'cliente visible tiene un enlace de ubicación y no tiene coordenadas',
          'clientes visibles tienen un enlace de ubicación y no tienen coordenadas',
        )}.`,
        why: 'El enlace es procedencia. No coloca al cliente en el mapa.',
        action: 'No se convierte el enlace en un punto desde aquí.',
        boundary: 'Se muestran clientes con ubicación confirmada.',
      }),
    );
  }

  const duplicateReview = items.filter(
    (item) => item.duplicateStatus === 'suggested' || item.duplicateStatus === 'pending_merge',
  );
  if (duplicateReview.length > 0) {
    issues.push(
      issue({
        id: 'duplicate-review',
        type: 'duplicado',
        title: 'Revisión de duplicado',
        what: `${countLabel(duplicateReview.length, 'cliente visible está marcado', 'clientes visibles están marcados')} para revisión de duplicado.`,
        why: 'Una marca no decide que sean la misma cuenta.',
        action: 'Revise con quien conozca a esos clientes. No se fusiona desde aquí.',
        boundary: 'No se fusiona. No se elige un registro principal.',
      }),
    );
  }

  for (const [index, group] of sharedPhoneGroups(items).entries()) {
    issues.push(
      issue({
        id: `shared-phone:${index}`,
        type: 'revision',
        title: 'Teléfono repetido',
        what: `${group.names.join(' y ')} comparten el mismo teléfono.`,
        why: 'Puede ser el mismo contacto o un dato repetido. Esta lectura no decide cuál es correcto.',
        action: 'Revise el teléfono en la ficha. No se fusiona ni se corrige solo.',
        boundary: 'No se normaliza ni se fusiona.',
      }),
    );
  }

  const unnamed = items.filter((item) => item.displayName.trim().length === 0);
  if (unnamed.length > 0) {
    issues.push(
      issue({
        id: 'missing-name',
        type: 'identidad',
        title: 'Sin nombre',
        what: `${countLabel(unnamed.length, 'cliente visible no tiene nombre', 'clientes visibles no tienen nombre')}.`,
        why: 'Sin nombre, la ficha no se distingue en la lista.',
        action: 'Corrija el nombre en la ficha si ya se conoce. No se inventa uno.',
        boundary: 'No se inventa un nombre.',
      }),
    );
  }

  return issues;
}

export function mapCoverage(items: readonly PartySummaryReadModel[]): {
  withCoordinates: number;
  provenanceOnly: number;
  total: number;
  sentence: string | null;
  limit: typeof MAP_COVERAGE_LIMIT;
} {
  const provenanceOnly = items.filter(hasProvenanceOnly).length;
  if (!itemFactsPresent(items)) {
    return { withCoordinates: 0, provenanceOnly, total: items.length, sentence: null, limit: MAP_COVERAGE_LIMIT };
  }
  const withCoordinates = items.filter((item) => item.hasCoordinates === true).length;
  return {
    withCoordinates,
    provenanceOnly,
    total: items.length,
    sentence: `${withCoordinates} de ${items.length} clientes con ubicación disponible en mapa`,
    limit: MAP_COVERAGE_LIMIT,
  };
}

function itemFactsPresent(items: readonly PartySummaryReadModel[]): boolean {
  return items.some((item) => item.hasCoordinates !== undefined);
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function hasProvenanceOnly(item: PartySummaryReadModel): boolean {
  if (item.hasCoordinates !== false) return false;
  return Boolean(item.locationProvenanceUrl?.trim());
}

function sharedProvenanceGroups(
  items: readonly PartySummaryReadModel[],
): Array<{ key: string; names: string[] }> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const key = normalizeProvenanceUrl(item.locationProvenanceUrl);
    if (!key || item.hasCoordinates === true) continue;
    const name = item.displayName.trim() || 'Sin nombre';
    const current = groups.get(key) ?? [];
    current.push(name);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([key, names]) => ({ key, names }));
}

function sharedPhoneGroups(
  items: readonly PartySummaryReadModel[],
): Array<{ key: string; names: string[] }> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const key = item.primaryPhone?.trim() ?? '';
    if (!key) continue;
    const name = item.displayName.trim() || 'Sin nombre';
    const current = groups.get(key) ?? [];
    current.push(name);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .filter(([, names]) => names.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, names]) => ({ key, names }));
}
