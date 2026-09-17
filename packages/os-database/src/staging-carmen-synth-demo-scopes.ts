/**
 * Carmen SYNTH = FULL V1 BUSINESS-EVALUATION membership (one login).
 * Covers all approved Company OS business views across departments.
 * Forbidden: technical / security / admin / QA bypass only — not business coverage.
 */

/** Hard-forbidden on Carmen SYNTH owner-evaluation membership. */
export const OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES = [
  'system.admin',
  'integration.admin',
  'people.admin',
  'master_data.admin',
  'qa.access',
] as const;

/**
 * Full approved V1 business-evaluation capability set for SYNTH.
 * Broad owner-eval view uses these; Vista de evaluación narrows projection only.
 * Does not invent new scope strings — only keys already used in product.
 */
export const OWNER_DEMO_SYNTH_BUSINESS_SCOPES = [
  'commercial.customer.create',
  'commercial.org.read',
  'commercial.team.read',
  'commercial.quote.convert.own',
  'commercial.order.convert',
  'commercial.price.approve',
  'commercial.account.reassign',
  'coordination.decision.record',
  'delivery.record',
  'finance.operational.record',
  'issue.manage',
  'management.org.read',
  'operations.coordinator.record',
  'production.entry.member',
  'production.operational.record',
  'production.review.member',
  'purchasing.operational.record',
  'warehouse.finished_goods.allocate',
  'warehouse.finished_goods.receive',
  'warehouse.outbound.record',
] as const;

export const OWNER_DEMO_SYNTH_SCOPE_RATIONALE: Record<
  (typeof OWNER_DEMO_SYNTH_BUSINESS_SCOPES)[number],
  string
> = {
  'commercial.customer.create': 'Create/view commercial clients in demo',
  'commercial.org.read': 'Org-wide commercial read for owner evaluation',
  'commercial.team.read': 'Team commercial visibility',
  'commercial.quote.convert.own': 'Explicit own-quote → Pedido',
  'commercial.order.convert': 'Supported convert path where product requires it',
  'commercial.price.approve': 'Commercial exception approval as business capability (not people.admin)',
  'commercial.account.reassign': 'Governed commercial owner reassignment UI (not people admin)',
  'coordination.decision.record': 'Coordination decision evidence',
  'delivery.record': 'Delivery Note / delivery evidence + DN PDF',
  'finance.operational.record': 'Finance operational desk (non-ledger)',
  'issue.manage': 'Issue create/resolve in demo',
  'management.org.read': 'Gerencia factual metrics',
  'operations.coordinator.record': 'Ops coordinator facts / reviews',
  'production.entry.member': 'Production entry facts',
  'production.operational.record': 'Production operational notes',
  'production.review.member': 'Production review when requested',
  'purchasing.operational.record': 'Purchasing review context',
  'warehouse.finished_goods.allocate': 'Supported FG allocation evidence',
  'warehouse.finished_goods.receive': 'Finished-goods receipt evidence',
  'warehouse.outbound.record': 'Salida / outbound record',
};

export function filterOwnerDemoSynthScopes(keys: readonly string[]): string[] {
  const forbidden = new Set<string>(OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES);
  const allowed = new Set<string>(OWNER_DEMO_SYNTH_BUSINESS_SCOPES);
  return [...new Set(keys.filter((k) => !forbidden.has(k) && allowed.has(k)))].sort();
}
