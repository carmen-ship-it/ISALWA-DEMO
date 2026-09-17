import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

const STORAGE_PREFIX = 'isalwa-os-role-preview-v1';

const ALLOWED_PERSONAS = new Set<string>([
  'asesor',
  'jefe-comercial',
  'gerencia',
  'produccion',
  'almacen',
  'compras',
  'finanzas',
  'entregas',
]);

export function rolePreviewStorageKey(actorKey: string): string | null {
  const key = actorKey.trim();
  if (!key || key.includes('..') || key.length > 200) return null;
  return `${STORAGE_PREFIX}:${key}`;
}

export function parseStoredRolePreview(raw: string | null): RolePreviewPersonaId | null {
  if (!raw || raw === 'own') return null;
  if (!ALLOWED_PERSONAS.has(raw)) return null;
  return raw as RolePreviewPersonaId;
}

export function writeStoredRolePreview(
  storageKey: string,
  persona: RolePreviewPersonaId | null,
): void {
  if (!persona) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, persona);
}

export function clearStoredRolePreview(storageKey: string): void {
  window.localStorage.removeItem(storageKey);
}
