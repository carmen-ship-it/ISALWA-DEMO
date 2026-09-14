import { COORDINATION_FIELD_LABELS } from '@isalwa/os-contracts';

export const COORDINATION_FIELDS = [
  'cliente',
  'pedido',
  'productos',
  'problema',
  'areaResponsable',
  'responsable',
  'fechaConElCliente',
  'fechaInterna',
  'queCambio',
  'clienteInformado',
  'proximaAccion',
] as const;

export type CoordinationFieldKey = (typeof COORDINATION_FIELDS)[number];

export function coordinationFieldValue(
  key: CoordinationFieldKey,
  value: string | boolean | null | undefined,
): string {
  if (key === 'clienteInformado') {
    if (value === true) return 'Sí';
    if (value === false) return 'No';
    return '';
  }
  if (typeof value !== 'string') return '';
  return value;
}

export function CoordinationFieldList({
  values,
}: {
  values: Record<CoordinationFieldKey, string | boolean | null>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {COORDINATION_FIELDS.map((key) => (
        <div key={key} className="min-w-0">
          <dt className="isalwa-section-label">{COORDINATION_FIELD_LABELS[key]}</dt>
          <dd className="mt-1 min-h-5 text-sm text-[var(--isalwa-kiln)]">
            {coordinationFieldValue(key, values[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
