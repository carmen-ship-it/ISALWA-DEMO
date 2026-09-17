/**
 * Server-side View As mutation gate.
 * Persona cookie mirrors client localStorage so RSC/actions can fail closed.
 * Does not change auth identity or elevate scopes.
 */
import { cookies } from 'next/headers';
import { rolePreviewBlocksMutations } from '@/lib/role-preview/access';
import { parseStoredRolePreview } from '@/lib/role-preview/storage';

export const ROLE_PREVIEW_PERSONA_COOKIE = 'isalwa-os-role-preview-persona' as const;

export function rolePreviewMutationBlockedMessage(): string {
  return 'Vista de evaluación es solo lectura. Vuelva a su vista para realizar cambios.';
}

export function syncRolePreviewPersonaCookie(
  persona: string | null,
  subjectMemberId?: string | null,
): void {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 30;
  if (!persona) {
    document.cookie = `${ROLE_PREVIEW_PERSONA_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  const value =
    persona === 'asesor' && subjectMemberId?.trim()
      ? `${persona}::${subjectMemberId.trim()}`
      : persona;
  document.cookie = `${ROLE_PREVIEW_PERSONA_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
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
