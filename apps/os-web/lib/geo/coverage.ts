/**
 * Coverage copy for a future map. Counts only.
 * Never accepts or returns coordinates. Never geocodes.
 * A shared provenance URL is not resolved here — callers must not
 * rewrite customer rows to "fix" it.
 */

export type MapCoverageInput = {
  withCoordinates: number;
  provenanceOnly: number;
  total: number;
};

export type MapCoverage = {
  plottable: number;
  unplotted: number;
  label: string;
};

function requireCount(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

/**
 * Plot only customers that already have coordinates.
 * Provenance-only rows stay unplotted. Counts are not reconciled
 * by inventing or dropping locations.
 */
export function mapCoverage(input: MapCoverageInput): MapCoverage {
  const withCoordinates = requireCount(input.withCoordinates, 'withCoordinates');
  const provenanceOnly = requireCount(input.provenanceOnly, 'provenanceOnly');
  const total = requireCount(input.total, 'total');

  if (withCoordinates + provenanceOnly !== total) {
    throw new Error(
      'mapCoverage refuses to reconcile counts; it does not invent or drop locations',
    );
  }

  const plottable = withCoordinates;
  const unplotted = provenanceOnly;

  return {
    plottable,
    unplotted,
    label: `${plottable} de ${total} clientes con ubicación disponible en mapa`,
  };
}
