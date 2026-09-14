/**
 * Operational Spanish for the production workspace.
 * Step labels are the confirmed plant names. Do not translate or rename them.
 * The contract label for laboratorio uses an em dash; this surface uses the
 * confirmed parentheses form. CROSS_LANE: do not rewrite production-trace.ts
 * for that display difference.
 */

export const PRODUCTION_STEP_LABELS = [
  'Laboratorio (preparación de materia prima y esmalte)',
  'Molienda',
  'Colaje',
  'Secado',
  'Pulido',
  'Esmaltado',
  'Carga y Limpieza',
  'Horno',
  'Resane',
  'Clasificación',
  'Almacén de Productos Terminados',
] as const;

export const PRODUCTION_STEP_OPTIONS = [
  { key: 'laboratorio', label: 'Laboratorio (preparación de materia prima y esmalte)' },
  { key: 'molienda', label: 'Molienda' },
  { key: 'colaje', label: 'Colaje' },
  { key: 'secado', label: 'Secado' },
  { key: 'pulido', label: 'Pulido' },
  { key: 'esmaltado', label: 'Esmaltado' },
  { key: 'carga_y_limpieza', label: 'Carga y Limpieza' },
  { key: 'horno', label: 'Horno' },
  { key: 'resane', label: 'Resane' },
  { key: 'clasificacion', label: 'Clasificación' },
  { key: 'almacen_productos_terminados', label: 'Almacén de Productos Terminados' },
] as const;

export const PRODUCTION_PAGE_COPY = {
  kicker: 'Planta',
  title: 'Producción',
  intro: 'Anotación de planta por producto. No es una tabla de base de datos.',
  quemaNotParent:
    'Una quema no es un pedido y no pertenece a un pedido. Puede reunir varios identificadores de producto.',
  receiptDoesNotAssign:
    'Un ingreso al Almacén de Productos Terminados no asigna un pedido.',
  listoMeaning:
    'Listo significa ingreso de producto terminado al Almacén de Productos Terminados.',
  stockNotOfficial: 'El stock no es oficial. El consumo no descuenta stock.',
  emptyNotZeroStock: 'Un resultado vacío no es cero de stock.',
  catalogEmpty: 'No hay nombres de catálogo. Escriba el identificador del producto. No se inventan nombres.',
  quantityPending: 'Cantidad pendiente',
  qualityMissing: 'Sin porcentaje. Hacen falta las dos cuentas: piezas buenas y piezas perdidas.',
  qualityDerived: 'Porcentaje solo con las piezas buenas y las piezas perdidas de esta organización.',
  unsaved: 'Hay una anotación sin guardar.',
  saved: 'Anotado.',
  savedReceipt: 'Anotado. Este ingreso no asigna un pedido.',
  savedConsumption: 'Anotado. No descuenta stock. El stock no es oficial.',
  permission:
    'Para anotar hace falta la capacidad production.entry.member asignada al miembro. El cargo no autoriza.',
  reviewPermission: 'Para revisar hace falta la capacidad production.review.member. No se hereda del cargo ni de la anotación.',
  scopesUnconfirmed:
    'Esta sesión no trae las capacidades del miembro. No se anota ni se mezcla con otra organización.',
  noSessionOrg: 'Falta la organización de la sesión. No se anota nada.',
  loading: 'Cargando producción.',
  error: 'No se pudo abrir producción. No se inventan registros.',
  emptyTitle: 'Sin anotaciones en esta sesión',
  emptyDescription: 'Elija un paso y anote una pieza. La cantidad de una quema puede quedar vacía.',
  correctionHint: 'Una corrección se agrega. El registro anterior no se borra.',
  dateSeparate: 'La fecha interna de producción es otro dato. No se copia la fecha con el cliente.',
  notListo: 'Sin ingreso a almacén',
  listo: 'Listo',
} as const;

export const PRODUCTION_DENIAL_COPY = {
  session_org_required: 'Falta la organización de la sesión. No se anota nada.',
  cross_tenant: 'Ese registro no pertenece a esta organización.',
  unauthorized_role: 'Hace falta la capacidad production.entry.member. El cargo no autoriza.',
  search_leakage: 'La búsqueda no incluye otra organización.',
  aggregate_leakage: 'El resumen no mezcla otra organización.',
  invalid: 'No se pudo anotar. Revise los datos de planta.',
} as const;

export const CONSUMPTION_LABELS = [
  { key: 'raw_material', label: 'materia prima' },
  { key: 'supply', label: 'insumos' },
  { key: 'fuel', label: 'combustible' },
] as const;
