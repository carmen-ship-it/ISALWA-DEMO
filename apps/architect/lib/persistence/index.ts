import type { Interview, InterviewStore, PersistenceAdapter } from "@/types";

/**
 * Persistence contracts for Mission 0.
 * Implementations are local/memory only — Supabase comes later.
 */

export class MemoryInterviewStore implements InterviewStore {
  private readonly records = new Map<string, Interview>();

  async get(id: string): Promise<Interview | null> {
    return this.records.get(id) ?? null;
  }

  async save(interview: Interview): Promise<Interview> {
    this.records.set(interview.id, interview);
    return interview;
  }

  async list(): Promise<Interview[]> {
    return [...this.records.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

export class MemoryPersistenceAdapter implements PersistenceAdapter {
  readonly provider = "memory" as const;
  readonly interviews: InterviewStore;

  constructor(store?: InterviewStore) {
    this.interviews = store ?? new MemoryInterviewStore();
  }
}

/** Client-side autosave contract. Supabase adapter will implement the same shape. */
export interface ClientInterviewPersistence {
  load(): Interview | null;
  save(interview: Interview): void;
  clear(): void;
}

export const LOCAL_STORAGE_KEY = "isalwa.architect.interview.v2";

export function interviewStorageKey(workspaceId?: string | null): string {
  if (workspaceId) return `${LOCAL_STORAGE_KEY}.${workspaceId}`;
  return LOCAL_STORAGE_KEY;
}

export function createLocalInterviewPersistence(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
  workspaceId?: string | null,
): ClientInterviewPersistence {
  const key = interviewStorageKey(workspaceId);
  return {
    load() {
      if (!storage) return null;
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Interview;
      } catch {
        return null;
      }
    },
    save(interview: Interview) {
      if (!storage) return;
      storage.setItem(key, JSON.stringify(interview));
    },
    clear() {
      if (!storage) return;
      storage.removeItem(key);
    },
  };
}

/**
 * @future Supabase adapter — same InterviewStore interface.
 * Designed, not implemented in Mission 0.
 */
export interface SupabasePersistenceConfig {
  url: string;
  anonKey: string;
  schema?: string;
}

export class SupabasePersistenceAdapter implements PersistenceAdapter {
  readonly provider = "supabase" as const;
  readonly interviews: InterviewStore;

  constructor(config: SupabasePersistenceConfig) {
    void config;
    this.interviews = {
      async get(): Promise<Interview | null> {
        throw new Error("Supabase persistence is not implemented in Mission 0.");
      },
      async save(): Promise<Interview> {
        throw new Error("Supabase persistence is not implemented in Mission 0.");
      },
      async list(): Promise<Interview[]> {
        throw new Error("Supabase persistence is not implemented in Mission 0.");
      },
      async delete(): Promise<void> {
        throw new Error("Supabase persistence is not implemented in Mission 0.");
      },
    };
  }
}
