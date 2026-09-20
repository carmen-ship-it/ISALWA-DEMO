'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import type { CommandActionResult, CreateRedirectResult } from '@/lib/commercial/command-types';
import { stageCommandValue } from '@/lib/commercial/labels';
import { opportunityHref, orderHref, quoteHref } from '@/lib/commercial/navigation';
import { approvalHref } from '@/lib/work/navigation';
import { partyHref } from '@/lib/party/navigation';
import { parseBobInputToCentavos, parseQuantityInput } from '@/lib/commercial/parse-money-input';
import { resolveAddQuoteLineDraft } from '@/lib/commercial/product-picker';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import { redirectKeepingDataMode } from '@/lib/demo/redirect-data-mode';

async function runCommand(
  fn: (client: ReturnType<typeof createOsApiClient>) => Promise<Record<string, unknown> | undefined>,
): Promise<CommandActionResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  }
  const client = createOsApiClient(auth);
  try {
    const data = await fn(client);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

function revalidateCliente360(partyId: string) {
  revalidatePath(partyHref(partyId));
  revalidatePath(`/clientes/${partyId}`, 'page');
}

/** Carry ?datos=demo|real from the page that submitted the action. Never invent a mode. */

export async function createOpportunityAction(formData: FormData): Promise<CreateRedirectResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const stage = String(formData.get('stage') ?? '').trim();
  const amountInput = String(formData.get('expectedValue') ?? '').trim();
  const ownerMemberId = String(formData.get('ownerMemberId') ?? '').trim();

  if (!partyId || !title) {
    return { ok: false, error: 'Ingrese un nombre para la oportunidad.' };
  }

  const payload: Record<string, unknown> = { partyId, title };
  if (stage) payload.stage = stage;
  if (ownerMemberId) payload.ownerMemberId = ownerMemberId;
  if (amountInput) {
    const centavos = parseBobInputToCentavos(amountInput);
    if (!centavos) {
      return { ok: false, error: 'Monto estimado inválido.', fieldErrors: { expectedValue: 'Use un monto válido en Bs.' } };
    }
    payload.expectedValueCentavos = centavos;
  }

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.executeCommand('CreateOpportunity', payload, createId());
    revalidateCliente360(partyId);
    const opportunityId = String(result.data.opportunityId ?? '');
    if (opportunityId) {
      revalidatePath(opportunityHref(partyId, opportunityId));
      revalidatePath('/oportunidades');
      return { ok: true, redirectTo: await redirectKeepingDataMode(opportunityHref(partyId, opportunityId), formData) };
    }
    return { ok: true, redirectTo: await redirectKeepingDataMode(partyHref(partyId), formData) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function updateOpportunityAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const amountInput = String(formData.get('expectedValue') ?? '').trim();
  const clearAmount = formData.get('clearAmount') === 'true';

  if (!opportunityId || !title) {
    return { ok: false, error: 'Ingrese un nombre para la oportunidad.' };
  }

  const payload: Record<string, unknown> = { opportunityId, title };
  if (clearAmount) {
    payload.expectedValueCentavos = null;
  } else if (amountInput) {
    const centavos = parseBobInputToCentavos(amountInput);
    if (!centavos) {
      return { ok: false, error: 'Monto estimado inválido.' };
    }
    payload.expectedValueCentavos = centavos;
  }

  const result = await runCommand((client) =>
    client.executeCommand('UpdateOpportunity', payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId) {
    revalidateCliente360(partyId);
    revalidatePath(opportunityHref(partyId, opportunityId));
  }
  return result;
}

export async function changeOpportunityStageAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  const stage = stageCommandValue(
    String(formData.get('stage') ?? ''),
    String(formData.get('storedStage') ?? ''),
  );
  if (!opportunityId || !stage) {
    return { ok: false, error: 'Ingrese una etapa.' };
  }
  const result = await runCommand((client) =>
    client
      .executeCommand('ChangeOpportunityStage', { opportunityId, stage }, createId())
      .then((r) => r.data),
  );
  if (result.ok && partyId) {
    revalidateCliente360(partyId);
    revalidatePath(opportunityHref(partyId, opportunityId));
  }
  return result;
}

export async function assignOpportunityOwnerAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  const ownerMemberId = String(formData.get('ownerMemberId') ?? '').trim();
  if (!opportunityId || !ownerMemberId) {
    return { ok: false, error: 'Seleccione un responsable.' };
  }
  const result = await runCommand((client) =>
    client
      .executeCommand('AssignOpportunityOwner', { opportunityId, ownerMemberId }, createId())
      .then((r) => r.data),
  );
  if (result.ok && partyId) {
    revalidateCliente360(partyId);
    revalidatePath(opportunityHref(partyId, opportunityId));
  }
  return result;
}

export async function closeOpportunityAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  const outcome = String(formData.get('outcome') ?? '').trim();
  if (!opportunityId || (outcome !== 'won' && outcome !== 'lost')) {
    return { ok: false, error: 'Seleccione un resultado válido.' };
  }
  const result = await runCommand((client) =>
    client.executeCommand('CloseOpportunity', { opportunityId, outcome }, createId()).then((r) => r.data),
  );
  if (result.ok && partyId) {
    revalidateCliente360(partyId);
    revalidatePath(opportunityHref(partyId, opportunityId));
  }
  return result;
}

export async function createQuoteAction(formData: FormData): Promise<CreateRedirectResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  if (!partyId) return { ok: false, error: 'Cliente no válido.' };

  const payload: Record<string, unknown> = { partyId };
  if (opportunityId) payload.opportunityId = opportunityId;
  if (notes) payload.notes = notes;

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.executeCommand('CreateQuote', payload, createId());
    revalidateCliente360(partyId);
    if (opportunityId) revalidatePath(opportunityHref(partyId, opportunityId));
    const quoteId = String(result.data.quoteId ?? '');
    if (quoteId) {
      return { ok: true, redirectTo: await redirectKeepingDataMode(quoteHref(partyId, quoteId), formData) };
    }
    return { ok: true, redirectTo: await redirectKeepingDataMode(partyHref(partyId), formData) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function addQuoteLineAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const quantityInput = String(formData.get('quantity') ?? '').trim();
  const unitLabel = String(formData.get('unitLabel') ?? '').trim();
  const unitPriceInput = String(formData.get('unitPrice') ?? '').trim();
  const discountInput = String(formData.get('discount') ?? '').trim();

  const draft = resolveAddQuoteLineDraft({
    lineKind: String(formData.get('lineKind') ?? ''),
    productId: String(formData.get('productId') ?? ''),
    itemName: String(formData.get('itemName') ?? ''),
    itemDetail: String(formData.get('itemDetail') ?? ''),
    provenanceNote: String(formData.get('provenanceNote') ?? ''),
  });
  if (!draft.ok) return { ok: false, error: draft.error };

  const quantity = parseQuantityInput(quantityInput);
  const unitPriceCentavos = parseBobInputToCentavos(unitPriceInput);
  if (!quoteId || !quantity || !unitPriceCentavos) {
    return { ok: false, error: 'Complete cantidad y precio cotizado.' };
  }

  const payload: Record<string, unknown> = {
    quoteId,
    description: draft.draft.descriptionSnapshot,
    quantity,
    unitPriceCentavos,
    productRef: draft.draft.productRef,
  };
  if (unitLabel) payload.unitLabel = unitLabel;
  if (discountInput) {
    const discountCentavos = parseBobInputToCentavos(discountInput);
    if (!discountCentavos) return { ok: false, error: 'Descuento inválido.' };
    payload.discountCentavos = discountCentavos;
  }

  const idempotencyKey = String(formData.get('idempotencyKey') ?? '').trim() || createId();
  const result = await runCommand((client) =>
    client.executeCommand('AddQuoteLine', payload, idempotencyKey).then((r) => r.data),
  );
  if (result.ok && partyId && quoteId) {
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
  }
  return result;
}

export async function updateQuoteLineAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const quoteLineId = String(formData.get('quoteLineId') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const quantityInput = String(formData.get('quantity') ?? '').trim();
  const unitLabel = String(formData.get('unitLabel') ?? '').trim();
  const unitPriceInput = String(formData.get('unitPrice') ?? '').trim();
  const discountInput = String(formData.get('discount') ?? '').trim();

  if (!quoteLineId) return { ok: false, error: 'Línea no válida.' };

  const payload: Record<string, unknown> = { quoteLineId };
  if (description) payload.description = description;
  if (quantityInput) {
    const quantity = parseQuantityInput(quantityInput);
    if (!quantity) return { ok: false, error: 'Cantidad inválida.' };
    payload.quantity = quantity;
  }
  if (unitLabel) payload.unitLabel = unitLabel;
  if (unitPriceInput) {
    const unitPriceCentavos = parseBobInputToCentavos(unitPriceInput);
    if (!unitPriceCentavos) return { ok: false, error: 'Precio cotizado inválido.' };
    payload.unitPriceCentavos = unitPriceCentavos;
  }
  if (discountInput) {
    const discountCentavos = parseBobInputToCentavos(discountInput);
    if (!discountCentavos) return { ok: false, error: 'Descuento inválido.' };
    payload.discountCentavos = discountCentavos;
  }

  const result = await runCommand((client) =>
    client.executeCommand('UpdateQuoteLine', payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId && quoteId) {
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
  }
  return result;
}

export async function removeQuoteLineAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const quoteLineId = String(formData.get('quoteLineId') ?? '').trim();
  if (!quoteLineId) return { ok: false, error: 'Línea no válida.' };

  const result = await runCommand((client) =>
    client.executeCommand('RemoveQuoteLine', { quoteLineId }, createId()).then((r) => r.data),
  );
  if (result.ok && partyId && quoteId) {
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
  }
  return result;
}

export async function updateQuoteAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const headerDiscountInput = String(formData.get('headerDiscount') ?? '').trim();
  if (!quoteId) return { ok: false, error: 'Cotización no válida.' };

  const payload: Record<string, unknown> = { quoteId, notes: notes || null };
  if (headerDiscountInput) {
    const headerDiscountCentavos = parseBobInputToCentavos(headerDiscountInput);
    if (!headerDiscountCentavos) return { ok: false, error: 'Descuento general inválido.' };
    payload.headerDiscountCentavos = headerDiscountCentavos;
  }

  const result = await runCommand((client) =>
    client.executeCommand('UpdateQuote', payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId && quoteId) {
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
  }
  return result;
}

export async function submitQuoteAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  if (!quoteId) return { ok: false, error: 'Cotización no válida.' };

  const idempotencyKey = String(formData.get('idempotencyKey') ?? '').trim() || createId();
  const result = await runCommand((client) =>
    client.executeCommand('SubmitQuote', { quoteId }, idempotencyKey).then((r) => r.data),
  );
  if (result.ok && partyId && quoteId) {
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
  }
  return result;
}

export async function cancelQuoteAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!quoteId) return { ok: false, error: 'Cotización no válida.' };

  const payload: Record<string, unknown> = { quoteId };
  if (reason) payload.reason = reason;

  const result = await runCommand((client) =>
    client.executeCommand('CancelQuote', payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId && quoteId) {
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
  }
  return result;
}

export async function createOrderAction(formData: FormData): Promise<CreateRedirectResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  if (!quoteId) return { ok: false, error: 'Cotización no válida.' };

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.executeCommand('CreateOrder', { quoteId }, createId());
    revalidateCliente360(partyId);
    revalidatePath(quoteHref(partyId, quoteId));
    const orderId = String(result.data.orderId ?? '');
    if (orderId) {
      return { ok: true, redirectTo: await redirectKeepingDataMode(`${orderHref(partyId, orderId)}?resultado=pedido`, formData) };
    }
    return { ok: true, redirectTo: await redirectKeepingDataMode(quoteHref(partyId, quoteId), formData) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function recordQuoteManualSendAction(
  formData: FormData,
): Promise<
  | { ok: true; channel: 'whatsapp' | 'email' | 'otro' }
  | { ok: false; error: string }
> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const channel = String(formData.get('channel') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!quoteId) return { ok: false, error: 'Cotización no válida.' };
  if (channel !== 'whatsapp' && channel !== 'email' && channel !== 'otro') {
    return { ok: false, error: 'Seleccione el canal de envío.' };
  }

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const payload: Record<string, unknown> = { quoteId, channel };
  if (note) payload.note = note;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const idempotencyKey = String(formData.get('idempotencyKey') ?? '').trim() || createId();
  const client = createOsApiClient(auth);
  try {
    await client.executeCommand('RecordQuoteManualSend', payload, idempotencyKey);
    if (partyId) {
      revalidateCliente360(partyId);
      revalidatePath(quoteHref(partyId, quoteId));
      revalidatePath('/cotizaciones');
    }
    return { ok: true, channel };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function requestCommercialApprovalAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const subjectType = String(formData.get('subjectType') ?? '').trim();
  const subjectId = String(formData.get('subjectId') ?? '').trim();
  const approverMemberId = String(formData.get('approverMemberId') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (subjectType !== 'quote' && subjectType !== 'order') {
    return { ok: false, error: 'Solo se puede solicitar aprobación de una cotización o un pedido.' };
  }
  if (!subjectId || !approverMemberId) {
    return { ok: false, error: 'Seleccione un aprobador.' };
  }

  const payload: Record<string, unknown> = { subjectType, subjectId, approverMemberId };
  if (note) payload.context = { note };

  const result = await runCommand((client) =>
    client.executeWorkCommand('RequestApproval', payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId) {
    revalidateCliente360(partyId);
    revalidatePath(subjectType === 'quote' ? quoteHref(partyId, subjectId) : orderHref(partyId, subjectId));
  }
  return result;
}

export async function decideCommercialApprovalAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const subjectType = String(formData.get('subjectType') ?? '').trim();
  const subjectId = String(formData.get('subjectId') ?? '').trim();
  const approvalRequestId = String(formData.get('approvalRequestId') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!approvalRequestId) return { ok: false, error: 'Aprobación no válida.' };
  if (decision !== 'Approve' && decision !== 'Reject') {
    return { ok: false, error: 'Decisión no válida.' };
  }
  if (decision === 'Reject' && !reason) {
    return { ok: false, error: 'Indique un motivo para rechazar.' };
  }

  const payload: Record<string, unknown> = { approvalRequestId };
  if (reason) payload.reason = reason;
  const result = await runCommand((client) =>
    client.executeWorkCommand(decision, payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId && subjectId && (subjectType === 'quote' || subjectType === 'order')) {
    revalidateCliente360(partyId);
    revalidatePath(subjectType === 'order' ? orderHref(partyId, subjectId) : quoteHref(partyId, subjectId));
  }
  if (result.ok && approvalRequestId) {
    revalidatePath('/aprobaciones');
    revalidatePath(approvalHref(approvalRequestId));
  }
  // Prefer quote deep-link over refresh-only dead-end on /aprobaciones/[id].
  // Approval still does not create an order — convert remains a separate step on the quote.
  if (result.ok && partyId && subjectId && subjectType === 'quote') {
    return { ...result, redirectTo: await redirectKeepingDataMode(quoteHref(partyId, subjectId), formData) };
  }
  return result;
}

/**
 * Jefe (current approver) explicitly escalates pending approval to a chosen Gerencia member.
 * No automatic manager selection.
 */
export async function escalateCommercialApprovalAction(
  formData: FormData,
): Promise<CommandActionResult> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return { ok: false, error: gate.error };

  const partyId = String(formData.get('partyId') ?? '').trim();
  const subjectType = String(formData.get('subjectType') ?? '').trim();
  const subjectId = String(formData.get('subjectId') ?? '').trim();
  const approvalRequestId = String(formData.get('approvalRequestId') ?? '').trim();
  const newApproverMemberId = String(formData.get('newApproverMemberId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  if (!approvalRequestId) return { ok: false, error: 'Aprobación no válida.' };
  if (!newApproverMemberId) {
    return { ok: false, error: 'Seleccione el Gerente que debe decidir.' };
  }

  const payload: Record<string, unknown> = { approvalRequestId, newApproverMemberId };
  if (reason) payload.reason = reason;

  const result = await runCommand((client) =>
    client.executeWorkCommand('EscalateApproval', payload, createId()).then((r) => r.data),
  );
  if (result.ok && partyId && subjectId && (subjectType === 'quote' || subjectType === 'order')) {
    revalidateCliente360(partyId);
    revalidatePath(subjectType === 'order' ? orderHref(partyId, subjectId) : quoteHref(partyId, subjectId));
  }
  if (result.ok && approvalRequestId) {
    revalidatePath('/aprobaciones');
    revalidatePath(approvalHref(approvalRequestId));
    revalidatePath('/inicio');
    revalidatePath('/trabajo');
  }
  return result;
}

export async function reassignCommercialAccountOwnerAction(
  formData: FormData,
): Promise<CommandActionResult> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return { ok: false, error: gate.error };

  const partyId = String(formData.get('partyId') ?? '').trim();
  const commercialAccountId = String(formData.get('commercialAccountId') ?? '').trim();
  const ownerMemberId = String(formData.get('ownerMemberId') ?? '').trim();
  const confirmed = String(formData.get('confirmed') ?? '') === 'yes';
  if (!commercialAccountId || !ownerMemberId) {
    return { ok: false, error: 'Seleccione el nuevo responsable.' };
  }
  if (!confirmed) {
    return { ok: false, error: 'Confirme el cambio de responsable.' };
  }

  const result = await runCommand((client) =>
    client
      .executeCommand('ReassignCommercialAccountOwner', { commercialAccountId, ownerMemberId }, createId())
      .then((r) => r.data),
  );
  if (result.ok && partyId) revalidateCliente360(partyId);
  return result;
}

export async function grantCustomerCoverageAction(
  formData: FormData,
): Promise<CommandActionResult> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return { ok: false, error: gate.error };

  const partyId = String(formData.get('partyId') ?? '').trim();
  const commercialAccountId = String(formData.get('commercialAccountId') ?? '').trim();
  const actingAdvisorMemberId = String(formData.get('actingAdvisorMemberId') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!commercialAccountId || !actingAdvisorMemberId) {
    return { ok: false, error: 'Seleccione quién apoyará temporalmente.' };
  }

  const result = await runCommand((client) =>
    client
      .executeCommand(
        'GrantCustomerCoverage',
        {
          commercialAccountId,
          actingAdvisorMemberId,
          note: note || undefined,
        },
        createId(),
      )
      .then((r) => r.data),
  );
  if (result.ok && partyId) revalidateCliente360(partyId);
  return result;
}

export async function revokeCustomerCoverageAction(
  formData: FormData,
): Promise<CommandActionResult> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return { ok: false, error: gate.error };

  const partyId = String(formData.get('partyId') ?? '').trim();
  const grantId = String(formData.get('grantId') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!grantId) {
    return { ok: false, error: 'No hay apoyo temporal para retirar.' };
  }

  const result = await runCommand((client) =>
    client
      .executeCommand(
        'RevokeCustomerCoverage',
        { grantId, note: note || undefined },
        createId(),
      )
      .then((r) => r.data),
  );
  if (result.ok && partyId) revalidateCliente360(partyId);
  return result;
}
