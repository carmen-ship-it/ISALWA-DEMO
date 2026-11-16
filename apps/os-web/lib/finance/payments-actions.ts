'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import type {
  PaymentInstructionDraftInput,
  PaymentInstructionPublic,
  PaymentReportInput,
  PaymentReportView,
} from '@isalwa/os-contracts';
import { PAYMENT_EVIDENCE_MAX_BYTES } from '@isalwa/os-contracts';
import { OsApiError } from '@/lib/api/os-api-errors';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import { paymentErrorCopy } from './payments';

export type PaymentReportListView = 'queue' | 'all' | 'visible';

export type PaymentActionResult<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: string };

export type PaymentReportsLoad = {
  items: PaymentReportView[];
  queueCount: number | null;
  view: PaymentReportListView;
};

export type AdminInstruction = PaymentInstructionPublic & {
  createdByMemberId: string;
  createdAt: string;
  publishedByMemberId: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
  retiredReason: string | null;
};

export type CurrentInstructions = {
  items: Array<{ instruction: PaymentInstructionPublic; shareText: string }>;
  absent: boolean;
  absentCopy: string | null;
  canPublish: boolean;
};

const SESSION_NEEDED = 'Su sesión venció. Vuelva a iniciar sesión.';

function failure(err: unknown): { ok: false; error: string } {
  const fallback = mapCommandError(err);
  return { ok: false, error: err instanceof OsApiError ? paymentErrorCopy(err.code, fallback) : fallback };
}

function refresh(): void {
  revalidatePath('/finanzas');
}

async function write<T>(run: (client: ReturnType<typeof createOsApiClient>) => Promise<T>): Promise<PaymentActionResult<{ data: T }>> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return gate;
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: SESSION_NEEDED };
  try {
    const data = await run(createOsApiClient(auth));
    refresh();
    return { ok: true, data };
  } catch (err) {
    return failure(err);
  }
}

export async function loadPaymentReportsAction(input: {
  view?: PaymentReportListView;
  partyId?: string;
  orderId?: string;
}): Promise<PaymentActionResult<{ data: PaymentReportsLoad }>> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: SESSION_NEEDED };
  try {
    const data = await createOsApiClient(auth).get<PaymentReportsLoad>('/payment-reports', {
      view: input.view,
      partyId: input.partyId,
      orderId: input.orderId,
      limit: 50,
    });
    return { ok: true, data };
  } catch (err) {
    return failure(err);
  }
}

/** Open orders of the chosen customer (optional intended order and allocation targets). */
export async function loadCustomerOrdersAction(
  customerId: string,
): Promise<PaymentActionResult<{ data: Array<{ id: string; orderNumber: string; status: string; totalCentavos: string }> }>> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: SESSION_NEEDED };
  try {
    const page = await createOsApiClient(auth).get<{
      items: Array<{ id: string; orderNumber: string; status: string; totalCentavos: string }>;
    }>(`/payment-reports/customers/${encodeURIComponent(customerId)}/orders`);
    return { ok: true, data: page.items };
  } catch (err) {
    return failure(err);
  }
}

/** One Idempotency-Key per submit attempt; the form keeps it so a double click or retry is one report. */
export async function recordPaymentReportAction(
  body: PaymentReportInput,
  idempotencyKey: string,
): Promise<PaymentActionResult<{ data: { report: PaymentReportView; replayed: boolean; verifierConfigured: boolean; copy: string } }>> {
  return write((client) =>
    client.post<{ report: PaymentReportView; replayed: boolean; verifierConfigured: boolean; copy: string }>(
      '/payment-reports',
      body,
      idempotencyKey || createId(),
    ),
  );
}

export async function uploadPaymentEvidenceAction(
  formData: FormData,
): Promise<PaymentActionResult<{ data: { report: PaymentReportView } }>> {
  const reportId = String(formData.get('reportId') ?? '').trim();
  const tenderId = String(formData.get('tenderId') ?? '').trim();
  const file = formData.get('file');
  if (!reportId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: paymentErrorCopy('FILE_EMPTY', 'Elija un archivo.') };
  }
  if (file.size > PAYMENT_EVIDENCE_MAX_BYTES) {
    return { ok: false, error: paymentErrorCopy('FILE_TOO_LARGE', 'El archivo es demasiado grande.') };
  }
  const bytes = await file.arrayBuffer();
  return write((client) =>
    client.postBytes<{ report: PaymentReportView }>(
      `/payment-reports/${encodeURIComponent(reportId)}/evidence`,
      bytes,
      { fileName: file.name, tenderId: tenderId || undefined },
    ),
  );
}

export async function decidePaymentTenderAction(input: {
  reportId: string;
  tenderId: string;
  action: 'confirm' | 'reject';
  reason: string;
}): Promise<PaymentActionResult<{ data: { report: PaymentReportView } }>> {
  return write((client) =>
    client.post<{ report: PaymentReportView }>(
      `/payment-reports/${encodeURIComponent(input.reportId)}/tenders/${encodeURIComponent(input.tenderId)}/${input.action}`,
      { reason: input.reason },
    ),
  );
}

export async function resolvePaymentRecipientAction(input: {
  reportId: string;
  tenderId: string;
  recipientMemberId: string;
  reason?: string;
}): Promise<PaymentActionResult<{ data: { report: PaymentReportView } }>> {
  return write((client) =>
    client.post<{ report: PaymentReportView }>(
      `/payment-reports/${encodeURIComponent(input.reportId)}/tenders/${encodeURIComponent(input.tenderId)}/resolve-recipient`,
      { recipientMemberId: input.recipientMemberId, reason: input.reason?.trim() || null },
    ),
  );
}

export async function reversePaymentTenderAction(input: {
  reportId: string;
  tenderId: string;
  reason: string;
  replacement?: {
    paidOn: string;
    note?: string | null;
    tenders: PaymentReportInput['tenders'];
  };
}): Promise<PaymentActionResult<{ data: { report: PaymentReportView; replacement: PaymentReportView | null } }>> {
  return write((client) =>
    client.post<{ report: PaymentReportView; replacement: PaymentReportView | null }>(
      `/payment-reports/${encodeURIComponent(input.reportId)}/tenders/${encodeURIComponent(input.tenderId)}/reverse`,
      { reason: input.reason, ...(input.replacement ? { replacement: input.replacement } : {}) },
    ),
  );
}

export async function allocatePaymentAction(input: {
  reportId: string;
  orderId: string;
  amountCentavos: string;
  idempotencyKey: string;
}): Promise<PaymentActionResult<{ data: { report: PaymentReportView } }>> {
  return write((client) =>
    client.post<{ report: PaymentReportView }>(
      `/payment-reports/${encodeURIComponent(input.reportId)}/allocations`,
      { orderId: input.orderId, amountCentavos: input.amountCentavos },
      input.idempotencyKey,
    ),
  );
}

export async function releasePaymentAllocationAction(input: {
  reportId: string;
  allocationId: string;
  reason: string;
}): Promise<PaymentActionResult<{ data: { report: PaymentReportView } }>> {
  return write((client) =>
    client.post<{ report: PaymentReportView }>(
      `/payment-reports/${encodeURIComponent(input.reportId)}/allocations/${encodeURIComponent(input.allocationId)}/release`,
      { reason: input.reason },
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// Payment instructions
// ---------------------------------------------------------------------------------------------

export async function loadCurrentPaymentInstructionsAction(): Promise<PaymentActionResult<{ data: CurrentInstructions }>> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: SESSION_NEEDED };
  try {
    return { ok: true, data: await createOsApiClient(auth).get<CurrentInstructions>('/payment-instructions/current') };
  } catch (err) {
    return failure(err);
  }
}

export async function loadPaymentInstructionVersionsAction(): Promise<PaymentActionResult<{ data: AdminInstruction[] }>> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: SESSION_NEEDED };
  try {
    const page = await createOsApiClient(auth).get<{ items: AdminInstruction[] }>('/payment-instructions');
    return { ok: true, data: page.items };
  } catch (err) {
    return failure(err);
  }
}

/** Checked right before a share is copied: the version may have been replaced or retired meanwhile. */
export async function checkPaymentInstructionShareAction(
  instructionId: string,
): Promise<PaymentActionResult<{ shareText: string }>> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: SESSION_NEEDED };
  try {
    const checked = await createOsApiClient(auth).get<{ shareText: string }>(
      `/payment-instructions/${encodeURIComponent(instructionId)}/share-check`,
    );
    return { ok: true, shareText: checked.shareText };
  } catch (err) {
    return failure(err);
  }
}

export async function createPaymentInstructionDraftAction(
  body: PaymentInstructionDraftInput,
): Promise<PaymentActionResult<{ data: { instruction: AdminInstruction } }>> {
  return write((client) => client.post<{ instruction: AdminInstruction }>('/payment-instructions', body));
}

export async function uploadPaymentInstructionQrAction(
  formData: FormData,
): Promise<PaymentActionResult<{ data: { instruction: AdminInstruction } }>> {
  const instructionId = String(formData.get('instructionId') ?? '').trim();
  const file = formData.get('file');
  if (!instructionId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: paymentErrorCopy('FILE_EMPTY', 'Elija un archivo.') };
  }
  const bytes = await file.arrayBuffer();
  return write((client) =>
    client.postBytes<{ instruction: AdminInstruction }>(`/payment-instructions/${encodeURIComponent(instructionId)}/qr`, bytes),
  );
}

export async function publishPaymentInstructionAction(
  instructionId: string,
): Promise<PaymentActionResult<{ data: { instruction: AdminInstruction } }>> {
  return write((client) =>
    client.post<{ instruction: AdminInstruction }>(`/payment-instructions/${encodeURIComponent(instructionId)}/publish`),
  );
}

export async function retirePaymentInstructionAction(input: {
  instructionId: string;
  reason: string;
}): Promise<PaymentActionResult<{ data: { instruction: AdminInstruction } }>> {
  return write((client) =>
    client.post<{ instruction: AdminInstruction }>(`/payment-instructions/${encodeURIComponent(input.instructionId)}/retire`, {
      reason: input.reason,
    }),
  );
}
