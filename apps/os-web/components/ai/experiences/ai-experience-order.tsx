import { AiAssistShell } from '../ai-assist-shell';

const ORDER_PROMPTS = [
  '¿Qué incidencias afectan este pedido?',
  '¿Qué está pendiente en el cliente?',
  'Resumir señales del pedido',
  '¿Qué compromisos aplican?',
] as const;

export type AiExperienceOrderProps = {
  partyId: string;
  orderLabel?: string;
};

/**
 * Order desk assist — reuses authorized cliente360 evidence (no order subject in API).
 * Free-text and prompts stay scoped to the party the pedido belongs to.
 */
export function AiExperienceOrder({ partyId, orderLabel }: AiExperienceOrderProps) {
  const title = orderLabel ? `Ayuda con ${orderLabel}` : 'Ayuda con este pedido';
  return (
    <AiAssistShell
      title={title}
      kicker="Asistencia · Pedido"
      feature="summarize_customer"
      subjectType="party"
      subjectId={partyId}
      surface="cliente360"
      suggestedPrompts={ORDER_PROMPTS}
      promptLabel="Preguntar sobre este pedido"
    />
  );
}
