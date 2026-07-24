import { createId } from '@isalwa/ts-utils';
import type { EmailProvider } from '../types/index';

export class MockEmailProvider implements EmailProvider {
  readonly info = { name: 'mock-email', mode: 'mock' as const };

  async send(input: { to: string; subject: string; html: string }) {
    void input;
    return { id: `mock_email_${createId()}` };
  }

  async health() {
    return 'up' as const;
  }
}
