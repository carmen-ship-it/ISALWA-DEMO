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
import {
  createSeedKnowledge,
  emptyWorkspaceKnowledge,
  ensureWorkspaceKnowledge,
  knowledgeTimelineEvents,
} from "@/lib/knowledge";
import {
  blueprintTimelineEvent,
  createSeedBlueprints,
  emptyBlueprints,
  ensureBlueprints,
  ensureCurrentBlueprintId,
  latestBlueprint,
} from "@/lib/blueprint";
import { deriveSolutionArchitecture } from "@/lib/solution";
import { deriveBusinessProcesses } from "@/lib/processes";
import { buildDeliverablesPackage } from "@/lib/deliverables";
import { deriveBrandExperience } from "@/lib/brand";
import { createId } from "@/lib/utils";
import {
  PILOT_COMPANY_NAME,
  PILOT_COMPANY_WORKSPACE_ID,
} from "@/lib/auth/constants";

export const WORKSPACE_STORAGE_KEY = "isalwa.architect.company_memory.v1";

/** Legacy placeholder companies that must never reach the pilot UI. */
const REMOVED_DEMO_WORKSPACE_IDS = new Set([
  "ws_acme",
  "ws_viaggio",
  "ws_abc",
]);

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

/** Drop placeholder tenants and ensure the pilot ISALWA workspace exists. */
function purgeDemoWorkspaces(bundle: WorkspaceBundle): WorkspaceBundle {
  const workspaces = bundle.workspaces
    .filter((workspace) => !REMOVED_DEMO_WORKSPACE_IDS.has(workspace.id))
    .map((workspace) =>
      workspace.id === PILOT_COMPANY_WORKSPACE_ID
        ? { ...workspace, companyName: PILOT_COMPANY_NAME }
        : workspace,
    );

  const hasPilot = workspaces.some(
    (workspace) => workspace.id === PILOT_COMPANY_WORKSPACE_ID,
  );

  return {
    ...bundle,
    workspaces: hasPilot
      ? workspaces
      : [...createSeedWorkspaces(), ...workspaces],
  };
}

/** Mission 3+4+6+7+9+10 migration — Knowledge, Blueprint, Solution, Processes, Deliverables, Brand. */
function migrateBundle(bundle: WorkspaceBundle): WorkspaceBundle {
  const purged = purgeDemoWorkspaces(bundle);
  return {
    ...purged,
    workspaces: purged.workspaces.map((workspace) => {
      let next: CompanyWorkspace = {
        ...workspace,
        solutionArchitecture: workspace.solutionArchitecture ?? null,
        businessProcesses: workspace.businessProcesses ?? null,
        deliverables: workspace.deliverables ?? null,
        brandExperience: workspace.brandExperience ?? null,
      };

      if (!next.knowledge?.assets) {
        const knowledge =
          next.id.startsWith("ws_")
            ? createSeedKnowledge(next.id)
            : emptyWorkspaceKnowledge();
        const knowledgeEvents = knowledgeTimelineEvents(next.id, knowledge);
        const existingIds = new Set(next.timeline.map((e) => e.title));
        next = {
          ...next,
          knowledge,
          timeline: [
            ...knowledgeEvents.filter((e) => !existingIds.has(e.title)),
            ...next.timeline,
          ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      } else {
        next = {
          ...next,
          knowledge: ensureWorkspaceKnowledge(next.knowledge),
        };
      }

      const blueprints = ensureBlueprints(next.blueprints);
      if (blueprints.length === 0) {
        const seeded = createSeedBlueprints({
          ...next,
          blueprints: emptyBlueprints(),
          currentBlueprintId: null,
          solutionArchitecture: null,
          businessProcesses: null,
          brandExperience: null,
          deliverables: null,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const blueprintEvents = seeded
          .map(blueprintTimelineEvent)
          .filter((e) => !existingTitles.has(e.title));
        next = {
          ...next,
          blueprints: seeded,
          currentBlueprintId: seeded[0]?.id ?? null,
          timeline: [...blueprintEvents, ...next.timeline].sort((a, b) =>
            b.date.localeCompare(a.date),
          ),
        };
      } else {
        next = {
          ...next,
          blueprints,
          currentBlueprintId: ensureCurrentBlueprintId({
            blueprints,
            currentBlueprintId: next.currentBlueprintId ?? null,
          }),
        };
      }

      const current = latestBlueprint(next.blueprints);
      if (
        current &&
        (!next.solutionArchitecture ||
          next.solutionArchitecture.blueprintId !== current.id)
      ) {
        const solutionArchitecture = deriveSolutionArchitecture({
          workspace: next,
          blueprint: current,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Solution Architecture · Blueprint v${solutionArchitecture.blueprintVersion}`;
        next = {
          ...next,
          solutionArchitecture,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: solutionArchitecture.generatedAt,
                  title,
                  description: solutionArchitecture.summary,
                  category: "solution" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      if (
        current &&
        (!next.businessProcesses ||
          next.businessProcesses.blueprintId !== current.id)
      ) {
        const businessProcesses = deriveBusinessProcesses({
          workspace: next,
          blueprint: current,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Business Processes · Blueprint v${businessProcesses.blueprintVersion}`;
        next = {
          ...next,
          businessProcesses,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: businessProcesses.generatedAt,
                  title,
                  description: businessProcesses.summary,
                  category: "process" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      if (
        current &&
        (!next.deliverables ||
          next.deliverables.blueprintId !== current.id)
      ) {
        const deliverables = buildDeliverablesPackage(next);
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Deliverables · Blueprint v${deliverables.blueprintVersion ?? current.version}`;
        next = {
          ...next,
          deliverables,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: deliverables.generatedAt,
                  title,
                  description: deliverables.summary,
                  category: "deliverable" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      if (
        current &&
        (!next.brandExperience ||
          next.brandExperience.blueprintId !== current.id)
      ) {
        const brandExperience = deriveBrandExperience({
          workspace: next,
          blueprint: current,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Brand & Experience · Blueprint v${brandExperience.blueprintVersion}`;
        next = {
          ...next,
          brandExperience,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: brandExperience.generatedAt,
                  title,
                  description: brandExperience.summary,
                  category: "brand" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      return next;
    }),
  };
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
 * Temporary source of truth until Supabase (designed, not wired).
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
      this.bundle = createSeedBundle();
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

/**
 * @future Supabase — same CompanyMemoryStore shape.
 * Designed, not implemented in Mission 2.
 */
export class SupabaseCompanyMemoryStore implements CompanyMemoryStore {
  readonly provider = "supabase" as const;
  readonly workspaces: WorkspaceRepository;
  readonly meetings: MeetingRepository;
  readonly people: PersonRepository;
  readonly documents: DocumentRepository;
  readonly conversations: ConversationRepository;

  constructor() {
    const reject = async (): Promise<never> => {
      throw new Error("Supabase company memory is not implemented in Mission 2.");
    };
    this.workspaces = {
      get: reject,
      save: reject,
      list: reject,
      delete: reject,
    };
    this.meetings = {
      get: reject,
      listByWorkspace: reject,
      save: reject,
      delete: reject,
    };
    this.people = {
      get: reject,
      listByWorkspace: reject,
      save: reject,
      upsertByName: reject,
      delete: reject,
    };
    this.documents = {
      get: reject,
      listByWorkspace: reject,
      save: reject,
      delete: reject,
    };
    this.conversations = {
      get: reject,
      getByWorkspace: reject,
      save: reject,
      delete: reject,
    };
  }
}

/** Client singleton helpers — browser only. */
let clientStore: LocalCompanyMemoryStore | null = null;

export function getClientCompanyMemoryStore(): LocalCompanyMemoryStore {
  if (typeof window === "undefined") {
    return new LocalCompanyMemoryStore(null, true);
  }
  if (!clientStore) {
    clientStore = new LocalCompanyMemoryStore(window.localStorage, true);
  }
  return clientStore;
}

export function resetClientCompanyMemoryStore(): void {
  clientStore = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }
}
