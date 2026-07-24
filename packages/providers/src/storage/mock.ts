import { createId } from '@isalwa/ts-utils';
import type { StorageProvider } from '../types/index';

const mem = new Map<string, Uint8Array>();

export class MockStorageProvider implements StorageProvider {
  readonly info = { name: 'mock-storage', mode: 'mock' as const };

  async putObject(input: { key: string; bytes: Uint8Array; contentType: string }) {
    void input.contentType;
    mem.set(input.key, input.bytes);
    return { key: input.key };
  }

  async getSignedUrl(key: string) {
    return `memory://isalwa/${encodeURIComponent(key)}?sig=${createId()}`;
  }

  async health() {
    return 'up' as const;
  }
}
