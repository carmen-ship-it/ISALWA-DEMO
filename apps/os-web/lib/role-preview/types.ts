export type RolePreviewPersonaId =
  | 'asesor'
  | 'jefe-comercial'
  | 'gerencia'
  | 'produccion'
  | 'almacen'
  | 'compras'
  | 'finanzas'
  | 'entregas';

export type RolePreviewPreset = {
  id: 'own' | RolePreviewPersonaId;
  label: string;
  /** Display-only scopes for nav emphasis — never sent to the API. */
  previewScopes: readonly string[];
};
