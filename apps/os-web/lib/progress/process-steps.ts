/**
 * Deterministic process steppers only — never invent percentage completion.
 */

export type ProcessStepState = 'completed' | 'current' | 'future' | 'attention';

export type ProcessStep = {
  id: string;
  label: string;
  state: ProcessStepState;
};

export type CommercialProcessFacts = {
  hasClient: boolean;
  hasOpportunity: boolean;
  hasQuote: boolean;
  hasOrder: boolean;
  hasDelivery: boolean;
  /** When quote/order needs human follow-up or confirmation */
  attentionStepId?: 'oportunidad' | 'cotizacion' | 'pedido' | 'entrega' | null;
};

/**
 * Cliente → Oportunidad → Cotización → Pedido → Entrega
 * Does not imply every client must traverse every step.
 */
export function resolveCommercialProcessSteps(facts: CommercialProcessFacts): ProcessStep[] {
  const chain: Array<{ id: string; label: string; reached: boolean }> = [
    { id: 'cliente', label: 'Cliente', reached: facts.hasClient },
    { id: 'oportunidad', label: 'Oportunidad', reached: facts.hasOpportunity },
    { id: 'cotizacion', label: 'Cotización', reached: facts.hasQuote },
    { id: 'pedido', label: 'Pedido', reached: facts.hasOrder },
    { id: 'entrega', label: 'Entrega', reached: facts.hasDelivery },
  ];

  let deepestReached = -1;
  for (let i = 0; i < chain.length; i += 1) {
    if (chain[i]!.reached) deepestReached = i;
  }

  const attentionId = facts.attentionStepId ?? null;

  return chain.map((step, index) => {
    if (attentionId === step.id) {
      return { id: step.id, label: step.label, state: 'attention' as const };
    }
    if (index < deepestReached) {
      return { id: step.id, label: step.label, state: 'completed' as const };
    }
    if (index === deepestReached && deepestReached >= 0) {
      const isTerminalComplete = deepestReached === chain.length - 1 && facts.hasDelivery;
      return {
        id: step.id,
        label: step.label,
        state: isTerminalComplete ? ('completed' as const) : ('current' as const),
      };
    }
    return { id: step.id, label: step.label, state: 'future' as const };
  });
}

export type DeliveryProcessFacts = {
  hasOrder: boolean;
  hasDeliveryNote: boolean;
  hasWarehouseExit: boolean;
  hasDelivery: boolean;
  attentionStepId?: 'pedido' | 'nota' | 'salida' | 'entrega' | null;
};

/** Pedido → Nota de Entrega → Salida → Entrega */
export function resolveDeliveryProcessSteps(facts: DeliveryProcessFacts): ProcessStep[] {
  const chain: Array<{ id: string; label: string; reached: boolean }> = [
    { id: 'pedido', label: 'Pedido', reached: facts.hasOrder },
    { id: 'nota', label: 'Nota de Entrega', reached: facts.hasDeliveryNote },
    { id: 'salida', label: 'Salida', reached: facts.hasWarehouseExit },
    { id: 'entrega', label: 'Entrega', reached: facts.hasDelivery },
  ];

  let deepestReached = -1;
  for (let i = 0; i < chain.length; i += 1) {
    if (chain[i]!.reached) deepestReached = i;
  }

  const attentionId = facts.attentionStepId ?? null;

  return chain.map((step, index) => {
    if (attentionId === step.id) {
      return { id: step.id, label: step.label, state: 'attention' as const };
    }
    if (index < deepestReached) {
      return { id: step.id, label: step.label, state: 'completed' as const };
    }
    if (index === deepestReached && deepestReached >= 0) {
      const isTerminalComplete = deepestReached === chain.length - 1 && facts.hasDelivery;
      return {
        id: step.id,
        label: step.label,
        state: isTerminalComplete ? ('completed' as const) : ('current' as const),
      };
    }
    return { id: step.id, label: step.label, state: 'future' as const };
  });
}
