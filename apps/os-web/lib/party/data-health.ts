import { normalizeProvenanceUrl, type PartySummaryReadModel } from '@isalwa/os-contracts';

export type DataHealthIssue = {
  id: string;
  title: string;
  what: string;
  why: string;
  action: string;
};

export function dataHealthFromSummaries(items: readonly PartySummaryReadModel[]): DataHealthIssue[] {
  const issues: DataHealthIssue[] = [];
  const missingPhone = items.filter((item) => item.primaryPhone === null);
  const noCoordinates = items.filter((item) => item.hasCoordinates === false);
  const unassigned = items.filter(
    (item) => item.hasCommercialAccount && item.commercialOwnerMemberId === null,
  );

  if (itemFactsPresent(items) && missingPhone.length > 0) {
    issues.push({
      id: 'missing-phone',
      title: 'Sin teléfono',
      what: `${missingPhone.length} cliente${missingPhone.length === 1 ? '' : 's'} visible${missingPhone.length === 1 ? '' : 's'} no tiene teléfono registrado.`,
      why: 'Sin teléfono, el seguimiento depende de buscar el contacto en otro lado.',
      action: 'Agregue el teléfono en la ficha del cliente. No se crea un contacto nuevo desde aquí.',
    });
  }

  if (itemFactsPresent(items) && noCoordinates.length > 0) {
    issues.push({
      id: 'missing-location',
      title: 'Sin ubicación en mapa',
      what: `${noCoordinates.length} cliente${noCoordinates.length === 1 ? '' : 's'} visible${noCoordinates.length === 1 ? '' : 's'} no tiene coordenadas.`,
      why: 'Un enlace de Maps no es una ubicación. No se geocodifica en silencio.',
      action: 'Revise la ficha si el origen está incompleto. No se corrige solo.',
    });
  }

  if (itemFactsPresent(items) && unassigned.length > 0) {
    issues.push({
      id: 'unassigned',
      title: 'Sin responsable',
      what: `${unassigned.length} cliente${unassigned.length === 1 ? '' : 's'} con cuenta comercial no tiene responsable asignado.`,
      why: 'El cargo no asigna la cuenta. Sin responsable, no queda claro quién la maneja.',
      action: 'Asigne un responsable comercial en la ficha. No se infiere del cargo.',
    });
  }

  for (const group of sharedProvenanceGroups(items)) {
    const names = group.names.join(' y ');
    issues.push({
      id: `shared-provenance:${group.key}`,
      title: 'Necesita revisión',
      what: `${names} comparten el mismo enlace de ubicación.`,
      why: 'Puede ser el mismo lugar o un dato repetido. Esta lectura no decide cuál es correcto.',
      action: 'Revise el origen con quien conozca a esos clientes. No se fusiona ni se corrige solo.',
    });
  }

  return issues;
}

export function mapCoverage(items: readonly PartySummaryReadModel[]): {
  withCoordinates: number;
  total: number;
  sentence: string | null;
} {
  if (!itemFactsPresent(items)) {
    return { withCoordinates: 0, total: items.length, sentence: null };
  }
  const withCoordinates = items.filter((item) => item.hasCoordinates === true).length;
  return {
    withCoordinates,
    total: items.length,
    sentence: `${withCoordinates} de ${items.length} clientes con ubicación disponible en mapa`,
  };
}

function itemFactsPresent(items: readonly PartySummaryReadModel[]): boolean {
  return items.some((item) => item.hasCoordinates !== undefined);
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
