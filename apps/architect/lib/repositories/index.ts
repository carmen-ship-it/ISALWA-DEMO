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
  type WorkspaceBundle,
} from "@/lib/workspace/seed";
import { isSupabaseConfigured } from "@/lib/auth/config";
import {
  migrateBundle,
  WORKSPACE_STORAGE_KEY,
} from "@/lib/repositories/migrate";
import { SupabaseCompanyMemoryStore } from "@/lib/repositories/supabase-store";

export { WORKSPACE_STORAGE_KEY, migrateBundle } from "@/lib/repositories/migrate";
export { SupabaseCompanyMemoryStore } from "@/lib/repositories/supabase-store";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readBundle(storage: StorageLike | null): WorkspaceBundle | null {
  if (!storage) return null;
  const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkspaceBundle;
  } catch {
    return null;
  }
}

function writeBundle(storage: StorageLike | null, bundle: WorkspaceBundle): void {
  if (!storage) return;
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(bundle));
}

class MemoryWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly getBundle: () => WorkspaceBundle, private readonly persist: () => void) {}

  async get(id: string): Promise<CompanyWorkspace | null> {
    return this.getBundle().workspaces.find((w) => w.id === id) ?? null;
  }

  async save(workspace: CompanyWorkspace): Promise<CompanyWorkspace> {
    const bundle = this.getBundle();
    const index = bundle.workspaces.findIndex((w) => w.id === workspace.id);
    if (index >= 0) {
      bundle.workspaces[index] = workspace;
    } else {
      bundle.workspaces.push(workspace);
    }
    this.persist();
    return workspace;
  }

  async list(): Promise<CompanyWorkspace[]> {
    return [...this.getBundle().workspaces].sort((a, b) =>
      b.lastActivityAt.localeCompare(a.lastActivityAt),
    );
  }

  async delete(id: string): Promise<void> {
    const bundle = this.getBundle();
    bundle.workspaces = bundle.workspaces.filter((w) => w.id !== id);
    this.persist();
  }
}

class MemoryMeetingRepository implements MeetingRepository {
  constructor(private readonly getBundle: () => WorkspaceBundle, private readonly persist: () => void) {}

  private all(): Meeting[] {
    return this.getBundle().workspaces.flatMap((w) => w.meetings);
  }

  async get(id: string): Promise<Meeting | null> {
    return this.all().find((m) => m.id === id) ?? null;
  }

  async listByWorkspace(workspaceId: string): Promise<Meeting[]> {
    const workspace = this.getBundle().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return [];
    return [...workspace.meetings].sort((a, b) => b.date.localeCompare(a.date));
  }

  async save(meeting: Meeting): Promise<Meeting> {
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
    this.persist();
    return meeting;
  }

  async delete(id: string): Promise<void> {
    const bundle = this.getBundle();
    for (const workspace of bundle.workspaces) {
      workspace.meetings = workspace.meetings.filter((m) => m.id !== id);
    }
    this.persist();
  }
}

class MemoryPersonRepository implements PersonRepository {
  constructor(private readonly getBundle: () => WorkspaceBundle, private readonly persist: () => void) {}

  async get(id: string): Promise<Person | null> {
    for (const workspace of this.getBundle().workspaces) {
      const person = workspace.people.find((p) => p.id === id);
      if (person) return person;
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<Person[]> {
    return (
      this.getBundle().workspaces.find((w) => w.id === workspaceId)?.people ?? []
    );
  }

  async save(person: Person): Promise<Person> {
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
    this.persist();
    return person;
  }

  async upsertByName(person: Person): Promise<Person> {
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
    const bundle = this.getBundle();
    for (const workspace of bundle.workspaces) {
      workspace.people = workspace.people.filter((p) => p.id !== id);
    }
    this.persist();
  }
}

class MemoryDocumentRepository implements DocumentRepository {
  constructor(private readonly getBundle: () => WorkspaceBundle, private readonly persist: () => void) {}

  async get(id: string): Promise<Document | null> {
    for (const workspace of this.getBundle().workspaces) {
      const document = workspace.documents.find((d) => d.id === id);
      if (document) return document;
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<Document[]> {
    return (
      this.getBundle().workspaces.find((w) => w.id === workspaceId)?.documents ??
      []
    );
  }

  async save(document: Document): Promise<Document> {
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
    this.persist();
    return document;
  }

  async delete(id: string): Promise<void> {
    const bundle = this.getBundle();
    for (const workspace of bundle.workspaces) {
      workspace.documents = workspace.documents.filter((d) => d.id !== id);
    }
    this.persist();
  }
}

class MemoryConversationRepository implements ConversationRepository {
  constructor(private readonly getBundle: () => WorkspaceBundle, private readonly persist: () => void) {}

  async get(id: string): Promise<ConversationRecord | null> {
    return this.getBundle().conversations.find((c) => c.id === id) ?? null;
  }

  async getByWorkspace(workspaceId: string): Promise<ConversationRecord | null> {
    const matches = this.getBundle().conversations.filter(
      (c) => c.workspaceId === workspaceId,
    );
    return (
      [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ??
      null
    );
  }

  async save(record: ConversationRecord): Promise<ConversationRecord> {
    const bundle = this.getBundle();
    const index = bundle.conversations.findIndex((c) => c.id === record.id);
    if (index >= 0) {
      bundle.conversations[index] = record;
    } else {
      bundle.conversations.push(record);
    }
    this.persist();
    return record;
  }

  async delete(id: string): Promise<void> {
    const bundle = this.getBundle();
    bundle.conversations = bundle.conversations.filter((c) => c.id !== id);
    this.persist();
  }
}

/**
 * In-memory + optional localStorage persistence.
 * Used when Supabase env is unset (local/dev pilot cookie auth).
 */
export class LocalCompanyMemoryStore implements CompanyMemoryStore {
  readonly provider = "local" as const;
  readonly workspaces: WorkspaceRepository;
  readonly meetings: MeetingRepository;
  readonly people: PersonRepository;
  readonly documents: DocumentRepository;
  readonly conversations: ConversationRepository;

  private bundle: WorkspaceBundle;

  constructor(storage: StorageLike | null, seedIfEmpty = true) {
    const existing = readBundle(storage);
    if (existing && existing.workspaces.length > 0) {
      this.bundle = migrateBundle(existing);
      writeBundle(storage, this.bundle);
    } else if (seedIfEmpty) {
      this.bundle = migrateBundle(createSeedBundle());
      writeBundle(storage, this.bundle);
    } else {
      this.bundle = { workspaces: [], conversations: [] };
    }

    const getBundle = () => this.bundle;
    const persist = () => writeBundle(storage, this.bundle);

    this.workspaces = new MemoryWorkspaceRepository(getBundle, persist);
    this.meetings = new MemoryMeetingRepository(getBundle, persist);
    this.people = new MemoryPersonRepository(getBundle, persist);
    this.documents = new MemoryDocumentRepository(getBundle, persist);
    this.conversations = new MemoryConversationRepository(getBundle, persist);
  }
}

export class MemoryCompanyMemoryStore implements CompanyMemoryStore {
  readonly provider = "memory" as const;
  readonly workspaces: WorkspaceRepository;
  readonly meetings: MeetingRepository;
  readonly people: PersonRepository;
  readonly documents: DocumentRepository;
  readonly conversations: ConversationRepository;

  private readonly inner: LocalCompanyMemoryStore;

  constructor(seedIfEmpty = true) {
    this.inner = new LocalCompanyMemoryStore(null, seedIfEmpty);
    this.workspaces = this.inner.workspaces;
    this.meetings = this.inner.meetings;
    this.people = this.inner.people;
    this.documents = this.inner.documents;
    this.conversations = this.inner.conversations;
  }
}


/** Client singleton — Supabase when configured, else localStorage. */
let clientStore: CompanyMemoryStore | null = null;

export function getClientCompanyMemoryStore(): CompanyMemoryStore {
  if (typeof window === "undefined") {
    // SSR/server helpers — ephemeral memory seed (no browser storage).
    if (isSupabaseConfigured()) {
      // Server components should not touch company memory; return empty local.
      return new LocalCompanyMemoryStore(null, false);
    }
    return new LocalCompanyMemoryStore(null, true);
  }
  if (!clientStore) {
    clientStore = isSupabaseConfigured()
      ? new SupabaseCompanyMemoryStore()
      : new LocalCompanyMemoryStore(window.localStorage, true);
  }
  return clientStore;
}

export function resetClientCompanyMemoryStore(): void {
  clientStore = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }
}
