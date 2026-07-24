import { createId } from '@isalwa/ts-utils';
import type { MessagingProvider } from '../types/index';

export class MockMessagingProvider implements MessagingProvider {
  readonly info = { name: 'mock-messaging', mode: 'mock' as const };

  async sendText(input: {
    channelId: string;
    toE164: string;
    body: string;
  }): Promise<{ providerMessageId: string }> {
    void input;
    return { providerMessageId: `mock_${createId()}` };
  }

  async health() {
    return 'up' as const;
  }
}
