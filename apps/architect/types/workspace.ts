/**
 * Company Memory & Living Workspace — Mission 2 domain contracts.
 * Interfaces + local/mock persistence only. No Supabase.
 *
 * Imports concrete interview types from `./index` via type-only imports.
 * Runtime modules should import workspace types from `@/types`.
 */

export type WorkspaceStage =
  | "Discovery"
  | "Design"
  | "Proposal"
  | "Build";

export type WorkspaceStatus =
  | "active"
  | "paused"
  | "archived";

export type DocumentKind =
  | "Interview Transcript"
  | "Proposal"
  | "PDF"
  | "Excel"
  | "Photo"
  | "Diagram"
  | "Process Map"
  | "WhatsApp Export"
  | "CRM Export"
  | "ERP Export";

export type DocumentStatus = "designed" | "planned" | "ingested";

export type TimelineCategory =
  | "discovery"
  | "recommendation"
  | "module"
  | "decision"
  | "risk"
  | "meeting"
  | "knowledge"
  | "blueprint"
  | "solution"
  | "process"
  | "deliverable"
  | "brand"
  | "implementation"
  | "company_model";

export type FutureIntakeSource =
  | "voice_recording"
  | "zoom"
  | "teams"
  | "google_meet"
  | "otter"
  | "whatsapp_export"
  | "email_import"
  | "crm_import"
  | "erp_import"
  | "pdf_upload"
  | "process_diagram";

export interface CompanyWorkspace {
  id: string;
  companyName: string;
  industry: import("./index").Industry;
  createdAt: string;
  updatedAt: string;
  currentStage: WorkspaceStage;
  businessUnderstanding: number;
  currentReport: import("./index").DiscoveryReport | null;
  meetings: Meeting[];
  observations: import("./index").Observation[];
  recommendations: import("./index").Recommendation[];
  opportunities: import("./index").Opportunity[];
  modules: import("./index").Module[];
  timeline: TimelineEvent[];
  documents: Document[];
  /** Mission 3 — company knowledge vault (evidence, not attachments). */
  knowledge: import("./knowledge").WorkspaceKnowledge;
  /**
   * Mission 4 — versioned Business OS Blueprints.
   * Append-only: never overwrite prior versions.
   */
  blueprints: import("./blueprint").BusinessBlueprint[];
  currentBlueprintId: string | null;
  /**
   * Mission 6 — Solution Architecture derived from current blueprint.
   * Regenerated when blueprint versions advance.
   */
  solutionArchitecture: import("./solution").SolutionArchitecture | null;
  /**
   * Mission 7 — Business Process Engine derived from current blueprint.
   * Canonical operational flows. Regenerated when blueprint versions advance.
   */
  businessProcesses: import("./process").BusinessProcessModel | null;
  /**
   * Mission 9 — consulting deliverables package derived from canonical models.
   * Regenerated on demand via generateDeliverables / after blueprint advances.
   */
  deliverables: import("./deliverables").DeliverablesPackage | null;
  /**
   * Mission 10 — Brand & Experience Studio derived from current blueprint.
   * Regenerated when blueprint versions advance.
   */
  brandExperience: import("./brand").BrandExperienceModel | null;
  /**
   * White Label Company Experience — consultant-configured overrides layered
   * on top of `brandExperience`. Independent of blueprint regeneration; only
   * changes when the consultant edits brand settings.
   */
  brandOverrides: import("./brand").BrandOverrides | null;
  /**
   * Mission 12 — Company Digital Twin.
   */
  companyModel: import("./company-model").CompanyModel | null;
  /**
   * Mission 18 — Implementation Package (gate + orchestration).
   * Present only when businessUnderstanding >= CONCLUSION_THRESHOLD.
   * References Blueprint / Solution / Processes / Deliverables / Consulting — never regenerates them.
   */
  implementationPackage: import("./implementation-package").ImplementationPackage | null;
  /**
   * Mission 15 — Continuous company evolution history.
   * Append-only snapshots / milestones — never overwrite prior captures.
   */
  evolutionHistory: import("./history").CompanyEvolutionHistory;
  people: Person[];
  openQuestions: string[];
  painPoints: import("./index").PainPoint[];
  status: WorkspaceStatus;
  lastActivityAt: string;
  lastActivityLabel: string;
  suggestedNextMeeting: string | null;
  conversationMemory: import("./index").ConversationMemory | null;
  activeInterviewId: string | null;
  lastMeetingId: string | null;
  /**
   * Consulting Intelligence Agent — internal working memory.
   *
   * INTERNAL ONLY. Never rendered in Client Mode: read it exclusively through
   * `consultingWorkingMemoryFor(workspace, role)` and strip it with
   * `withoutConsultingWorkingMemory` at any boundary that serializes a
   * workspace toward a client. See `CONSULTING_INTELLIGENCE_AGENT.md`.
   *
   * Optional so workspaces persisted before the agent existed stay valid —
   * a missing notebook just means no cycle has run yet.
   */
  consultingIntelligence?:
    | import("@/lib/consulting-intelligence/types").ConsultingWorkingMemory
    | null;
}

export interface Meeting {
  id: string;
  workspaceId: string;
  title: string;
  date: string;
  participants: string[];
  conversationId: string | null;
  interviewId: string | null;
  summary: string;
  discoveries: string[];
  questionsAnswered: string[];
  questionsRemaining: string[];
  generatedReport: import("./index").DiscoveryReport | null;
  businessUnderstandingAfter: number;
}

export interface Person {
  id: string;
  workspaceId: string;
  name: string;
  role: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  lastSeen: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  kind: DocumentKind;
  title: string;
  createdAt: string;
  source: string;
  status: DocumentStatus;
  metadata: Record<string, string>;
}

export interface TimelineEvent {
  id: string;
  workspaceId: string;
  date: string;
  title: string;
  description: string;
  category: TimelineCategory;
  meetingId?: string;
}

/** Stored conversation snapshot for resume continuity. */
export interface ConversationRecord {
  id: string;
  workspaceId: string;
  interviewId: string;
  createdAt: string;
  updatedAt: string;
  memory: import("./index").ConversationMemory;
  phase: string;
  participantName: string | null;
  companyName: string | null;
}

export interface WorkspaceRepository {
  get(id: string): Promise<CompanyWorkspace | null>;
  save(workspace: CompanyWorkspace): Promise<CompanyWorkspace>;
  list(): Promise<CompanyWorkspace[]>;
  delete(id: string): Promise<void>;
}

export interface MeetingRepository {
  get(id: string): Promise<Meeting | null>;
  listByWorkspace(workspaceId: string): Promise<Meeting[]>;
  save(meeting: Meeting): Promise<Meeting>;
  delete(id: string): Promise<void>;
}

export interface PersonRepository {
  get(id: string): Promise<Person | null>;
  listByWorkspace(workspaceId: string): Promise<Person[]>;
  save(person: Person): Promise<Person>;
  upsertByName(person: Person): Promise<Person>;
  delete(id: string): Promise<void>;
}

export interface DocumentRepository {
  get(id: string): Promise<Document | null>;
  listByWorkspace(workspaceId: string): Promise<Document[]>;
  save(document: Document): Promise<Document>;
  delete(id: string): Promise<void>;
}

export interface ConversationRepository {
  get(id: string): Promise<ConversationRecord | null>;
  getByWorkspace(workspaceId: string): Promise<ConversationRecord | null>;
  save(record: ConversationRecord): Promise<ConversationRecord>;
  delete(id: string): Promise<void>;
}

export interface CompanyMemoryStore {
  workspaces: WorkspaceRepository;
  meetings: MeetingRepository;
  people: PersonRepository;
  documents: DocumentRepository;
  conversations: ConversationRepository;
  readonly provider: "memory" | "local" | "supabase";
}

export type SearchTargetKind =
  | "company"
  | "person"
  | "meeting"
  | "pain_point"
  | "recommendation"
  | "observation"
  | "document"
  | "knowledge"
  | "entity"
  | "relationship"
  | "blueprint"
  | "solution"
  | "process"
  | "deliverable"
  | "brand"
  | "implementation"
  | "company_model";

export interface SearchHit {
  id: string;
  kind: SearchTargetKind;
  title: string;
  subtitle: string;
  workspaceId: string;
  href: string;
}

export interface FutureIntakeHook {
  id: FutureIntakeSource;
  title: string;
  description: string;
  status: "designed" | "planned";
  feedsInto: "company_memory";
}
