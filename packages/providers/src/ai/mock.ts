import type { AiProvider } from '../types/index';
import type { AiAssistInput, AiAssistResult } from './types';

export class MockAiProvider implements AiProvider {
  readonly info = { name: 'mock-ai', mode: 'mock' as const };

  async summarizeAccount(input: { accountName: string; facts: string[] }) {
    const evidence = input.facts.slice(0, 3);
    const summary =
      evidence.length === 0
        ? `${input.accountName}: sin hechos suficientes para un resumen.`
        : `${input.accountName}: relación activa. Señales: ${evidence.join(' · ')}`;
    return { summary, evidence };
  }

  async assist(input: AiAssistInput): Promise<AiAssistResult> {
    const evidenceRefs = [...input.evidenceRefs];
    const facts = input.facts.slice(0, 5);
    const summary =
      facts.length === 0
        ? `Sin evidencia autorizada para ${input.subjectType} ${input.subjectId}.`
        : `Resumen (${input.feature}): ${facts.slice(0, 2).join(' · ')}`;
    const suggestion =
      input.feature === 'draft_follow_up'
        ? 'Redacte un seguimiento breve citando solo los hechos anteriores. Una persona debe enviarlo.'
        : 'Revise la evidencia enlazada antes de decidir el siguiente paso.';
    return {
      summary,
      suggestion,
      facts,
      evidenceRefs,
      modelCalled: false,
    };
  }

  async health() {
    return 'up' as const;
  }
}
