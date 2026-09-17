import { isAiEnabled } from '@/lib/ai/limits';

/** Pilot gate for optional “preguntar sobre este registro” on Auditoría. Off until CT enables. */
export const AUDIT_AI_ASK_STUB_ENABLED = false;

export function isAuditAiAskStubVisible(): boolean {
  return AUDIT_AI_ASK_STUB_ENABLED && isAiEnabled();
}

export const AUDIT_AI_ASK_STUB_COPY =
  'Pronto podrá formular preguntas acotadas sobre un registro de auditoría. La IA no ejecuta acciones ni amplía el alcance de lectura.';
