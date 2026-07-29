export { deriveSolutionArchitecture } from "./derive";
export { detectModules, buildEvidenceBlob } from "./modules";
export { detectEntities } from "./entities";
export {
  detectRelationships,
  MANUFACTURING_ENTITY_NAMES,
  hasManufacturingRelationshipEvidence,
} from "./dependencies";
export { detectRoles } from "./roles";
export { detectNavigation } from "./navigation";
export { detectWorkflows } from "./workflows";
export { detectIntegrations, detectAiAgents } from "./integrations";
export { detectDatabase } from "./database";
export { detectApis } from "./api";
export { detectRoadmap } from "./roadmap";
export { detectConfiguration } from "./configuration";
export { SOLUTION_FUTURE_OUTPUTS } from "./future-outputs";
