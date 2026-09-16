'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QA_ACCESS_SCOPE, canUseQaAccess } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
} from '@/lib/qa/constants';
import {
  QA_VIEW_COOKIE_NAME,
  createSignedQaViewCookieValue,
  parseSignedQaViewCookie,
  qaViewCookieOptions,
} from '@/lib/qa/cookie';
import { findSynthPersonaByMemberId, isAllowedQaTargetMemberId } from '@/lib/qa/personas';
import { isQaControlEnabled } from '@/lib/qa/runtime';

async function requireQaOperator() {
  if (!isQaControlEnabled()) {
    throw new Error('QA_CONTROL_DISABLED');
  }
  const auth = await getServerOsAuthContext({ skipQaView: true });
  if (!auth) throw new Error('AUTH_REQUIRED');
  const client = createOsApiClient(auth);
  const grantedScopes = await loadActorRoleKeys(client);
  if (!canUseQaAccess(grantedScopes)) {
    throw new Error(`MISSING_SCOPE:${QA_ACCESS_SCOPE}`);
  }
  const session = await client.getAuthenticatedSession();
  const actingMemberId = session.memberId?.trim();
  const actorOrgId = session.organizationId?.trim();
  if (!actingMemberId || !actorOrgId) throw new Error('SESSION_INCOMPLETE');
  if (actorOrgId === QA_SYNTH_ORGANIZATION_ID) {
    // Operators act from REAL (or other) tenant; never impersonate from within SYNTH session swap.
  }
  return { actingMemberId, actorOrgId, grantedScopes };
}

export async function startQaView(formData: FormData): Promise<void> {
  const { actingMemberId } = await requireQaOperator();
  const targetMemberId = String(formData.get('targetMemberId') ?? '').trim();
  if (!targetMemberId) throw new Error('TARGET_REQUIRED');
  if (!isAllowedQaTargetMemberId(targetMemberId)) {
    throw new Error('TARGET_NOT_ALLOWED');
  }
  const persona = findSynthPersonaByMemberId(targetMemberId);
  if (!persona?.memberId) throw new Error('TARGET_RECEIPT_MISSING');

  const value = createSignedQaViewCookieValue({
    actingMemberId,
    targetMemberId: persona.memberId,
    synthOrgId: QA_SYNTH_ORGANIZATION_ID,
  });
  if (!value) throw new Error('QA_SIGNING_UNAVAILABLE');

  const payload = parseSignedQaViewCookie(value);
  if (!payload) throw new Error('QA_COOKIE_SIGN_FAILED');

  const store = await cookies();
  store.set(QA_VIEW_COOKIE_NAME, value, qaViewCookieOptions(payload.exp));
  redirect('/inicio');
}

export async function endQaView(): Promise<void> {
  await requireQaOperator();
  const store = await cookies();
  store.delete(QA_VIEW_COOKIE_NAME);
  redirect('/sistema/pruebas-acceso');
}

export async function readActiveQaView() {
  if (!isQaControlEnabled()) return null;
  const store = await cookies();
  const payload = parseSignedQaViewCookie(store.get(QA_VIEW_COOKIE_NAME)?.value);
  if (!payload) return null;
  if (payload.synthOrgId === QA_REAL_ORGANIZATION_ID) return null;
  if (payload.synthOrgId !== QA_SYNTH_ORGANIZATION_ID) return null;
  const persona = findSynthPersonaByMemberId(payload.targetMemberId);
  return { payload, persona };
}
