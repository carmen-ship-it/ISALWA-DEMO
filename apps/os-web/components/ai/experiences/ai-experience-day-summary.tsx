import { AiAssistShell } from '../ai-assist-shell';

const DAY_PROMPTS = [
  '¿Qué cambió hoy para este cliente?',
  '¿Qué está vencido o urgente?',
  'Resumir compromisos activos',
  '¿Qué incidencias abiertas hay?',
] as const;

export type AiExperienceDaySummaryProps = {
  /** Leadership anchor party — authorized customer context for the operating day lens. */
  anchorPartyId: string;
  anchorLabel?: string;
};

/**
 * Operating-day summary for a leadership anchor party (existing party evidence path).
 */
export function AiExperienceDaySummary({ anchorPartyId, anchorLabel }: AiExperienceDaySummaryProps) {
  const title = anchorLabel
    ? `Resumen del día · ${anchorLabel}`
    : 'Resumen del día (cliente ancla)';
  return (
    <AiAssistShell
      title={title}
      kicker="Asistencia · Día operativo"
      feature="summarize_customer"
      subjectType="party"
      subjectId={anchorPartyId}
      surface="cliente360"
      suggestedPrompts={DAY_PROMPTS}
      promptLabel="Preguntar sobre el día"
    />
  );
}
