import type { AiProvider } from '../types/index';

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

  async health() {
    return 'up' as const;
  }
}
