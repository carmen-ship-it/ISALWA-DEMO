import type { SearchProvider } from '../types/index';

export class MockSearchProvider implements SearchProvider {
  readonly info = { name: 'mock-search', mode: 'mock' as const };

  private readonly docs = [
    { id: 'acc_demo_1', title: 'Ferretería El Constructor', type: 'account' },
    { id: 'acc_demo_2', title: 'Distribuidora Norte SCZ', type: 'account' },
    { id: 'prod_demo_1', title: 'Inodoro línea estándar', type: 'product' },
  ];

  async search(query: string, limit = 10) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.docs.filter((d) => d.title.toLowerCase().includes(q)).slice(0, limit);
  }

  async health() {
    return 'up' as const;
  }
}
