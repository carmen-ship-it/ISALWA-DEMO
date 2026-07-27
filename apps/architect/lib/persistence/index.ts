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

/** A write that did not land. Surfaced to the client — never swallowed. */
export interface PersistenceFailure {
  message: string;
  at: string;
}

/** Client-side autosave — async so Supabase + local share one shape. */
export interface ClientInterviewPersistence {
  load(): Promise<Interview | null>;
  save(interview: Interview): Promise<void>;
  /**
   * Write any debounced state immediately and wait for it to land. Call
   * before unmount/navigation so the last answer is never left in memory.
   */
  flush(): Promise<void>;
  clear(): Promise<void>;
  /**
   * Notified with the current failure, or `null` once a retry succeeds.
   * Returns an unsubscribe function.
   */
  onStatusChange(
    handler: (failure: PersistenceFailure | null) => void,
  ): () => void;
  /** Detach browser listeners. Safe to call twice. */
  dispose(): void;
}

function createStatusChannel() {
  const handlers = new Set<(failure: PersistenceFailure | null) => void>();
  let current: PersistenceFailure | null = null;

  return {
    subscribe(handler: (failure: PersistenceFailure | null) => void) {
      handlers.add(handler);
      handler(current);
      return () => {
        handlers.delete(handler);
      };
    },
    emit(failure: PersistenceFailure | null) {
      current = failure;
      for (const handler of handlers) handler(failure);
    },
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido";
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
  const status = createStatusChannel();

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
      try {
        storage.setItem(key, JSON.stringify(interview));
        status.emit(null);
      } catch (error) {
        // Quota exceeded / private-mode storage — the answer is NOT saved.
        status.emit({ message: describeError(error), at: new Date().toISOString() });
      }
    },
    async flush() {},
    async clear() {
      if (!storage) return;
      storage.removeItem(key);
    },
    onStatusChange(handler) {
      return status.subscribe(handler);
    },
    dispose() {},
  };
}

/** Debounce window for keystroke-level autosave. */
const SAVE_DEBOUNCE_MS = 400;

function createSupabaseInterviewPersistence(
  workspaceId?: string | null,
): ClientInterviewPersistence {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * The newest interview not yet confirmed as written. It is only cleared
   * once Supabase accepts the row — a failed write leaves it in place so the
   * next save, flush, or page-hide retries it instead of dropping an answer.
   */
  let pending: Interview | null = null;
  let inFlight: Promise<void> | null = null;
  const status = createStatusChannel();

  const writeNow = async (): Promise<void> => {
    if (!workspaceId || !pending) return;
    const interview = pending;
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("architect_active_interviews").upsert(
        {
          workspace_id: workspaceId,
          data: interview,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" },
      );
      if (error) throw new Error(error.message);
      // Only drop the buffer if nothing newer arrived while in flight.
      if (pending === interview) pending = null;
      status.emit(null);
    } catch (error) {
      status.emit({ message: describeError(error), at: new Date().toISOString() });
      throw error;
    }
  };

  const flush = async (): Promise<void> => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (inFlight) await inFlight.catch(() => {});
    if (!pending) return;
    inFlight = writeNow().catch(() => {});
    await inFlight;
    inFlight = null;
  };

  /**
   * Navigating away or backgrounding the tab kills the debounce timer, so
   * force the buffered answer out first. `pagehide` covers back/forward and
   * tab close; `visibilitychange` covers mobile app-switching.
   */
  const onLeave = () => {
    void flush();
  };
  let attached = false;

  const attach = () => {
    if (attached || typeof window === "undefined") return;
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onLeave);
    attached = true;
  };

  attach();

  return {
    async load() {
      if (!workspaceId) return null;
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("architect_active_interviews")
        .select("data")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      // A failed read is NOT "no interview in progress". Treating it as one
      // would start a fresh interview and overwrite the saved answers, so
      // fail loudly and let the caller keep the session intact.
      if (error) {
        throw new Error(`No se pudo leer la entrevista guardada: ${error.message}`);
      }
      if (data?.data) {
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
      // Re-arm after a dispose (a StrictMode remount reuses this instance).
      attach();
      pending = interview;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void flush();
      }, SAVE_DEBOUNCE_MS);
    },
    flush,
    async clear() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      pending = null;
      if (!workspaceId) return;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("architect_active_interviews")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      if (typeof window !== "undefined") {
        await createLocalInterviewPersistence(
          window.localStorage,
          workspaceId,
        ).clear();
      }
    },
    onStatusChange(handler) {
      return status.subscribe(handler);
    },
    dispose() {
      if (typeof window === "undefined" || !attached) return;
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onLeave);
      attached = false;
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
