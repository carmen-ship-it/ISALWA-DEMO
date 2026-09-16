'use client';

import { EmptyState, StatusPill } from '@isalwa/ui';

/**
 * Owner-review honesty: structure is visible, persisted write not yet formalized.
 * Visually distinct from NO DATA EmptyState and NOT AUTHORIZED permission EmptyState.
 */
export function V1FlowValidateNotice({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      data-owner-review-state="v1-flow-to-validate"
      role="note"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <StatusPill tone="manual">Versión 1 · por validar</StatusPill>
      </div>
      <EmptyState title={title} description={description} />
    </div>
  );
}

export const OWNER_REVIEW_V1_COPY = {
  almacenTitle: 'Asignación a pedido · estructura visible',
  almacenDescription:
    'En esta Versión 1 puedes ver cómo se relacionará el producto terminado con los pedidos. El registro definitivo de esta asignación todavía se validará con ustedes antes de formalizarlo.',
  comprasTitle: 'Cola de compras · estructura propuesta',
  comprasDescription:
    'Esta Versión 1 muestra la estructura propuesta para Compras. Antes de formalizar el registro y sus estados, queremos validar con ustedes cómo funciona realmente el proceso.',
  entregasTitle: 'Entrega · contexto visible',
  entregasDescription:
    'Aquí se muestra el contexto que tendrá una entrega. El registro definitivo de salida/llegada todavía se validará con ustedes antes de formalizarlo.',
} as const;
