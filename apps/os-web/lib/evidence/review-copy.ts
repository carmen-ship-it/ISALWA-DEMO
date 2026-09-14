/** Employee language for evidence review. Never an internal enum name. */

export const CUSTOMER_NOT_COMPANY_TRUTH =
  'Un mensaje del cliente no es verdad confirmada por la empresa.';

export const MESSAGE_NOT_CONFIRMED_PAYMENT = 'Un mensaje no confirma un pago.';

export const PAYMENT_NOTICE = 'Esto no confirma el cobro.';

export const NO_CANONICAL_CHANGE = 'No cambia el pedido, el pago ni la ubicación.';

export const COMMITMENT_NOT_LIVE =
  'La extracción de compromisos no está en vivo. No se llamó a un modelo ni a WhatsApp.';

export const INTELLIGENCE_NOT_LIVE =
  'El resumen de conversación no está en vivo. No se inventan promesas ni pasos.';

export const MODEL_NOT_CALLED = 'No se llamó a un modelo.';

export const PROVIDER_NOT_CALLED = 'No se llamó a WhatsApp.';

export const CONFIDENCE_ABSENT = 'Sin extracción';

export const REPORTED_SUCCESS = 'Quedó como dato reportado. No confirma el cobro ni cambia un registro.';

export const LINK_SUCCESS = 'Vinculado. El registro no se modificó.';

export const DISMISS_SUCCESS = 'Lectura descartada. Se conservó la historia.';

export const HISTORY_KEPT = 'Se conservó la lectura anterior.';

export const QUESTION_OUTBOUND_NOTE =
  'Una pregunta no se cierra solo porque exista una respuesta de salida.';

export const REVIEW_REFUSAL_COPY = {
  already_dismissed: 'Esta lectura ya fue descartada.',
  missing_link: 'Falta el registro al que se quiere vincular.',
  missing_actor: 'Falta quién revisa.',
  authoritative_override_refused: 'Una fuente ya confirmada no se cambia desde este mensaje.',
  payment_confirmation_refused: PAYMENT_NOTICE,
} as const;

export const CONFLICT_TITLES = {
  quantity: 'Posible discrepancia de cantidad',
  payment: 'Posible discrepancia de pago',
  amount: 'Posible discrepancia de monto',
  location: 'Posible discrepancia de ubicación',
} as const;
