'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { ISSUE_COPY } from './labels';
import { issueHref, issueListHref } from './navigation';
import type { IssueReferenceType } from './types';

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

    revalidatePath(issueListHref());
    revalidatePath(issueListHref('open'));
    revalidatePath(issueListHref('reported'));
    if (issueId) {
      revalidatePath(issueHref(issueId));
    }

    if (referenceType === 'party' && referenceId) {
      revalidatePath(`/clientes/${referenceId}`);
    }

    return { ok: true, issueId };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
