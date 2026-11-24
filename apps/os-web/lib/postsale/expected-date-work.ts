/**
 * Pedido-scoped production Work builders.
 * - Plant update: CreateWorkItem without dueAt (server contract allows optional dueAt).
 * - Follow-up / expected date: CreateWorkItem with required dueAt → Attention overdue_work.
 * Does not invent reminder intervals or a parallel attention type.
 */

import {
  CreateWorkItemPayloadSchema,
  PRODUCTION_NEXT_ACTION_TITLE_PREFIX,
  PRODUCTION_UPDATE_TITLE_PREFIX,
  productionAnnotationMarker,
  productionNextActionMarker,
} from '@isalwa/os-contracts';
import { dueAtInputToIso } from '@/lib/work/follow-up';

export const PRODUCTION_EXPECTED_DATE_COPY = {
  titlePrefix: PRODUCTION_NEXT_ACTION_TITLE_PREFIX,
  titleRequired: 'Escriba la anotación operativa.',
  dueInvalid: 'La fecha del seguimiento no es válida.',
  identityMissing: 'No se pudo identificar su usuario.',
  pedidoMissing: 'Seleccione un pedido.',
  customerMissing: 'El pedido no tiene cliente heredado.',
  productMissing: 'Seleccione un producto del pedido.',
  notSaved: 'No se guardó la actualización.',
  needsDate:
    'Para crear un seguimiento indique la fecha límite. Una actualización de planta no la necesita.',
  dateRequiredHint:
    'Obligatoria para el seguimiento: queda en Trabajo y aparece en Atención al vencer.',
} as const;

export const PRODUCTION_PLANT_UPDATE_COPY = {
  titlePrefix: PRODUCTION_UPDATE_TITLE_PREFIX,
  sectionTitle: 'Registrar actualización de planta',
  action: 'Guardar actualización de planta',
  success: 'Actualización de planta guardada en Trabajo.',
  notSaved: 'No se guardó la actualización de planta.',
  hint: 'Registra lo que ocurrió en planta. No pide fecha límite.',
} as const;

export const PRODUCTION_FOLLOW_UP_COPY = {
  titlePrefix: PRODUCTION_NEXT_ACTION_TITLE_PREFIX,
  sectionTitle: 'Crear seguimiento',
  action: 'Crear seguimiento',
  dueLabel: 'Fecha límite del seguimiento',
  dueRequiredHint:
    'Obligatoria: el seguimiento se guarda en Trabajo y aparece en Atención al vencer.',
  needsDate: 'Indique la fecha límite para crear el seguimiento.',
  success: 'Seguimiento creado. Ya aparece en Trabajo.',
  notSaved: 'No se creó el seguimiento.',
  hint: 'Crea una tarea con fecha. Distinto de registrar lo que ya ocurrió en planta.',
} as const;

export type ProductionExpectedDateInput = {
  annotation: string;
  note?: string | null;
  expectedAt?: string | null;
  ownerMemberId: string;
  partyId: string;
  orderId: string;
  orderLabel: string;
  productLabel: string;
  orderLineId?: string | null;
};

export type ProductionExpectedDateBuildResult =
  | {
      ok: true;
      work: { command: 'CreateWorkItem'; payload: Record<string, unknown> } | null;
      annotation: string;
      note: string | null;
    }
  | { ok: false; error: string };

type ProductionWorkBuildResult =
  | {
      ok: true;
      work: { command: 'CreateWorkItem'; payload: Record<string, unknown> };
      annotation: string;
      note: string | null;
    }
  | { ok: false; error: string };

function validateSharedInput(input: ProductionExpectedDateInput):
  | { ok: true; annotation: string; note: string | null; ownerMemberId: string; partyId: string; orderId: string; productLabel: string }
  | { ok: false; error: string } {
  const annotation = input.annotation.trim();
  if (!annotation) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.titleRequired };

  const ownerMemberId = input.ownerMemberId.trim();
  if (!ownerMemberId) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.identityMissing };

  const partyId = input.partyId.trim();
  const orderId = input.orderId.trim();
  if (!orderId) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.pedidoMissing };
  if (!partyId) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.customerMissing };

  const productLabel = input.productLabel.trim();
  if (!productLabel) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.productMissing };

  return {
    ok: true,
    annotation,
    note: input.note?.trim() || null,
    ownerMemberId,
    partyId,
    orderId,
    productLabel,
  };
}

function descriptionParts(input: {
  annotation: string;
  note: string | null;
  orderLabel: string;
  orderId: string;
  orderLineId?: string | null;
  marker: string;
}): string {
  const parts = [input.annotation];
  if (input.note) parts.push(input.note);
  if (input.orderLineId?.trim()) {
    parts.push(`Línea del pedido (contexto): ${input.orderLineId.trim()}`);
  }
  parts.push(`Pedido: ${input.orderLabel} (${input.orderId})`);
  parts.push(input.marker);
  return parts.join('\n');
}

/**
 * Persist a plant update as Work without dueAt.
 * CreateWorkItem allows optional dueAt — do not require a follow-up date to record what happened.
 */
export function buildProductionPlantUpdateWork(
  input: ProductionExpectedDateInput,
): ProductionWorkBuildResult {
  const shared = validateSharedInput(input);
  if (!shared.ok) return shared;

  const title = `${PRODUCTION_PLANT_UPDATE_COPY.titlePrefix}: ${input.orderLabel} · ${shared.productLabel}`;
  const payload: Record<string, unknown> = {
    title,
    description: descriptionParts({
      annotation: shared.annotation,
      note: shared.note,
      orderLabel: input.orderLabel,
      orderId: shared.orderId,
      orderLineId: input.orderLineId,
      marker: productionAnnotationMarker(shared.orderId),
    }),
    ownerMemberId: shared.ownerMemberId,
    subjectType: 'party',
    subjectId: shared.partyId,
  };

  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: PRODUCTION_PLANT_UPDATE_COPY.notSaved };

  return {
    ok: true,
    work: { command: 'CreateWorkItem', payload: parsed.data as Record<string, unknown> },
    annotation: shared.annotation,
    note: shared.note,
  };
}

/**
 * Build a dated production follow-up (CreateWorkItem + dueAt).
 * Returns work: null when no date — callers that mean "seguimiento" must treat null as missing date.
 */
export function buildProductionExpectedDateWork(
  input: ProductionExpectedDateInput,
): ProductionExpectedDateBuildResult {
  const shared = validateSharedInput(input);
  if (!shared.ok) return shared;

  const due = dueAtInputToIso(input.expectedAt);
  if (due === 'invalid') return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.dueInvalid };

  if (!due) {
    return { ok: true, work: null, annotation: shared.annotation, note: shared.note };
  }

  const title = `${PRODUCTION_EXPECTED_DATE_COPY.titlePrefix}: ${input.orderLabel} · ${shared.productLabel}`;
  const payload: Record<string, unknown> = {
    title,
    description: descriptionParts({
      annotation: shared.annotation,
      note: shared.note,
      orderLabel: input.orderLabel,
      orderId: shared.orderId,
      orderLineId: input.orderLineId,
      marker: productionNextActionMarker(shared.orderId),
    }),
    ownerMemberId: shared.ownerMemberId,
    subjectType: 'party',
    subjectId: shared.partyId,
    dueAt: due,
  };

  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.dueInvalid };

  return {
    ok: true,
    work: { command: 'CreateWorkItem', payload: parsed.data as Record<string, unknown> },
    annotation: shared.annotation,
    note: shared.note,
  };
}

/** Follow-up builder that fails closed when the due date is missing. */
export function buildProductionFollowUpWork(
  input: ProductionExpectedDateInput,
): ProductionWorkBuildResult {
  const built = buildProductionExpectedDateWork(input);
  if (!built.ok) return built;
  if (!built.work) {
    return { ok: false, error: PRODUCTION_FOLLOW_UP_COPY.needsDate };
  }
  return { ok: true, work: built.work, annotation: built.annotation, note: built.note };
}
