import type {
  Agent,
  ArchitectTurnInput,
  ArchitectTurnResult,
  ConversationState,
  DiscoveryReport,
  Interview,
  Observation,
} from "./index";

/**
 * Agent contracts for the future multi-agent system.
 * Only the Architect Agent is implemented in Mission 0.
 */

export interface AgentContext {
  interview: Interview;
  conversation: ConversationState;
  systemPrompt: string;
  industryPrompt: string | null;
}

export interface ArchitectAgent extends Agent {
  role: "architect";
  introduce(context: AgentContext): Promise<string>;
  nextQuestion(context: AgentContext): Promise<ArchitectTurnResult>;
  observe(context: AgentContext): Promise<Observation[]>;
  synthesize(context: AgentContext): Promise<DiscoveryReport>;
  handleTurn(input: ArchitectTurnInput): Promise<ArchitectTurnResult>;
}

export interface BusinessAnalystAgent extends Agent {
  role: "business_analyst";
  /** @future Extract structured business profile from conversation. */
  analyzeProfile(context: AgentContext): Promise<never>;
}

export interface OperationsConsultantAgent extends Agent {
  role: "operations_consultant";
  /** @future Deep-dive operational workflows and bottlenecks. */
  auditOperations(context: AgentContext): Promise<never>;
}

export interface SalesConsultantAgent extends Agent {
  role: "sales_consultant";
  /** @future Map commercial motion, pipeline, and handoffs. */
  mapSalesMotion(context: AgentContext): Promise<never>;
}

export interface ProcessAuditorAgent extends Agent {
  role: "process_auditor";
  /** @future Detect waste, duplicate work, and control gaps. */
  auditProcesses(context: AgentContext): Promise<never>;
}

export interface TechnicalArchitectAgent extends Agent {
  role: "technical_architect";
  /** @future Propose system modules and integration boundaries. */
  proposeArchitecture(context: AgentContext): Promise<never>;
}

export interface AIStrategistAgent extends Agent {
  role: "ai_strategist";
  /** @future Identify where AI creates leverage without theater. */
  identifyAIOpportunities(context: AgentContext): Promise<never>;
}

export type AnyAgent =
  | ArchitectAgent
  | BusinessAnalystAgent
  | OperationsConsultantAgent
  | SalesConsultantAgent
  | ProcessAuditorAgent
  | TechnicalArchitectAgent
  | AIStrategistAgent;
