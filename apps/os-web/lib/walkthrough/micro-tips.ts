/** Dismissible contextual tips after a first relevant action. */

export type MicroTipTrigger =
  | 'quote_sent'
  | 'delivery_note_created'
  | 'salida_recorded'
  | 'issue_created';

export type MicroTipAction = {
  label: string;
  href?: string;
  dismissLabel?: string;
};

export type ContextualMicroTip = {
  trigger: MicroTipTrigger;
  title: string;
  body: string;
  primary: MicroTipAction;
  secondary: MicroTipAction;
};

export const CONTEXTUAL_MICRO_TIPS: Record<MicroTipTrigger, ContextualMicroTip> = {
  quote_sent: {
    trigger: 'quote_sent',
    title: 'Siguiente paso',
    body: 'Programe cuándo quiere volver a contactar al cliente.',
    primary: { label: 'Programar seguimiento', href: '/trabajo' },
    secondary: { label: 'Ahora no', dismissLabel: 'Ahora no' },
  },
  delivery_note_created: {
    trigger: 'delivery_note_created',
    title: 'Historial de salida',
    body: 'Cuando la mercadería salga, registre la salida para mantener el historial.',
    primary: { label: 'Ir a entregas', href: '/entregas' },
    secondary: { label: 'Ahora no', dismissLabel: 'Ahora no' },
  },
  salida_recorded: {
    trigger: 'salida_recorded',
    title: 'Entrega al cliente',
    body: 'Cuando el cliente reciba la mercadería, registre la entrega.',
    primary: { label: 'Registrar entrega', href: '/entregas' },
    secondary: { label: 'Ahora no', dismissLabel: 'Ahora no' },
  },
  issue_created: {
    trigger: 'issue_created',
    title: 'Seguimiento',
    body: 'Puede asignar un responsable y una fecha para darle seguimiento.',
    primary: { label: 'Ver trabajo', href: '/trabajo' },
    secondary: { label: 'Ahora no', dismissLabel: 'Ahora no' },
  },
};

export function microTipForTrigger(trigger: MicroTipTrigger): ContextualMicroTip {
  return CONTEXTUAL_MICRO_TIPS[trigger];
}

export const MICRO_TIP_STORAGE_PREFIX = 'isalwa.os-web.micro-tip.v1';

export function microTipStorageKey(trigger: MicroTipTrigger): string {
  return `${MICRO_TIP_STORAGE_PREFIX}.${trigger}`;
}
