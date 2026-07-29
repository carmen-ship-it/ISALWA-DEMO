/**
 * ISALWA Architect — core domain types.
 * Everything is typed. No `any`.
 */

export type ParticipantRole =
  | "founder"
  | "owner"
  | "sales"
  | "operations"
  | "finance"
  | "production"
  | "support"
  | "other";

export type Industry =
  | "manufacturing"
  | "construction"
  | "distribution"
  | "healthcare"
  | "retail"
  | "services"
  | "other"
  | "unknown";

export type DiscoveryPhase =
  | "welcome"
  | "role"
  | "name"
  | "company"
  | "business"
  | "interview"
  | "synthesizing"
  | "complete";

export type QuestionKind = "choice" | "text" | "long_text" | "confirmation";

export type ObservationSeverity = "info" | "notable" | "critical";

export type PainCategory =
  | "duplicate_work"
  | "manual_work"
  | "spreadsheet"
  | "messaging"
  | "paper"
  | "approvals"
  | "visibility"
  | "reporting"
  | "phone"
  | "repeated_work"
  | "other";

export type ComplexityLevel = "low" | "moderate" | "high" | "very_high";

export type TimelineEstimate =
  | "4–8 weeks"
  | "2–4 months"
  | "4–6 months"
  | "6–12 months"
  | "12+ months";

export type AgentRole =
  | "architect"
  | "business_analyst"
  | "operations_consultant"
  | "sales_consultant"
  | "process_auditor"
  | "technical_architect"
  | "ai_strategist";

export type AgentStatus = "active" | "planned" | "disabled";

export type DiscoveryDimension =
  | "sales"
  | "customers"
  | "geography"
  | "team"
  | "operations"
  | "finance"
  | "production"
  | "systems";

export type OpportunityImpact = "quick_win" | "medium" | "high" | "strategic";

export type EvidenceRef = {
  answerId?: string;
  quote: string;
};

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  status: AgentStatus;
  capabilities: readonly string[];
}

export interface Interview {
  id: string;
  createdAt: string;
  updatedAt: string;
  phase: DiscoveryPhase;
  /** Links this interview session to a durable company workspace (Mission 2). */
  workspaceId: string | null;
  participant: ParticipantProfile;
  business: BusinessProfile;
  conversation: ConversationState;
  memory: ConversationMemory;
  observations: Observation[];
  opportunities: Opportunity[];
  insights: ConsultantInsight[];
  report: DiscoveryReport | null;
  estimatedMinutesRemaining: number;
  estimatedTotalMinutes: number;
}

export interface ParticipantProfile {
  role: ParticipantRole | null;
  name: string | null;
  companyName: string | null;
}

export interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
  choices?: Choice[];
  placeholder?: string;
  helpText?: string;
  topic?: string;
  questionKey?: string;
  industryHint?: Industry;
  dimension?: DiscoveryDimension;
  priority?: number;
}

export interface Choice {
  id: string;
  label: string;
  value: string;
}

export interface Answer {
  id: string;
  questionId: string;
  value: string;
  answeredAt: string;
  raw?: string;
}

export interface Observation {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  severity: ObservationSeverity;
  signals: string[];
  relatedTopics: string[];
  evidence: string[];
  risk?: string;
  recommendation?: string;
  confidence?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  priority: "now" | "next" | "later";
  relatedPainPoints: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  impact: OpportunityImpact;
  description: string;
  evidence: string[];
  createdAt: string;
}

export interface ConsultantInsight {
  id: string;
  kind: "observation" | "risk" | "recommendation";
  title: string;
  body: string;
  evidence: string[];
  createdAt: string;
  confidence: number;
}

export interface Module {
  id: string;
  name: string;
  purpose: string;
  priority: "core" | "supporting" | "future";
  dependsOn: string[];
}

export interface Workflow {
  id: string;
  name: string;
  summary: string;
  steps: string[];
  friction: string[];
  owners: string[];
}

export interface PainPoint {
  id: string;
  title: string;
  description: string;
  category: PainCategory;
  severity: ObservationSeverity;
  evidence: string[];
}

export interface BusinessProfile {
  companyName: string | null;
  description: string | null;
  industry: Industry;
  industryConfidence: number;
  sizeHint: string | null;
  currentTools: string[];
  signals: DetectedSignal[];
  departments: string[];
  revenueStage: string | null;
  businessModel: string | null;
}

export interface IndustryProfile {
  id: Industry;
  label: string;
  keywords: readonly string[];
  focusAreas: readonly string[];
  starterQuestions: readonly string[];
}

export interface DetectedSignal {
  id: string;
  label: string;
  category: PainCategory | "industry" | "tool" | "process";
  evidence: string;
  confidence: number;
}

export interface ConversationTurn {
  id: string;
  role: "architect" | "participant";
  content: string;
  createdAt: string;
  questionId?: string;
  answerId?: string;
}

export interface ConversationState {
  turns: ConversationTurn[];
  currentQuestion: Question | null;
  answers: Answer[];
  topicsCovered: string[];
  topicsRemaining: string[];
  interviewQuestionCount: number;
  readyConfirmed: boolean;
}

/** Consultant working memory — evolves after every answer. */
export interface ConversationMemory {
  summary: BusinessSummary;
  knownFacts: KnownFact[];
  unknownFacts: UnknownFact[];
  hypotheses: Hypothesis[];
  assumptions: Assumption[];
  contradictions: Contradiction[];
  painPoints: PainPoint[];
  improvementIdeas: ImprovementIdea[];
  questionsRemaining: UnknownFact[];
  askedQuestionKeys: string[];
  followUpQueue: QuestionCandidate[];
  score: DiscoveryScore;
  whiteboard: WhiteboardState;
  /** Mission 5 — deterministic consulting evaluation (no LLM). */
  consulting: import("./consulting").ConsultingIntelligence;
}

export interface BusinessSummary {
  companyName: string | null;
  industry: Industry;
  industryLabel: string;
  industryConfidence: number;
  departments: string[];
  currentSoftware: string[];
  companySize: string | null;
  revenueStage: string | null;
  businessModel: string | null;
  customerCountHint: string | null;
  teamHint: string | null;
  geographyHint: string | null;
  painPoints: string[];
  opportunities: string[];
  missingInformation: string[];
  confidenceScore: number;
  belief: string;
}

export interface KnownFact {
  id: string;
  key: string;
  statement: string;
  evidence: string[];
  confidence: number;
  dimension?: DiscoveryDimension;
  createdAt: string;
}

export interface UnknownFact {
  id: string;
  key: string;
  label: string;
  priority: number;
  dimension: DiscoveryDimension;
  reason: string;
}

export interface Hypothesis {
  id: string;
  statement: string;
  confidence: number;
  evidence: string[];
  status: "active" | "confirmed" | "rejected";
}

export interface Assumption {
  id: string;
  statement: string;
  risk: string;
}

export interface Contradiction {
  id: string;
  /** Soft clarification language — never accusatory. */
  statement: string;
  evidence: string[];
  confidence?: number;
  claimA?: string;
  claimB?: string;
}

export interface ImprovementIdea {
  id: string;
  title: string;
  impact: OpportunityImpact;
  evidence: string[];
}

export type QuestionEstimatedImpact =
  | "critical"
  | "high"
  | "medium"
  | "low";

export interface QuestionCandidate {
  key: string;
  prompt: string;
  kind: QuestionKind;
  dimension: DiscoveryDimension;
  priority: number;
  reason: string;
  followUpOf?: string;
  placeholder?: string;
  /** Mission 10 — what answering reveals about the business. */
  expectedLearning?: string;
  /** Mission 10 — why this matters commercially / operationally. */
  businessValue?: string;
  /** Mission 10 — expected discovery-confidence lift (0–100). */
  confidenceGain?: number;
  /** Mission 10 — estimated decision / risk impact if answered. */
  estimatedImpact?: QuestionEstimatedImpact;
}

export interface DimensionStatus {
  id: DiscoveryDimension;
  label: string;
  covered: boolean;
  confidence: number;
  /** false when the dimension is not relevant for this industry (e.g. production for services). */
  applicable?: boolean;
}

export interface DiscoveryScore {
  overall: number;
  dimensions: DimensionStatus[];
  readyToConclude: boolean;
  stillNeed: string[];
}

export interface WhiteboardState {
  businessModel: string | null;
  commercialTeam: string | null;
  customers: string | null;
  currentSystems: string[];
  painPoints: string[];
  potentialModules: string[];
  /** Mission 5 — consulting whiteboard layers */
  facts: string[];
  hypotheses: string[];
  risks: string[];
  unknowns: string[];
  assumptions: string[];
  contradictions: string[];
  ideas: string[];
  opportunities: string[];
}

export interface DiscoveryReport {
  id: string;
  generatedAt: string;
  executiveSummary: string;
  businessSnapshot: string;
  companySummary: string;
  currentWorkflow: Workflow[];
  currentSystems: string[];
  risks: string[];
  operationalBottlenecks: string[];
  departmentAnalysis: DepartmentAnalysis[];
  softwareRecommendations: string[];
  painPoints: PainPoint[];
  opportunities: Recommendation[];
  potentialModules: Module[];
  suggestedRoadmap: RoadmapPhase[];
  estimatedPhases: string[];
  estimatedComplexity: ComplexityLevel;
  estimatedTimeline: TimelineEstimate;
  riskAreas: string[];
  aiOpportunities: string[];
  futureIntegrations: string[];
  unansweredQuestions: string[];
  executiveConclusion: string;
  /** Mission 5 — consulting intelligence snapshot for McKinsey-grade reports */
  consultingMaturity?: string;
  consultingHealth?: string;
  consultingRisks?: string[];
  consultingContradictions?: string[];
  consultingOpportunities?: string[];
}

export interface DepartmentAnalysis {
  department: string;
  findings: string;
  evidence: string[];
}

export interface RoadmapPhase {
  id: string;
  name: string;
  horizon: string;
  outcomes: string[];
  modules: string[];
}

/** Persistence contracts — interfaces only for Mission 0. */
export interface InterviewStore {
  get(id: string): Promise<Interview | null>;
  save(interview: Interview): Promise<Interview>;
  list(): Promise<Interview[]>;
  delete(id: string): Promise<void>;
}

export interface PersistenceAdapter {
  interviews: InterviewStore;
  readonly provider: "memory" | "local" | "supabase";
}

/** OpenAI-compatible LLM abstraction — no vendor lock. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionChunk {
  content: string;
  done: boolean;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: ChatCompletionRequest): Promise<string>;
  stream?(
    request: ChatCompletionRequest,
  ): AsyncIterable<ChatCompletionChunk>;
}

export interface ArchitectTurnInput {
  interview: Interview;
  latestAnswer?: Answer;
}

export interface ArchitectTurnResult {
  interview: Interview;
  architectMessage: string;
  observations: Observation[];
  report: DiscoveryReport | null;
}

/**
 * Future evidence intake — designed so reasoning stays unchanged.
 * Voice, transcripts, docs, ERP/CRM/email/WhatsApp attach here.
 */
export type EvidenceKind =
  | "utterance"
  | "voice_transcript"
  | "meeting_transcript"
  | "document"
  | "erp_import"
  | "crm_import"
  | "email"
  | "whatsapp_export"
  | "photo"
  | "org_chart";

export interface EvidencePacket {
  id: string;
  kind: EvidenceKind;
  text: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

/** Future capability placeholders — design only. */
export type FutureCapabilityId =
  | "voice_interviews"
  | "document_upload"
  | "org_charts"
  | "photo_analysis"
  | "process_diagrams"
  | "erp_imports"
  | "crm_imports"
  | "whatsapp_imports"
  | "email_analysis"
  | "meeting_transcript_analysis";

export interface FutureCapability {
  id: FutureCapabilityId;
  title: string;
  description: string;
  status: "designed" | "planned" | "built";
}

export type {
  CompanyMemoryStore,
  CompanyWorkspace,
  ConversationRecord,
  ConversationRepository,
  Document,
  DocumentKind,
  DocumentRepository,
  DocumentStatus,
  FutureIntakeHook,
  FutureIntakeSource,
  Meeting,
  MeetingKind,
  MeetingRepository,
  Person,
  PersonRepository,
  SearchHit,
  SearchTargetKind,
  TimelineCategory,
  TimelineEvent,
  WorkspaceRepository,
  WorkspaceStage,
  WorkspaceStatus,
} from "./workspace";

export type {
  CompanyEvolutionHistory,
  CompanySnapshot,
  EvolutionChangeArea,
  EvolutionChangeItem,
  EvolutionChangePolarity,
  EvolutionMilestone,
  EvolutionMilestoneKind,
  EvolutionTimelineEntry,
  SnapshotComparison,
  SnapshotModuleRef,
  SnapshotProcessSummary,
  SnapshotRecommendationRef,
  SnapshotRiskRef,
  SnapshotRoadmapPhase,
} from "./history";


export type {
  ChunkEmbeddingStatus,
  KnowledgeAsset,
  KnowledgeAssetStatus,
  KnowledgeAssetType,
  KnowledgeBusinessRule,
  KnowledgeCategory,
  KnowledgeChunkRecord,
  KnowledgeConnector,
  KnowledgeConnectorId,
  KnowledgeContradictionFlag,
  KnowledgeCoverageArea,
  KnowledgeCoverageSlice,
  KnowledgeEntity,
  KnowledgeEntityKind,
  KnowledgeEvidenceLogEntry,
  KnowledgeExtractionProvider,
  KnowledgeExtractionProviderId,
  KnowledgePipelineStage,
  KnowledgeReasoningContext,
  KnowledgeRelationKind,
  KnowledgeRelationship,
  DocumentStorageProviderId,
  PipelineStageId,
  WorkspaceKnowledge,
} from "./knowledge";

export type {
  AccessibilityProfile,
  BrandAssetKind,
  BrandAssetUploadProvider,
  BrandEvidenceRef,
  BrandEvidenceSource,
  BrandExperienceModel,
  BrandFutureIntakeKind,
  BrandFutureOutput,
  BrandFutureOutputKind,
  BrandOverrides,
  BrandProfile,
  BrandRecommendation,
  BrandReportBrandingOverrides,
  ColorToken,
  ColorTokenRole,
  ContrastTarget,
  DesignTokens,
  ExperienceDensity,
  ExperienceProfile,
  FormalityLevel,
  FutureWhiteLabelConfig,
  LogoAssetRef,
  MotionPreference,
  NavigationPattern,
  NavigationPreference,
  NotificationChannelPreference,
  RegionalFormatPreference,
  SpacingRhythm,
  TerminologyEntry,
  TerminologyProfile,
  ThemeMode,
  ThemeRecommendation,
  TypographyToken,
} from "./brand";

export type {
  ArchitectureHorizon,
  ArchitectureState,
  BlueprintCapability,
  BlueprintCapabilityName,
  BlueprintDepartment,
  BlueprintDepartmentName,
  BlueprintEntity,
  BlueprintEvidenceRef,
  BlueprintEvidenceSource,
  BlueprintFutureOutput,
  BlueprintFutureOutputKind,
  BlueprintIntegration,
  BlueprintModule,
  BlueprintWorkflow,
  BlueprintWorkflowStep,
  BusinessBlueprint,
  FutureArchitecture,
  OperatingRule,
  OpportunityHorizon,
  OpportunityMatrixItem,
  PainPointMatrixCategory,
  PainPointMatrixItem,
  SystemInventoryItem,
  WorkspaceBlueprintStore,
} from "./blueprint";

export type {
  BusinessHealthModel,
  ConsultingConfidence,
  ConsultingIntelligence,
  ConsultingOpportunity,
  ConsultingOpportunityHorizon,
  ConsultingPattern,
  ConsultingRecommendation,
  ConsultingRisk,
  ConsultingRiskPatternId,
  HealthDimension,
  MaturityDimension,
  MaturityModel,
  OpportunityDifficulty,
  PotentialContradiction,
  RiskSeverity,
  ScoredDimension,
} from "./consulting";

export type {
  ConceptualApi,
  ConceptualField,
  ConceptualTable,
  ImplementationPhase,
  SolutionAiAgent,
  SolutionApprovalRule,
  SolutionArchitecture,
  SolutionBusinessRule,
  SolutionEntity,
  SolutionEntityName,
  SolutionEvidenceRef,
  SolutionEvidenceSource,
  SolutionFutureOutput,
  SolutionFutureOutputKind,
  SolutionIntegration,
  SolutionModule,
  SolutionModuleName,
  SolutionNavItem,
  SolutionPermission,
  SolutionRelationship,
  SolutionRelationshipSource,
  SolutionRole,
  SolutionRoleName,
  SolutionWorkflowRef,
} from "./solution";

export type {
  BusinessProcessModel,
  ProcessActor,
  ProcessApproval,
  ProcessAutomationCandidate,
  ProcessBottleneck,
  ProcessBottleneckKind,
  ProcessDependency,
  ProcessDocumentRef,
  ProcessEvidenceRef,
  ProcessEvidenceSource,
  ProcessException,
  ProcessHandoff,
  ProcessMetrics,
  ProcessRiskLevel,
  ProcessStep,
  ProcessWorkflow,
  ProcessWorkflowStatus,
} from "./process";

export type {
  BacklogEpic,
  BacklogFeature,
  BacklogStory,
  BlueprintDeliverable,
  BusinessAssessmentDeliverable,
  CursorContextDeliverable,
  DeliverableEvidenceRef,
  DeliverableExportContract,
  DeliverableExportTarget,
  DeliverableKind,
  DeliverablesPackage,
  DevelopmentRoadmapDeliverable,
  ExecutiveSummaryDeliverable,
  ImplementationPlanDeliverable,
  PrdDeliverable,
  ProcessBookDeliverable,
  ProcessBookWorkflow,
  ProposalDeliverable,
  DeliverableRoadmapPhase,
  SolutionDeliverable,
  SprintBacklogDeliverable,
  TechnicalArchitectureDeliverable,
} from "./deliverables";




export type {
  AiPlaybookContent,
  AiPlaybookItem,
  BusinessBlueprintLivingContent,
  CompanyPlaybookContent,
  EmployeeHandbookContent,
  EmployeeHandbookSection,
  ImprovementRoadmapContent,
  ImprovementRoadmapItem,
  JobDescriptionDoc,
  JobDescriptionLibraryContent,
  KnowledgeFingerprint,
  LivingDeliverableContent,
  LivingDeliverableEvidenceRef,
  LivingDeliverableKind,
  LivingDeliverableOverview,
  LivingDeliverableVersion,
  LivingDeliverablesState,
  SopDocument,
  SopLibraryContent,
  SopStep,
  TrainingAcademyContent,
  TrainingModuleOutline,
} from "./living-deliverables";

export type {
  CompanyModelEvidenceSource,
  CompanyRelationshipKind,
  CompanyOwnershipKind,
  CompanyPartyKind,
  CompanyDependencyKind,
  CompanyDependencyCriticality,
  CompanyModelHealthBand,
  CompanyInformationRole,
  CompanyModelEvidenceRef,
  CompanyOrganization,
  CompanyDepartment,
  CompanyRole,
  CompanyPerson,
  CompanySystem,
  CompanyParty,
  CompanyProduct,
  CompanyWorkflowRef,
  CompanyInformationNode,
  CompanyApprovalRef,
  CompanyOwnership,
  CompanyRelationship,
  CompanyInformationFlow,
  CompanyDecisionFlow,
  CompanyDependency,
  CompanyModelHealth,
  CompanyModel,
} from "./company-model";

export type {
  ArchitectRole,
  ArchitectSession,
  AuthCapability,
  AuthProfile,
  AuthRepository,
  CompanyMembership,
  CompanyMembershipKind,
  LoginCredentials,
} from "./auth";

export type {
  ImplementationArtifactRef,
  ImplementationPackage,
  ImplementationPackageGate,
  ImplementationPackageStatus,
  ImplementationSectionId,
  ImplementationSectionRef,
  ImplementationSourceEngine,
} from "./implementation-package";

