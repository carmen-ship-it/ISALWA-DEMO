import type { Interview, InterviewStore, PersistenceAdapter } from "@/types";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { createBrowserSupabaseClient } from "@/lib/auth/supabase/browser";

/**
 * Persistence contracts for interviews.
 * Local when Supabase unset; Supabase active_interviews table when configured.
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

/** Client-side autosave — async so Supabase + local share one shape. */
export interface ClientInterviewPersistence {
  load(): Promise<Interview | null>;
  save(interview: Interview): Promise<void>;
  clear(): Promise<void>;
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
    async load() {
      if (!storage) return null;
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Interview;
      } catch {
        return null;
      }
    },
    async save(interview: Interview) {
      if (!storage) return;
      storage.setItem(key, JSON.stringify(interview));
    },
    async clear() {
      if (!storage) return;
      storage.removeItem(key);
    },
  };
}

function createSupabaseInterviewPersistence(
  workspaceId?: string | null,
): ClientInterviewPersistence {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: Interview | null = null;

  const flush = async () => {
    if (!workspaceId || !pending) return;
    const interview = pending;
    pending = null;
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("architect_active_interviews").upsert(
      {
        workspace_id: workspaceId,
        data: interview,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    );
    if (error) {
      console.error("Supabase interview save failed:", error.message);
    }
  };

  return {
    async load() {
      if (!workspaceId) return null;
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("architect_active_interviews")
        .select("data")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!error && data?.data) {
        return data.data as Interview;
      }

      // One-time bridge from localStorage if remote empty.
      if (typeof window !== "undefined") {
        const local = createLocalInterviewPersistence(
          window.localStorage,
          workspaceId,
        );
        const fromLs = await local.load();
        if (fromLs) {
          const { error: upsertError } = await supabase
            .from("architect_active_interviews")
            .upsert(
              {
                workspace_id: workspaceId,
                data: fromLs,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id" },
            );
          if (!upsertError) await local.clear();
          return fromLs;
        }
      }
      return null;
    },
    async save(interview: Interview) {
      if (!workspaceId) return;
      pending = interview;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void flush();
      }, 400);
    },
    async clear() {
      if (saveTimer) clearTimeout(saveTimer);
      pending = null;
      if (!workspaceId) return;
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from("architect_active_interviews")
        .delete()
        .eq("workspace_id", workspaceId);
      if (typeof window !== "undefined") {
        await createLocalInterviewPersistence(
          window.localStorage,
          workspaceId,
        ).clear();
      }
    },
  };
}

/** Prefer Supabase when configured; otherwise localStorage (dev / pilot cookie). */
export function createClientInterviewPersistence(
  workspaceId?: string | null,
): ClientInterviewPersistence {
  if (typeof window !== "undefined" && isSupabaseConfigured()) {
    return createSupabaseInterviewPersistence(workspaceId);
  }
  return createLocalInterviewPersistence(
    typeof window !== "undefined" ? window.localStorage : null,
    workspaceId,
  );
}

export interface SupabasePersistenceConfig {
  url: string;
  anonKey: string;
  schema?: string;
}

/** @deprecated Use createClientInterviewPersistence — kept for type compatibility. */
export class SupabasePersistenceAdapter implements PersistenceAdapter {
  readonly provider = "supabase" as const;
  readonly interviews: InterviewStore;

  constructor(config: SupabasePersistenceConfig) {
    void config;
    this.interviews = new MemoryInterviewStore();
  }
}
