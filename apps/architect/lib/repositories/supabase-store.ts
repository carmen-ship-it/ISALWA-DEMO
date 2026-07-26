/**
 * Supabase-backed CompanyMemoryStore — same interfaces as LocalCompanyMemoryStore.
 * Pilot: single ISALWA workspace (ws_isalwa), JSONB documents + RLS.
 */

import type {
  CompanyMemoryStore,
  ConversationRecord,
  ConversationRepository,
  Document,
  DocumentRepository,
  Meeting,
  MeetingRepository,
  Person,
  PersonRepository,
  WorkspaceRepository,
  CompanyWorkspace,
} from "@/types";
import {
  createSeedBundle,
  createSeedWorkspaces,
  type WorkspaceBundle,
} from "@/lib/workspace/seed";
import { createBrowserSupabaseClient } from "@/lib/auth/supabase/browser";
import {
  PILOT_COMPANY_NAME,
  PILOT_COMPANY_WORKSPACE_ID,
} from "@/lib/auth/constants";
import {
  migrateBundle,
  WORKSPACE_STORAGE_KEY,
} from "@/lib/repositories/migrate";

const LS_MIGRATED_FLAG = "isalwa.architect.migrated_to_supabase.v1";

type WorkspaceRow = {
  id: string;
  company_name: string;
  data: CompanyWorkspace & { _seedPending?: boolean };
  updated_at: string;
};

type ConversationRow = {
  id: string;
  workspace_id: string;
  data: ConversationRecord;
  updated_at: string;
};

function isSeedPending(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      "_seedPending" in data &&
      (data as { _seedPending?: boolean })._seedPending,
  );
}

function readLocalBundle(): WorkspaceBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceBundle;
  } catch {
    return null;
  }
}

function markLocalMigrated(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_MIGRATED_FLAG, new Date().toISOString());
}

function wasLocalMigrated(): boolean {
  if (typeof window === "undefined") return true;
  return Boolean(window.localStorage.getItem(LS_MIGRATED_FLAG));
}

class BundleWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly getBundle: () => WorkspaceBundle,
    private readonly persist: () => Promise<void>,
    private readonly refresh: () => Promise<void>,
  ) {}

  async get(id: string): Promise<CompanyWorkspace | null> {
    await this.refresh();
    return this.getBundle().workspaces.find((w) => w.id === id) ?? null;
  }

  async save(workspace: CompanyWorkspace): Promise<CompanyWorkspace> {
    await this.refresh();
    const { evolveCompanyHistory } = await import("@/lib/history");
    const { workspace: evolved } = evolveCompanyHistory(workspace);
    const bundle = this.getBundle();
    const index = bundle.workspaces.findIndex((w) => w.id === evolved.id);
    if (index >= 0) {
      bundle.workspaces[index] = evolved;
    } else {
      bundle.workspaces.push(evolved);
    }
    await this.persist();
    return evolved;
  }

  async list(): Promise<CompanyWorkspace[]> {
    await this.refresh();
    return [...this.getBundle().workspaces].sort((a, b) =>
      b.lastActivityAt.localeCompare(a.lastActivityAt),
    );
  }

  async delete(id: string): Promise<void> {
    await this.refresh();
    const bundle = this.getBundle();
    bundle.workspaces = bundle.workspaces.filter((w) => w.id !== id);
    await this.persist();
  }
}

class BundleMeetingRepository implements MeetingRepository {
  constructor(
    private readonly getBundle: () => WorkspaceBundle,
    private readonly persist: () => Promise<void>,
    private readonly refresh: () => Promise<void>,
  ) {}

  private all(): Meeting[] {
    return this.getBundle().workspaces.flatMap((w) => w.meetings);
  }

  async get(id: string): Promise<Meeting | null> {
    await this.refresh();
    return this.all().find((m) => m.id === id) ?? null;
  }

  async listByWorkspace(workspaceId: string): Promise<Meeting[]> {
    await this.refresh();
    const workspace = this.getBundle().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return [];
    return [...workspace.meetings].sort((a, b) => b.date.localeCompare(a.date));
  }

  async save(meeting: Meeting): Promise<Meeting> {
    await this.refresh();
    const bundle = this.getBundle();
    const workspace = bundle.workspaces.find((w) => w.id === meeting.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${meeting.workspaceId} not found`);
    }
    const index = workspace.meetings.findIndex((m) => m.id === meeting.id);
    if (index >= 0) {
      workspace.meetings[index] = meeting;
    } else {
      workspace.meetings.push(meeting);
    }
    await this.persist();
    return meeting;
  }

  async delete(id: string): Promise<void> {
    await this.refresh();
    const bundle = this.getBundle();
    for (const workspace of bundle.workspaces) {
      workspace.meetings = workspace.meetings.filter((m) => m.id !== id);
    }
    await this.persist();
  }
}

class BundlePersonRepository implements PersonRepository {
  constructor(
    private readonly getBundle: () => WorkspaceBundle,
    private readonly persist: () => Promise<void>,
    private readonly refresh: () => Promise<void>,
  ) {}

  async get(id: string): Promise<Person | null> {
    await this.refresh();
    for (const workspace of this.getBundle().workspaces) {
      const person = workspace.people.find((p) => p.id === id);
      if (person) return person;
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<Person[]> {
    await this.refresh();
    return (
      this.getBundle().workspaces.find((w) => w.id === workspaceId)?.people ?? []
    );
  }

  async save(person: Person): Promise<Person> {
    await this.refresh();
    const bundle = this.getBundle();
    const workspace = bundle.workspaces.find((w) => w.id === person.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${person.workspaceId} not found`);
    }
    const index = workspace.people.findIndex((p) => p.id === person.id);
    if (index >= 0) {
      workspace.people[index] = person;
    } else {
      workspace.people.push(person);
    }
    await this.persist();
    return person;
  }

  async upsertByName(person: Person): Promise<Person> {
    await this.refresh();
    const bundle = this.getBundle();
    const workspace = bundle.workspaces.find((w) => w.id === person.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${person.workspaceId} not found`);
    }
    const existing = workspace.people.find(
      (p) => p.name.toLowerCase() === person.name.toLowerCase(),
    );
    if (existing) {
      const merged: Person = {
        ...existing,
        ...person,
        id: existing.id,
        notes: person.notes ?? existing.notes,
        email: person.email ?? existing.email,
        phone: person.phone ?? existing.phone,
        role: person.role ?? existing.role,
        department: person.department ?? existing.department,
      };
      return this.save(merged);
    }
    return this.save(person);
  }

  async delete(id: string): Promise<void> {
    await this.refresh();
    const bundle = this.getBundle();
    for (const workspace of bundle.workspaces) {
      workspace.people = workspace.people.filter((p) => p.id !== id);
    }
    await this.persist();
  }
}

class BundleDocumentRepository implements DocumentRepository {
  constructor(
    private readonly getBundle: () => WorkspaceBundle,
    private readonly persist: () => Promise<void>,
    private readonly refresh: () => Promise<void>,
  ) {}

  async get(id: string): Promise<Document | null> {
    await this.refresh();
    for (const workspace of this.getBundle().workspaces) {
      const document = workspace.documents.find((d) => d.id === id);
      if (document) return document;
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<Document[]> {
    await this.refresh();
    return (
      this.getBundle().workspaces.find((w) => w.id === workspaceId)?.documents ??
      []
    );
  }

  async save(document: Document): Promise<Document> {
    await this.refresh();
    const bundle = this.getBundle();
    const workspace = bundle.workspaces.find((w) => w.id === document.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${document.workspaceId} not found`);
    }
    const index = workspace.documents.findIndex((d) => d.id === document.id);
    if (index >= 0) {
      workspace.documents[index] = document;
    } else {
      workspace.documents.push(document);
    }
    await this.persist();
    return document;
  }

  async delete(id: string): Promise<void> {
    await this.refresh();
    const bundle = this.getBundle();
    for (const workspace of bundle.workspaces) {
      workspace.documents = workspace.documents.filter((d) => d.id !== id);
    }
    await this.persist();
  }
}

class BundleConversationRepository implements ConversationRepository {
  constructor(
    private readonly getBundle: () => WorkspaceBundle,
    private readonly persist: () => Promise<void>,
    private readonly refresh: () => Promise<void>,
  ) {}

  async get(id: string): Promise<ConversationRecord | null> {
    await this.refresh();
    return this.getBundle().conversations.find((c) => c.id === id) ?? null;
  }

  async getByWorkspace(workspaceId: string): Promise<ConversationRecord | null> {
    await this.refresh();
    const matches = this.getBundle().conversations.filter(
      (c) => c.workspaceId === workspaceId,
    );
    return (
      [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ??
      null
    );
  }

  async save(record: ConversationRecord): Promise<ConversationRecord> {
    await this.refresh();
    const bundle = this.getBundle();
    const index = bundle.conversations.findIndex((c) => c.id === record.id);
    if (index >= 0) {
      bundle.conversations[index] = record;
    } else {
      bundle.conversations.push(record);
    }
    await this.persist();
    return record;
  }

  async delete(id: string): Promise<void> {
    await this.refresh();
    const bundle = this.getBundle();
    bundle.conversations = bundle.conversations.filter((c) => c.id !== id);
    await this.persist();
  }
}

export type WorkspaceChangeHandler = (workspace: CompanyWorkspace) => void;

/**
 * Shared Supabase company memory for the ISALWA pilot.
 * Refresh + realtime keep Carmen and Álvaro on the same rows.
 */
export class SupabaseCompanyMemoryStore implements CompanyMemoryStore {
  readonly provider = "supabase" as const;
  readonly workspaces: WorkspaceRepository;
  readonly meetings: MeetingRepository;
  readonly people: PersonRepository;
  readonly documents: DocumentRepository;
  readonly conversations: ConversationRepository;

  private bundle: WorkspaceBundle = { workspaces: [], conversations: [] };
  private bootPromise: Promise<void> | null = null;
  private lastFetchedAt = 0;
  private readonly listeners = new Map<string, Set<WorkspaceChangeHandler>>();
  private channel: ReturnType<
    ReturnType<typeof createBrowserSupabaseClient>["channel"]
  > | null = null;

  constructor() {
    const getBundle = () => this.bundle;
    const persist = () => this.persistBundle();
    const refresh = () => this.refreshIfStale();

    this.workspaces = new BundleWorkspaceRepository(getBundle, persist, refresh);
    this.meetings = new BundleMeetingRepository(getBundle, persist, refresh);
    this.people = new BundlePersonRepository(getBundle, persist, refresh);
    this.documents = new BundleDocumentRepository(getBundle, persist, refresh);
    this.conversations = new BundleConversationRepository(
      getBundle,
      persist,
      refresh,
    );
  }

  /** Subscribe to live workspace document changes (Realtime). */
  subscribe(workspaceId: string, handler: WorkspaceChangeHandler): () => void {
    const set = this.listeners.get(workspaceId) ?? new Set();
    set.add(handler);
    this.listeners.set(workspaceId, set);
    void this.ensureRealtime();

    return () => {
      const current = this.listeners.get(workspaceId);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.listeners.delete(workspaceId);
    };
  }

  private async ensureBoot(): Promise<void> {
    if (!this.bootPromise) {
      this.bootPromise = this.bootstrap().catch((error) => {
        this.bootPromise = null;
        throw error;
      });
    }
    await this.bootPromise;
  }

  private async refreshIfStale(force = false): Promise<void> {
    await this.ensureBoot();
    const stale = Date.now() - this.lastFetchedAt > 2_000;
    if (force || stale) {
      await this.fetchRemote();
    }
  }

  private async bootstrap(): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const [{ data: workspaceRows, error: wsError }, { data: conversationRows, error: convError }] =
      await Promise.all([
        supabase.from("architect_workspaces").select("id, company_name, data, updated_at"),
        supabase
          .from("architect_conversations")
          .select("id, workspace_id, data, updated_at"),
      ]);

    if (wsError) {
      throw new Error(`Supabase workspaces: ${wsError.message}`);
    }
    if (convError) {
      throw new Error(`Supabase conversations: ${convError.message}`);
    }

    const rows = (workspaceRows ?? []) as WorkspaceRow[];
    const remoteReady = rows.some(
      (row) =>
        row.id === PILOT_COMPANY_WORKSPACE_ID &&
        row.data &&
        typeof row.data === "object" &&
        "companyName" in row.data &&
        !isSeedPending(row.data),
    );

    if (!remoteReady) {
      const local = !wasLocalMigrated() ? readLocalBundle() : null;
      if (local && local.workspaces.length > 0) {
        this.bundle = migrateBundle(local);
      } else {
        this.bundle = migrateBundle(createSeedBundle());
      }
      await this.persistBundle();
      markLocalMigrated();
    } else {
      this.applyRemoteRows(rows, (conversationRows ?? []) as ConversationRow[]);
      if (!wasLocalMigrated()) markLocalMigrated();
    }

    this.lastFetchedAt = Date.now();
    void this.ensureRealtime();
  }

  private applyRemoteRows(
    workspaceRows: WorkspaceRow[],
    conversationRows: ConversationRow[],
  ): void {
    const workspaces: CompanyWorkspace[] = [];
    for (const row of workspaceRows) {
      if (isSeedPending(row.data)) {
        const seeded = createSeedWorkspaces().find((w) => w.id === row.id);
        if (seeded) {
          workspaces.push(seeded);
          continue;
        }
      }
      if (row.data && typeof row.data === "object" && "companyName" in row.data) {
        workspaces.push({
          ...row.data,
          id: row.id,
          companyName:
            row.company_name || row.data.companyName || PILOT_COMPANY_NAME,
        });
      }
    }

    const conversations = conversationRows.map((row) => row.data).filter(Boolean);
    this.bundle = migrateBundle({ workspaces, conversations });
  }

  private async fetchRemote(): Promise<void> {
    const supabase = createBrowserSupabaseClient();

    const [{ data: workspaceRows, error: wsError }, { data: conversationRows, error: convError }] =
      await Promise.all([
        supabase.from("architect_workspaces").select("id, company_name, data, updated_at"),
        supabase
          .from("architect_conversations")
          .select("id, workspace_id, data, updated_at"),
      ]);

    if (wsError) {
      throw new Error(`Supabase workspaces: ${wsError.message}`);
    }
    if (convError) {
      throw new Error(`Supabase conversations: ${convError.message}`);
    }

    this.applyRemoteRows(
      (workspaceRows ?? []) as WorkspaceRow[],
      (conversationRows ?? []) as ConversationRow[],
    );
    this.lastFetchedAt = Date.now();
  }

  private async persistBundle(): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const now = new Date().toISOString();

    for (const workspace of this.bundle.workspaces) {
      const { error } = await supabase.from("architect_workspaces").upsert(
        {
          id: workspace.id,
          company_name: workspace.companyName,
          data: workspace,
          updated_at: now,
        },
        { onConflict: "id" },
      );
      if (error) {
        throw new Error(`Supabase workspace save: ${error.message}`);
      }
    }

    for (const conversation of this.bundle.conversations) {
      const { error } = await supabase.from("architect_conversations").upsert(
        {
          id: conversation.id,
          workspace_id: conversation.workspaceId,
          data: conversation,
          updated_at: now,
        },
        { onConflict: "id" },
      );
      if (error) {
        throw new Error(`Supabase conversation save: ${error.message}`);
      }
    }

    this.lastFetchedAt = Date.now();
  }

  private async ensureRealtime(): Promise<void> {
    if (this.channel || typeof window === "undefined") return;
    const supabase = createBrowserSupabaseClient();

    this.channel = supabase
      .channel("architect-company-memory")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "architect_workspaces",
        },
        (payload) => {
          const row = payload.new as WorkspaceRow | null;
          if (!row?.data || isSeedPending(row.data)) return;
          const workspace: CompanyWorkspace = {
            ...row.data,
            id: row.id,
            companyName: row.company_name || row.data.companyName,
          };
          const index = this.bundle.workspaces.findIndex((w) => w.id === workspace.id);
          if (index >= 0) {
            this.bundle.workspaces[index] = workspace;
          } else {
            this.bundle.workspaces.push(workspace);
          }
          this.lastFetchedAt = Date.now();
          const handlers = this.listeners.get(workspace.id);
          if (handlers) {
            for (const handler of handlers) handler(workspace);
          }
        },
      )
      .subscribe();
  }
}
