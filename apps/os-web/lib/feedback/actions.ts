'use server';

import { createId } from '@isalwa/ts-utils';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import type { FeedbackCategory } from './types';

export type SubmitFeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitProductFeedbackAction(formData: FormData): Promise<SubmitFeedbackResult> {
  const content = String(formData.get('content') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim() as FeedbackCategory | '';
  const productRef = String(formData.get('productRef') ?? '').trim() || undefined;

  if (!content) {
    return { ok: false, error: 'Por favor describa qué observó.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  }

  const client = createOsApiClient(auth);

  try {
    await client.submitProductFeedback(
      'SubmitProductFeedback',
      {
        content,
        category: category || undefined,
        productRef,
      },
      createId(),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
