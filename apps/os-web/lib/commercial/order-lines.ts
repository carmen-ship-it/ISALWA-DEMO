export const ORDER_LINES_TITLE = 'Líneas';

export const ORDER_LINES_NOT_RECORDED = 'Las líneas de este pedido no se registraron.';

export const ORDER_LINES_NOT_INVENTED = 'El total se conserva. No se inventaron líneas.';

export const ORDER_LINES_SNAPSHOT_NOTE = 'Copia de la cotización al crear el pedido.';

export type OrderLineView = {
  orderLineId: string;
  quoteId: string;
  quoteLineId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavos: string;
  discountCentavos: string;
  lineTotalCentavos: string;
  productRef: string | null;
};

export type PresentedOrderLines =
  | {
      recorded: false;
      title: typeof ORDER_LINES_TITLE;
      message: typeof ORDER_LINES_NOT_RECORDED;
      note: typeof ORDER_LINES_NOT_INVENTED;
      lines: [];
    }
  | {
      recorded: true;
      title: typeof ORDER_LINES_TITLE;
      note: typeof ORDER_LINES_SNAPSHOT_NOTE;
      lines: OrderLineView[];
    };

/**
 * Empty, missing, or unknown lines mean the detail was not captured.
 * This function has no order total and cannot invent a line from one.
 */
export function presentOrderLines(
  lines: readonly OrderLineView[] | null | undefined,
): PresentedOrderLines {
  if (!lines || lines.length === 0) {
    return {
      recorded: false,
      title: ORDER_LINES_TITLE,
      message: ORDER_LINES_NOT_RECORDED,
      note: ORDER_LINES_NOT_INVENTED,
      lines: [],
    };
  }
  return {
    recorded: true,
    title: ORDER_LINES_TITLE,
    note: ORDER_LINES_SNAPSHOT_NOTE,
    lines: [...lines].sort((left, right) => left.lineNumber - right.lineNumber),
  };
}
