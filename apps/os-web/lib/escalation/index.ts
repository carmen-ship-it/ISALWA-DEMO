export { ESCALATION_COPY } from './copy';
export { CROSS_LANE_CHANGE_REQUESTS } from './cross-lane-request';
export type { CrossLaneChangeRequest } from './cross-lane-request';
export {
  deriveEscalationFromAttention,
  deriveEscalationGuidance,
  escalationInputFromAttention,
  escalationLimits,
  escalationStageRank,
  hasEscalationContent,
  mergeEscalationGuidance,
} from './derive';
export type {
  AwarenessRung,
  EscalationApprovalFact,
  EscalationBlocker,
  EscalationChain,
  EscalationContact,
  EscalationGuidance,
  EscalationImpact,
  EscalationInput,
  EscalationLimits,
  EscalationLookup,
  EscalationMember,
  EscalationPolicyInput,
  EscalationRole,
  EscalationStage,
  InformTarget,
  RelatedPerson,
} from './types';
