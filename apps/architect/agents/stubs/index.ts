import type {
  BusinessAnalystAgent,
  OperationsConsultantAgent,
  ProcessAuditorAgent,
  SalesConsultantAgent,
  TechnicalArchitectAgent,
  AIStrategistAgent,
} from "@/types/agents";

/**
 * Future multi-agent roster — interfaces and stubs only.
 * Do not implement behavior in Mission 0.
 */

function notImplemented(agentName: string): never {
  throw new Error(`${agentName} is designed but not implemented in Mission 0.`);
}

export const businessAnalystAgent: BusinessAnalystAgent = {
  id: "agent_business_analyst",
  role: "business_analyst",
  name: "Business Analyst",
  description: "Structures company profile, stakeholders, and operating facts.",
  status: "planned",
  capabilities: ["profile_extraction", "stakeholder_mapping"],
  analyzeProfile: async () => notImplemented("Business Analyst"),
};

export const operationsConsultantAgent: OperationsConsultantAgent = {
  id: "agent_operations_consultant",
  role: "operations_consultant",
  name: "Operations Consultant",
  description: "Deep-dives fulfillment, production, and delivery friction.",
  status: "planned",
  capabilities: ["operations_audit", "bottleneck_analysis"],
  auditOperations: async () => notImplemented("Operations Consultant"),
};

export const salesConsultantAgent: SalesConsultantAgent = {
  id: "agent_sales_consultant",
  role: "sales_consultant",
  name: "Sales Consultant",
  description: "Maps commercial motion, pipeline truth, and handoffs.",
  status: "planned",
  capabilities: ["sales_motion_mapping", "pipeline_diagnosis"],
  mapSalesMotion: async () => notImplemented("Sales Consultant"),
};

export const processAuditorAgent: ProcessAuditorAgent = {
  id: "agent_process_auditor",
  role: "process_auditor",
  name: "Process Auditor",
  description: "Detects waste, duplicate work, and control gaps.",
  status: "planned",
  capabilities: ["process_audit", "control_gap_detection"],
  auditProcesses: async () => notImplemented("Process Auditor"),
};

export const technicalArchitectAgent: TechnicalArchitectAgent = {
  id: "agent_technical_architect",
  role: "technical_architect",
  name: "Technical Architect",
  description: "Proposes modules, boundaries, and integration seams.",
  status: "planned",
  capabilities: ["module_design", "integration_boundaries"],
  proposeArchitecture: async () => notImplemented("Technical Architect"),
};

export const aiStrategistAgent: AIStrategistAgent = {
  id: "agent_ai_strategist",
  role: "ai_strategist",
  name: "AI Strategist",
  description: "Identifies sober, high-leverage AI opportunities.",
  status: "planned",
  capabilities: ["ai_opportunity_mapping", "automation_triage"],
  identifyAIOpportunities: async () => notImplemented("AI Strategist"),
};
