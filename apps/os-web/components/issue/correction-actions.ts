'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import type { CorrectionCandidateEvent, CorrectionCandidatePage } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { issueHref } from '@/lib/issue/navigation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import {
  buildReportCorrectionPayload,
  buildResolveCorrectionPayload,
  correctionCommandMessage,
} from '@/components/issue/correction-request';

async function issueClient() {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false as const, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  return { ok: true as const, client: createOsApiClient(auth) };
}

export async function reportCorrectionAction(
  formData: FormData,
): Promise<{ ok: true; issueId: string } | { ok: false; error: string }> {
  const built = buildReportCorrectionPayload({
    description: String(formData.get('description') ?? ''),
    partyId: String(formData.get('partyId') ?? '').trim(),
    field: String(formData.get('field') ?? ''),
    proposedValue: String(formData.get('proposedValue') ?? ''),
    source: String(formData.get('source') ?? ''),
    contactId: String(formData.get('contactId') ?? ''),
    locationId: String(formData.get('locationId') ?? ''),
  });
  if (!built.ok) return built;
  const session = await issueClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executeIssueCommand('ReportIssue', built.payload, createId());
    const issueId = String(result.data.issueId ?? '');
    revalidatePath('/incidencias');
    revalidatePath(`/clientes/${String(formData.get('partyId') ?? '').trim()}`);
    if (issueId) revalidatePath(issueHref(issueId));
    return { ok: true, issueId };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function resolveCorrectionAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string; code?: 'CORRECTION_VALUE_DIFFERS' | 'CORRECTION_EVIDENCE_INVALID' }> {
  const built = buildResolveCorrectionPayload({
    issueId: String(formData.get('issueId') ?? '').trim(),
    expectedVersion: Number(formData.get('expectedVersion')),
    decision: String(formData.get('decision') ?? ''),
    eventId: String(formData.get('eventId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
    differenceExplanation: String(formData.get('differenceExplanation') ?? ''),
  });
  if (!built.ok) return built;
  const session = await issueClient();
  if (!session.ok) return session;
  try {
    await session.client.executeIssueCommand('ResolveIssue', built.payload, createId());
    revalidatePath(issueHref(String(built.payload.issueId)));
    revalidatePath('/incidencias');
    return { ok: true };
  } catch (err) {
    return { ok: false, ...correctionCommandMessage(err) };
  }
}

export async function loadCorrectionCandidatesAction(
  issueId: string,
  cursor: string | null,
): Promise<{ ok: true; page: CorrectionCandidatePage } | { ok: false; error: string }> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  try {
    const page = await createOsApiClient(auth).listIssueCorrectionCandidates(issueId, { limit: 20, cursor });
    return { ok: true, page };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function lookupCorrectionCandidateAction(
  issueId: string,
  eventId: string,
): Promise<{ ok: true; event: CorrectionCandidateEvent } | { ok: false; error: string }> {
  const auth = await getServerOsAuthContext();
  if (!auth || !eventId.trim()) return { ok: false, error: 'Indique el identificador del cambio.' };
  try {
    const found = await createOsApiClient(auth).getIssueCorrectionCandidate(issueId, eventId.trim());
    return { ok: true, event: found.event };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
