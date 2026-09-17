export type CommercialProgressStepId = 'cliente' | 'oportunidad' | 'cotizacion' | 'pedido';

export type CommercialProgressStepState = 'complete' | 'current' | 'upcoming';

export type CommercialProgressStep = {
  id: CommercialProgressStepId;
  label: string;
  state: CommercialProgressStepState;
};

/**
 * Linear commercial progress for Opportunity / Quote detail.
 * Labels only — never opaque entity IDs.
 */
export function commercialProgressSteps(input: {
  hasQuote: boolean;
  onQuote?: boolean;
  hasOrder?: boolean;
}): CommercialProgressStep[] {
  const { hasQuote, onQuote = false, hasOrder = false } = input;

  let cotizacion: CommercialProgressStepState = 'upcoming';
  if (hasOrder || (hasQuote && onQuote)) cotizacion = 'current';
  if (hasQuote && !onQuote) cotizacion = 'complete';
  if (hasOrder) cotizacion = 'complete';

  let oportunidad: CommercialProgressStepState = 'current';
  if (hasQuote || onQuote || hasOrder) oportunidad = 'complete';

  return [
    { id: 'cliente', label: 'Cliente', state: 'complete' },
    { id: 'oportunidad', label: 'Oportunidad', state: oportunidad },
    { id: 'cotizacion', label: 'Cotización', state: cotizacion },
  ];
}
