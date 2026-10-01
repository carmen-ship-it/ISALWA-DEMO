import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
} from '@isalwa/os-contracts';
import type { RolePreviewPersonaId, RolePreviewPreset } from '@/lib/role-preview/types';

const PERSONA_SCOPES: Record<RolePreviewPersonaId, readonly string[]> = {
  asesor: [COMMERCIAL_CUSTOMER_CREATE_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
  'jefe-comercial': [COMMERCIAL_TEAM_READ_SCOPE],
  gerencia: [COMMERCIAL_ORG_READ_SCOPE],
  produccion: [PRODUCTION_OPERATIONAL_RECORD_SCOPE],
  almacen: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE],
  compras: [PURCHASING_OPERATIONAL_RECORD_SCOPE],
  finanzas: [FINANCE_OPERATIONAL_RECORD_SCOPE],
  entregas: [CUSTOMER_DELIVERY_RECORD_SCOPE],
};

export function previewScopesForPersona(persona: RolePreviewPersonaId): readonly string[] {
  return PERSONA_SCOPES[persona];
}

export const ROLE_PREVIEW_PRESETS: RolePreviewPreset[] = [
  { id: 'own', label: 'Mi vista', previewScopes: [] },
  { id: 'asesor', label: 'Asesor', previewScopes: PERSONA_SCOPES.asesor },
  { id: 'jefe-comercial', label: 'Jefe comercial', previewScopes: PERSONA_SCOPES['jefe-comercial'] },
  { id: 'gerencia', label: 'Gerencia', previewScopes: PERSONA_SCOPES.gerencia },
  { id: 'produccion', label: 'Producción', previewScopes: PERSONA_SCOPES.produccion },
  { id: 'almacen', label: 'Almacén', previewScopes: PERSONA_SCOPES.almacen },
  { id: 'compras', label: 'Compras', previewScopes: PERSONA_SCOPES.compras },
  { id: 'finanzas', label: 'Finanzas', previewScopes: PERSONA_SCOPES.finanzas },
  { id: 'entregas', label: 'Entregas', previewScopes: PERSONA_SCOPES.entregas },
];

export function rolePreviewPresetLabel(persona: RolePreviewPersonaId | null): string {
  if (!persona) return 'Mi vista';
  return ROLE_PREVIEW_PRESETS.find((row) => row.id === persona)?.label ?? 'Rol';
}
