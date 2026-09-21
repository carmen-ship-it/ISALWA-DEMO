/**
 * Visible unit wording for quantity lines.
 * Does not change stored quantities or validation.
 */
const UNIT_FORMS: Record<string, readonly [string, string]> = {
  unidad: ['unidad', 'unidades'],
  unidades: ['unidad', 'unidades'],
  pza: ['pza', 'pzas'],
  pzas: ['pza', 'pzas'],
  pieza: ['pieza', 'piezas'],
  piezas: ['pieza', 'piezas'],
};

export function unitWord(unitLabel: string | null | undefined, quantity: number): string | null {
  const raw = unitLabel?.trim();
  if (!raw) return null;
  const forms = UNIT_FORMS[raw.toLowerCase()];
  if (!forms) return raw;
  return quantity === 1 ? forms[0] : forms[1];
}

export function quantityWithUnit(quantity: number, unitLabel: string | null | undefined): string {
  const unit = unitWord(unitLabel, quantity);
  return unit ? `${quantity} ${unit}` : String(quantity);
}
