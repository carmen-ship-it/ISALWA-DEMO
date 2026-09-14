/**
 * Shared attention rows do not carry an escalation stage, an impact link,
 * or a customer-waiting flag. This module does not change that contract.
 * Local adaptation: derive from existing attention types, approval status,
 * owners, stored managerMemberId, and caller-supplied links already loaded.
 */

export const CROSS_LANE_CHANGE_REQUESTS = [
  {
    id: 'attention-recorded-escalation',
    lane: 'escalation-impact',
    owner: 'Agent 0',
    classification: 'SHARED_CONTRACT_BLOCKED',
    target: 'AttentionItemReadModel / ATTENTION_TYPES',
    required: false,
    request:
      'Do not add an Escalado attention type until an approved policy stores an explicit awareness fact. Local guidance uses Atención sugerida, Vencido, and Requiere atención from existing attention types only. Escalado is shown only when the caller passes a recorded escalation fact that is not on the attention row.',
    unblock:
      'An approved policy and a stored awareness fact, owned by Agent 0 on the attention contract. Do not invent the type in this lane.',
  },
  {
    id: 'attention-impact-links',
    lane: 'escalation-impact',
    owner: 'Agent 0',
    classification: 'SHARED_CONTRACT_BLOCKED',
    target: 'AttentionItemReadModel',
    required: false,
    request:
      'Attention rows do not carry quote, order, or customer-waiting links. Local guidance accepts those only as caller-supplied facts already loaded. Missing links stay omitted. Do not infer dispatch or cobranza.',
    unblock:
      'If a later shared read model is approved, expose only stored links. This lane does not require that change to integrate.',
  },
] as const;

export type CrossLaneChangeRequest = (typeof CROSS_LANE_CHANGE_REQUESTS)[number];
