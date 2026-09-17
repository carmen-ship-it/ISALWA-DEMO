/**
 * Server-side View As mutation gate.
 * Persona cookie mirrors client localStorage so RSC/actions can fail closed.
 * Does not change auth identity or elevate scopes.
 */
import { cookies } from 'next/headers';
import { rolePreviewBlocksMutations } from '@/lib/role-preview/access';
import { ROLE_PREVIEW_PERSONA_COOKIE } from '@/lib/role-preview/persona-cookie';
import { parseStoredRolePreview } from '@/lib/role-preview/storage';

export { ROLE_PREVIEW_PERSONA_COOKIE, syncRolePreviewPersonaCookie } from '@/lib/role-preview/persona-cookie';

export function rolePreviewMutationBlockedMessage(): string {
  return 'Vista de evaluación es solo lectura. Vuelva a su vista para realizar cambios.';
}

export async function assertRolePreviewAllowsMutation(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const store = await cookies();
  const raw = store.get(ROLE_PREVIEW_PERSONA_COOKIE)?.value;
  const decoded = raw ? decodeURIComponent(raw) : null;
  const personaRaw = decoded?.includes('::') ? decoded.slice(0, decoded.indexOf('::')) : decoded;
  const persona = parseStoredRolePreview(personaRaw ?? null);
  if (rolePreviewBlocksMutations(persona)) {
    return { ok: false, error: rolePreviewMutationBlockedMessage() };
  }
  return { ok: true };
}
