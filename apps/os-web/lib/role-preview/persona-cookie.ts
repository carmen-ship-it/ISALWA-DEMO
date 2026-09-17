/**
 * Client-safe View As persona cookie helpers.
 * Keep free of next/headers so Client Components can sync without pulling RSC-only APIs.
 */
export const ROLE_PREVIEW_PERSONA_COOKIE = 'isalwa-os-role-preview-persona' as const;

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
