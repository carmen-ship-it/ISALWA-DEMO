'use server';

import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { OsApiError } from '@/lib/api/os-api-errors';
import {
  AI_UNAVAILABLE_COPY,
  assertAiAssistRequest,
  isAiEnabled,
  AiNotAllowedError,
} from './limits';
import type { AiAssistActionResult, AiAssistResponse } from './types';

export async function requestAiAssistAction(input: {
  feature: string;
  subjectType: string;
  subjectId: string;
}): Promise<AiAssistActionResult> {
  if (!isAiEnabled()) {
    return { ok: false, code: 'disabled', message: AI_UNAVAILABLE_COPY };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, code: 'denied', message: 'Su sesión venció. Vuelva a iniciar sesión.' };
  }

  try {
    assertAiAssistRequest(input);
  } catch (err) {
    if (err instanceof AiNotAllowedError) {
      return { ok: false, code: 'denied', message: err.message };
    }
    return { ok: false, code: 'denied', message: 'La solicitud de asistencia no es válida.' };
  }

  const client = createOsApiClient(auth);

  try {
    const data = await client.requestAiAssist({
      feature: input.feature,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
    });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof OsApiError) {
      if (err.code === 'AI_UNAVAILABLE' || err.kind === 'unavailable') {
        return { ok: false, code: 'unavailable', message: AI_UNAVAILABLE_COPY };
      }
      if (err.kind === 'forbidden' || err.kind === 'unauthorized' || err.kind === 'not_found') {
        return {
          ok: false,
          code: 'denied',
          message: 'No hay evidencia autorizada para esta asistencia.',
        };
      }
    }
    return { ok: false, code: 'unknown', message: AI_UNAVAILABLE_COPY };
  }
}

export type { AiAssistResponse };
