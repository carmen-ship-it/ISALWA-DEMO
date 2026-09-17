/**
 * Human-readable staff display (name + Cargo).
 * Cargo is business context only — never authority.
 * Do not hardcode person names; resolve from evidenced member/import fields.
 */

/** Known Cargo labels from DATOS CLIENTES staff sheet — display mapping only. */
export const KNOWN_CARGO_LABELS = [
  'ASESOR DE VENTA',
  'JEFE COMERCIAL',
  'GERENTE GENERAL',
] as const;

export type KnownCargoLabel = (typeof KNOWN_CARGO_LABELS)[number];

const CARGO_DISPLAY: Record<KnownCargoLabel, string> = {
  'ASESOR DE VENTA': 'Asesor de Venta',
  'JEFE COMERCIAL': 'Jefe Comercial',
  'GERENTE GENERAL': 'Gerente General',
};

/**
 * Prefer an evidenced Cargo string over department when both exist.
 * Never invent a Cargo from scopes like commercial.quote.convert.own.
 */
export function humanizeCargoLabel(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  for (const known of KNOWN_CARGO_LABELS) {
    if (upper === known || upper.includes(known)) {
      return CARGO_DISPLAY[known];
    }
  }
  // Reject capability-looking codes for user display.
  if (value.includes('.') || /^[a-z0-9_.-]+$/.test(value)) return null;
  return value;
}

/**
 * Pick Cargo from roleKeys / import cargo / department — display only.
 * RoleKeys that are scopes (contain '.') are ignored.
 */
export function resolveCargoForDisplay(input: {
  cargo?: string | null;
  roleKeys?: readonly string[] | null;
  departmentName?: string | null;
}): string | null {
  const fromCargo = humanizeCargoLabel(input.cargo);
  if (fromCargo) return fromCargo;
  for (const key of input.roleKeys ?? []) {
    const fromRole = humanizeCargoLabel(key);
    if (fromRole) return fromRole;
  }
  return humanizeCargoLabel(input.departmentName) ?? (input.departmentName?.trim() || null);
}

export function formatPersonWithCargo(
  displayName: string | null | undefined,
  cargoLabel: string | null | undefined,
): string | null {
  const name = displayName?.trim() || null;
  const cargo = cargoLabel?.trim() || null;
  if (name && cargo) return `${name} · ${cargo}`;
  if (name) return name;
  if (cargo) return cargo;
  return null;
}

export const COMMERCIAL_OWNER_PENDING = 'Responsable comercial pendiente de asignar' as const;

export function commercialOwnerLine(input: {
  displayName: string | null | undefined;
  cargoLabel: string | null | undefined;
}): string {
  const formatted = formatPersonWithCargo(input.displayName, input.cargoLabel);
  if (!formatted) return COMMERCIAL_OWNER_PENDING;
  return `Responsable comercial: ${formatted}`;
}
