import { isGrantableCoverageAction } from '@isalwa/os-contracts';

export type CoverageActionChoice = { action: string; label: string; hint: string };

const COPY: Record<string, { label: string; hint: string }> = {
  'commercial.work': {
    label: 'Continuar oportunidades y cotizaciones',
    hint: 'Trabaja las oportunidades y cotizaciones del responsable.',
  },
  'customer.edit': {
    label: 'Editar datos del cliente',
    hint: 'Solo si quien apoya también tiene permiso para editar clientes.',
  },
  'quote.convert': {
    label: 'Convertir cotizaciones enviadas a pedido',
    hint: 'Solo si quien apoya también tiene permiso propio de conversión.',
  },
};

/** Choices shown in "Apoyo temporal": only actions the server says this viewer may grant. */
export function coverageActionChoices(grantable: readonly string[] | undefined): CoverageActionChoice[] {
  const allowed = (grantable && grantable.length > 0 ? grantable : ['commercial.work']).filter(isGrantableCoverageAction);
  return allowed.filter((action) => COPY[action]).map((action) => ({ action, ...COPY[action]! }));
}

export function formatCoverageActions(actions: readonly string[] | undefined): string {
  const known = (actions && actions.length > 0 ? actions : ['commercial.work']).filter((action) => COPY[action]);
  return known.map((action) => COPY[action]!.label).join(' · ');
}

/** Form values → requested actions; unknown values are dropped, never defaulted upward. */
export function parseCoverageActions(values: readonly unknown[]): string[] {
  return [...new Set(values.map(String).filter(isGrantableCoverageAction))];
}
