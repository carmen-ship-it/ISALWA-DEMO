import { z } from 'zod';

/**
 * Pedido especial is an explicit human classification.
 * There is no numeric threshold. Quantity, amount, and line count never classify.
 * Later rules may automate. This writer refuses them.
 *
 * Customer and production dates are not stored here and are not columns on OsOrder.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * CROSS_LANE: merge prisma/fragments/special-order.prisma into schema.prisma.
 */

export const SPECIAL_ORDER_SOURCE = 'human_explicit' as const;
export const SPECIAL_ORDER_CLASSIFICATIONS = ['normal', 'special'] as const;
export type SpecialOrderClassificationKind = (typeof SPECIAL_ORDER_CLASSIFICATIONS)[number];

/** There is no N. Do not invent one. */
export const SPECIAL_ORDER_NUMERIC_THRESHOLD: null = null;

export const SPECIAL_ORDER_LABEL = 'Pedido especial' as const;
export const NORMAL_ORDER_LABEL = 'Pedido normal' as const;
export const UNCLASSIFIED_ORDER_LABEL = 'Sin clasificación registrada' as const;
export const PRODUCTION_PLANNING_LABEL = 'Requiere planificación de producción' as const;

export function specialOrderHasNumericThreshold(): false {
  return false;
}

/** Size never creates a Pedido especial. */
export function classifyPedidoFromQuantity(_quantity: unknown): null {
  return null;
}

export function automaticSpecialOrderRule(): null {
  return null;
}

/** Special does not imply production planning. Both fields are explicit. */
export function specialImpliesProductionPlanning(): false {
  return false;
}

const FORBIDDEN_AUTOMATIC_KEYS = [
  'quantity',
  'amount',
  'amountCentavos',
  'totalCentavos',
  'threshold',
  'minimum',
  'greaterThan',
  'lineCount',
  'rule',
  'automatic',
] as const;

export type SpecialOrderFailure =
  | 'explicit_required'
  | 'automatic_rule_refused'
  | 'actor_required'
  | 'source_required'
  | 'timestamp_required'
  | 'tenant_required'
  | 'order_required';

export type SpecialOrderAudit = {
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof SPECIAL_ORDER_SOURCE;
  recordedAt: string;
  previousClassification: SpecialOrderClassificationKind | null;
  previousRequiresProductionPlanning: boolean | null;
};

export type SpecialOrderRecord = {
  id: string;
  organizationId: string;
  orderId: string;
  classification: SpecialOrderClassificationKind;
  pedidoEspecial: boolean;
  requiresProductionPlanning: boolean;
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof SPECIAL_ORDER_SOURCE;
  recordedAt: string;
  audit: SpecialOrderAudit;
  numericThreshold: null;
  attachedToOsOrder: false;
};

const classifySchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    classification: z.enum(SPECIAL_ORDER_CLASSIFICATIONS),
    requiresProductionPlanning: z.boolean(),
    actorMemberId: z.string().trim().min(1).nullable().optional(),
    actorLabel: z.string().trim().min(1),
    source: z.literal(SPECIAL_ORDER_SOURCE),
    recordedAt: z.string().datetime(),
    previousClassification: z.enum(SPECIAL_ORDER_CLASSIFICATIONS).nullable().optional(),
    previousRequiresProductionPlanning: z.boolean().nullable().optional(),
  })
  .strict();

export function classifySpecialOrder(
  input: unknown,
): { ok: true; value: SpecialOrderRecord } | { ok: false; reason: SpecialOrderFailure } {
  if (input && typeof input === 'object') {
    for (const key of FORBIDDEN_AUTOMATIC_KEYS) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        return { ok: false, reason: 'automatic_rule_refused' };
      }
    }
    const source = (input as { source?: unknown }).source;
    if (source != null && source !== SPECIAL_ORDER_SOURCE) {
      return { ok: false, reason: 'automatic_rule_refused' };
    }
  }

  const parsed = classifySchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.'));
    if (fields.includes('actorLabel') || fields.includes('actorMemberId')) {
      return { ok: false, reason: 'actor_required' };
    }
    if (fields.includes('source')) return { ok: false, reason: 'source_required' };
    if (fields.includes('recordedAt')) return { ok: false, reason: 'timestamp_required' };
    if (fields.includes('organizationId')) return { ok: false, reason: 'tenant_required' };
    if (fields.includes('orderId')) return { ok: false, reason: 'order_required' };
    return { ok: false, reason: 'explicit_required' };
  }

  const value = parsed.data;
  return {
    ok: true,
    value: {
      id: value.id,
      organizationId: value.organizationId,
      orderId: value.orderId,
      classification: value.classification,
      pedidoEspecial: value.classification === 'special',
      requiresProductionPlanning: value.requiresProductionPlanning,
      actorMemberId: value.actorMemberId ?? null,
      actorLabel: value.actorLabel,
      source: SPECIAL_ORDER_SOURCE,
      recordedAt: value.recordedAt,
      numericThreshold: SPECIAL_ORDER_NUMERIC_THRESHOLD,
      attachedToOsOrder: false,
      audit: {
        actorMemberId: value.actorMemberId ?? null,
        actorLabel: value.actorLabel,
        source: SPECIAL_ORDER_SOURCE,
        recordedAt: value.recordedAt,
        previousClassification: value.previousClassification ?? null,
        previousRequiresProductionPlanning: value.previousRequiresProductionPlanning ?? null,
      },
    },
  };
}
