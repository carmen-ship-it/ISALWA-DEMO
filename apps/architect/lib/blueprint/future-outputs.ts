import type { BlueprintFutureOutput } from "@/types";

/**
 * Future outputs generated FROM the Business Blueprint.
 * Nothing generated in Mission 4 — architecture only.
 */
export const BLUEPRINT_FUTURE_OUTPUTS: readonly BlueprintFutureOutput[] = [
  {
    id: "process_maps",
    title: "Process Maps",
    description: "Visualize blueprint workflows as living process diagrams.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "proposal_pdfs",
    title: "Proposal PDFs",
    description: "Executive proposals sourced from capabilities and opportunities.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "technical_prds",
    title: "Technical PRDs",
    description: "Product requirements derived from modules and entities.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "epic_backlogs",
    title: "Epic Backlogs",
    description: "Delivery epics mapped from capability gaps.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "cursor_prompts",
    title: "Cursor Prompts",
    description: "Implementation prompts grounded in blueprint structure.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "architecture_documents",
    title: "Architecture Documents",
    description: "System architecture narratives from future architecture states.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "implementation_roadmaps",
    title: "Implementation Roadmaps",
    description: "Phased roadmaps from opportunity matrix horizons.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "isalwa_configuration",
    title: "ISALWA Configuration",
    description: "OS project genesis from modules, entities, and rules.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "software_estimates",
    title: "Software Estimates",
    description: "Effort ranges from complexity, modules, and integrations.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "rfp_responses",
    title: "RFP Responses",
    description: "Structured RFP answers grounded in the operating blueprint.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
] as const;
