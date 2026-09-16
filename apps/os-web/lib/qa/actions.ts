'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QA_ACCESS_SCOPE, canUseQaAccess } from '@isalwa/os-contracts';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
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
import {
  findSynthPersonaByMemberId,
  resolveSynthPersonas,
  WAVE2_PERSONA_EMAIL,
  type SynthPersona,
} from '@/lib/qa/personas';
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
  return { actingMemberId, actorOrgId, grantedScopes, client };
}

function stagingLookup(client: OsApiClient) {
  return async () => {
    const { items } = await client.listQaSynthPersonas();
    return items;
  };
}

export async function loadOperatorSynthPersonas(client: OsApiClient): Promise<SynthPersona[]> {
  return resolveSynthPersonas(stagingLookup(client));
}

function fallbackPersonaFromRow(row: {
  email: string;
  memberId: string;
  grantedScopes: readonly string[];
}): SynthPersona | null {
  const email = row.email.trim().toLowerCase();
  const entry = Object.entries(WAVE2_PERSONA_EMAIL).find(([, v]) => v === email);
  if (!entry) return null;
  const functionId = entry[0] as Exclude<
    SynthPersona['functionId'],
    'issue-reporter' | 'issue-manager' | 'issue-work'
  >;
  const labels: Record<typeof functionId, string> = {
    'asesor-comercial': 'Asesor Comercial',
    'jefe-comercial': 'Jefe Comercial',
    'gerente-general': 'Gerente General',
    'encargado-produccion': 'Encargado de Producción',
    'encargado-almacen': 'Encargado de Almacén',
    'encargada-compras': 'Encargada de Compras',
    contabilidad: 'Contabilidad',
    'auxiliar-coordinacion': 'Auxiliar de Coordinación',
    'isalwa-manager': 'ISALWA Manager',
  };
  return {
    id: functionId,
    functionId,
    label: labels[functionId] ?? functionId,
    description: 'staging',
    email: row.email,
    memberId: row.memberId,
    grantedScopes: row.grantedScopes,
    source: 'staging',
  };
}

export async function startQaView(formData: FormData): Promise<void> {
  const { actingMemberId, client } = await requireQaOperator();
  const targetMemberId = String(formData.get('targetMemberId') ?? '').trim();
  if (!targetMemberId) throw new Error('TARGET_REQUIRED');

  const { items } = await client.listQaSynthPersonas();
  const allowed = items.find(
    (row) => row.memberId === targetMemberId && row.organizationId === QA_SYNTH_ORGANIZATION_ID,
  );
  if (!allowed) throw new Error('TARGET_NOT_ALLOWED');

  const live = await client.getQaEffectiveAccess(targetMemberId);
  if (live.organizationId.trim() !== QA_SYNTH_ORGANIZATION_ID) {
    throw new Error('TARGET_NOT_ALLOWED');
  }

  const value = createSignedQaViewCookieValue({
    actingMemberId,
    targetMemberId: allowed.memberId,
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

  let persona = findSynthPersonaByMemberId(payload.targetMemberId);
  if (!persona) {
    try {
      const auth = await getServerOsAuthContext({ skipQaView: true });
      if (auth) {
        const client = createOsApiClient(auth);
        const personas = await loadOperatorSynthPersonas(client);
        persona = findSynthPersonaByMemberId(payload.targetMemberId, personas);
        if (!persona) {
          const { items } = await client.listQaSynthPersonas();
          const row = items.find((item) => item.memberId === payload.targetMemberId);
          if (row) persona = fallbackPersonaFromRow(row);
        }
        if (persona) {
          try {
            const live = await client.getQaEffectiveAccess(payload.targetMemberId);
            if (live.organizationId === QA_SYNTH_ORGANIZATION_ID && live.grantedScopes.length) {
              persona = { ...persona, grantedScopes: live.grantedScopes };
            }
          } catch {
            // Keep roster scopes if live evaluation is unavailable.
          }
        }
      }
    } catch {
      persona = null;
    }
  }

  if (!persona) return null;
  return { payload, persona };
}
