'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { ISSUE_COPY } from './labels';
import { issueHref, issueListHref } from './navigation';
import type { IssueReferenceType, ReportIssueContext } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Report Issue action
// ─────────────────────────────────────────────────────────────────────────────

export type ReportIssueActionResult =
  | { ok: true; issueId: string }
  | { ok: false; error: string };

export async function reportIssueAction(formData: FormData): Promise<ReportIssueActionResult> {
  const description = String(formData.get('description') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim() || undefined;
  const referenceType = String(formData.get('referenceType') ?? '').trim() || undefined;
  const referenceId = String(formData.get('referenceId') ?? '').trim() || undefined;

  if (!description) {
    return { ok: false, error: ISSUE_COPY.descriptionRequired };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: ISSUE_COPY.sessionExpired };
  }

  const client = createOsApiClient(auth);

  const references =
    referenceType && referenceId
      ? [{ referenceType: referenceType as IssueReferenceType, referenceId }]
      : undefined;

  try {
    const result = await client.executeIssueCommand(
      'ReportIssue',
      { description, title, references },
      createId(),
    );

    const issueId = String(result.data.issueId ?? '');

    // Revalidate issue surfaces
    revalidatePath(issueListHref());
    revalidatePath(issueListHref('open'));
    revalidatePath(issueListHref('reported'));
    if (issueId) {
      revalidatePath(issueHref(issueId));
    }

    // Revalidate context pages if issue references a party
    if (referenceType === 'party' && referenceId) {
      revalidatePath(`/clientes/${referenceId}`);
    }

    return { ok: true, issueId };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse context from URL
// ─────────────────────────────────────────────────────────────────────────────

export function parseReportIssueContext(
  searchParams: Record<string, string | string[] | undefined>,
): ReportIssueContext | null {
  const referenceType = typeof searchParams.issueRefType === 'string' 
    ? searchParams.issueRefType 
    : undefined;
  const referenceId = typeof searchParams.issueRefId === 'string' 
    ? searchParams.issueRefId 
    : undefined;
  const referenceLabel = typeof searchParams.issueRefLabel === 'string' 
    ? searchParams.issueRefLabel 
    : undefined;

  if (!referenceType || !referenceId) return null;

  return {
    referenceType: referenceType as IssueReferenceType,
    referenceId,
    referenceLabel,
  };
}
