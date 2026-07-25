export { architectAgent, startInterview, IsalwaArchitectAgent } from "./architect";
export {
  businessAnalystAgent,
  operationsConsultantAgent,
  salesConsultantAgent,
  processAuditorAgent,
  technicalArchitectAgent,
  aiStrategistAgent,
} from "./stubs";

import { architectAgent } from "./architect";
import {
  aiStrategistAgent,
  businessAnalystAgent,
  operationsConsultantAgent,
  processAuditorAgent,
  salesConsultantAgent,
  technicalArchitectAgent,
} from "./stubs";
import type { Agent } from "@/types";

/** Registry for the eventual multi-agent orchestra. */
export const agentRegistry: readonly Agent[] = [
  architectAgent,
  businessAnalystAgent,
  operationsConsultantAgent,
  salesConsultantAgent,
  processAuditorAgent,
  technicalArchitectAgent,
  aiStrategistAgent,
] as const;
