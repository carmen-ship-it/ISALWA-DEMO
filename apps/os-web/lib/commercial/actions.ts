'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import type { CommandActionResult, CreateRedirectResult } from '@/lib/commercial/command-types';
import { opportunityHref, quoteHref } from '@/lib/commercial/navigation';
import { partyHref } from '@/lib/party/navigation';
import { parseBobInputToCentavos, parseQuantityInput } from '@/lib/commercial/parse-money-input';

async function runCommand(
  fn: (client: ReturnType<typeof createOsApiClient>) => Promise<Record<string, unknown> | undefined>,
): Promise<CommandActionResult> {
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

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.executeCommand('CreateOpportunity', payload, createId());
    revalidateCliente360(partyId);
    const opportunityId = String(result.data.opportunityId ?? '');
    if (opportunityId) {
      return { ok: true, redirectTo: opportunityHref(partyId, opportunityId) };
    }
    return { ok: true, redirectTo: partyHref(partyId) };
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
  const stage = String(formData.get('stage') ?? '').trim();
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

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.executeCommand('CreateQuote', payload, createId());
    revalidateCliente360(partyId);
    if (opportunityId) revalidatePath(opportunityHref(partyId, opportunityId));
    const quoteId = String(result.data.quoteId ?? '');
    if (quoteId) {
      return { ok: true, redirectTo: quoteHref(partyId, quoteId) };
    }
    return { ok: true, redirectTo: partyHref(partyId) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function addQuoteLineAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const quantityInput = String(formData.get('quantity') ?? '').trim();
  const unitLabel = String(formData.get('unitLabel') ?? '').trim();
  const unitPriceInput = String(formData.get('unitPrice') ?? '').trim();
  const discountInput = String(formData.get('discount') ?? '').trim();

  const quantity = parseQuantityInput(quantityInput);
  const unitPriceCentavos = parseBobInputToCentavos(unitPriceInput);
  if (!quoteId || !description || !quantity || !unitPriceCentavos) {
    return { ok: false, error: 'Complete descripción, cantidad y precio unitario.' };
  }

  const payload: Record<string, unknown> = {
    quoteId,
    description,
    quantity,
    unitPriceCentavos,
  };
  if (unitLabel) payload.unitLabel = unitLabel;
  if (discountInput) {
    const discountCentavos = parseBobInputToCentavos(discountInput);
    if (!discountCentavos) return { ok: false, error: 'Descuento inválido.' };
    payload.discountCentavos = discountCentavos;
  }

  const result = await runCommand((client) =>
    client.executeCommand('AddQuoteLine', payload, createId()).then((r) => r.data),
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
    if (!unitPriceCentavos) return { ok: false, error: 'Precio unitario inválido.' };
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

  const result = await runCommand((client) =>
    client.executeCommand('SubmitQuote', { quoteId }, createId()).then((r) => r.data),
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
