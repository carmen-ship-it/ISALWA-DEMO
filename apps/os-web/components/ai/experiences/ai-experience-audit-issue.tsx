import { AiAssistShell } from '../ai-assist-shell';

const AUDIT_PROMPTS = [
  '¿Qué pasó en esta incidencia?',
  '¿Qué evidencia respalda el cambio?',
  'Resumir la secuencia reciente',
  '¿Qué falta documentar?',
] as const;

export type AiExperienceAuditIssueProps = {
  issueId: string;
};

/** Audit-adjacent digest for a single issue trail (authorized journal evidence). */
export function AiExperienceAuditIssue({ issueId }: AiExperienceAuditIssueProps) {
  return (
    <AiAssistShell
      title="Resumen para auditoría"
      kicker="Asistencia · Trazabilidad"
      feature="ask"
      subjectType="issue"
      subjectId={issueId}
      surface="issue"
      suggestedPrompts={AUDIT_PROMPTS}
      promptLabel="Preguntar sobre la trazabilidad"
    />
  );
}
