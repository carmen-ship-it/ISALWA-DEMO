/**
 * Guided presentation — "Recorrido guiado".
 *
 * Two layers per step: what can be tried now, and the designed proposal for review.
 * Opening Recorrido changes no organization, tenant, role, records or data mode.
 * Exact Spanish product copy is authoritative; do not paraphrase in UI.
 */

export const STORY_MODE_TITLE = 'Recorrido guiado' as const;

export const STORY_INTRO =
  'Este recorrido muestra lo que puedes probar hoy y cómo se conectarán las siguientes etapas comerciales de ISALWA. Las vistas de propuesta sirven para revisar el flujo antes de activarlo.' as const;

export const STORY_PROPOSAL_NOTICE =
  'Vista de propuesta · Esta etapa todavía no guarda cambios ni envía información.' as const;

export const STORY_DECISION_HEADING = 'Para decidir con ISALWA' as const;

export const STORY_EXTERNAL_HEADING = 'Requisito antes de activarlo' as const;

export const STORY_FEEDBACK_PROMPT =
  'Durante la evaluación, anota:\n• qué refleja bien el trabajo real;\n• qué debería cambiar;\n• qué dato o regla falta;\n• qué persona debe decidirlo.' as const;

export const STORY_END_TITLE = 'Fin del recorrido' as const;

export const STORY_END_BODY =
  'Ya conoces lo disponible hoy, la propuesta completa y las decisiones que ISALWA necesita confirmar antes de activar cada etapa.' as const;

export const STORY_END_BUTTON = 'Volver a Hoy' as const;

export const STORY_END_HREF = '/inicio' as const;

export const STORY_END_FOOTNOTE =
  'Tu opinión ayudará a ajustar el sistema antes de activarlo con datos y conexiones reales.' as const;

/** Exact status labels (words + color; color alone is never the signal). */
export const STORY_STATUS_LABELS = {
  available: 'Disponible para probar',
  partial: 'Disponible parcialmente',
  proposal: 'Vista de propuesta',
  decision: 'Decisión pendiente de ISALWA',
  external: 'Requiere configuración externa',
} as const;

export type StoryStepStatus = keyof typeof STORY_STATUS_LABELS;

export type StoryModeStep = {
  step: number;
  title: string;
  role: string;
  currentStateText: string;
  status: StoryStepStatus;
  /** Real route CTA only when the hosted/local feature is genuinely open. */
  workingActionLabel: string | null;
  href: string | null;
  proposalText: string;
  decisionText: string | null;
  externalRequirement: string | null;
};

/** True for product PDF download APIs — not app pages. */
export function isStoryPdfApiHref(href: string): boolean {
  const pathOnly = href.split('?')[0] ?? href;
  return pathOnly.startsWith('/api/') && pathOnly.endsWith('/pdf');
}

export function storyPrimaryActionLabel(status: StoryStepStatus): string {
  switch (status) {
    case 'available':
    case 'partial':
      return 'Abrir esta sección';
    case 'proposal':
      return 'Ver propuesta';
    case 'decision':
      return 'Ver qué necesitamos decidir';
    case 'external':
      return 'Ver requisito';
  }
}

/** Panel panel modes opened inside Recorrido (never mutate). */
export type StoryPanelView = 'step' | 'proposal' | 'decision' | 'external' | 'end';

export const STORY_MODE_STEPS: readonly StoryModeStep[] = [
  {
    step: 1,
    title: 'Empieza con lo que requiere atención',
    role: 'Asesor y Gerencia',
    currentStateText:
      'Hoy reúne el trabajo que requiere atención según tu acceso. Desde aquí puedes abrir el registro correspondiente sin buscarlo nuevamente.',
    status: 'available',
    workingActionLabel: 'Abrir esta sección',
    href: '/inicio',
    proposalText:
      'La versión completa reunirá conversaciones pendientes, compromisos vencidos o próximos, cotizaciones pendientes, pagos por verificar y aprobaciones asignadas.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 2,
    title: 'Atiende una conversación o registra una atención',
    role: 'Asesor',
    currentStateText:
      'Puedes revisar las conversaciones y las notas internas disponibles para tu rol. La atención manual mantiene el contexto sin afirmar que un mensaje externo fue enviado.',
    status: 'partial',
    workingActionLabel: 'Abrir esta sección',
    href: '/conversaciones',
    proposalText:
      'La bandeja completa mostrará conversaciones nuevas, en atención, esperando al cliente, esperando al equipo y resueltas. Desde una conversación se podrá preparar una cotización, registrar un pago, crear un compromiso o reportar un problema sin volver a capturar el cliente.',
    decisionText: null,
    externalRequirement: 'WhatsApp todavía no está conectado en esta evaluación.',
  },
  {
    step: 3,
    title: 'Busca o registra al cliente',
    role: 'Asesor',
    currentStateText:
      'Busca por nombre, empresa o teléfono antes de crear un registro. Las coincidencias se revisan sin unir clientes automáticamente.',
    status: 'partial',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'El asesor podrá registrar un cliente nuevo con empresa o nombre, contacto, teléfono, ciudad, dirección o referencia e interés de producto. Un teléfono compartido o parecido será una señal para revisar, no una fusión automática.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 4,
    title: 'Consulta Cliente 360',
    role: 'Asesor y Gerencia',
    currentStateText:
      'Cliente 360 reúne los datos permitidos, la persona responsable, la cobertura, el trabajo relacionado y el historial del cliente.',
    status: 'available',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'La ficha completa mantendrá las pestañas Resumen, Comercial, Operación, Trabajo, Documentos e Historial. Cada vista mostrará solamente la información permitida para la persona que inició sesión.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 5,
    title: 'Corrige datos con trazabilidad',
    role: 'Asesor autorizado y Custodia de datos',
    currentStateText:
      'Los cambios guardan el valor anterior, el nuevo valor, la persona que actuó, el motivo y la versión. Los documentos ya emitidos conservarán sus datos originales.',
    status: 'available',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'Cuando una corrección afecte un documento emitido, el equipo podrá crear una revisión del documento sin borrar la historia original.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 6,
    title: 'Gestiona teléfonos y contactos',
    role: 'Asesor autorizado y Custodia de datos',
    currentStateText:
      'Puedes cambiar o retirar un número mediante el flujo específico y finalizar una relación de contacto sin borrar a la persona.',
    status: 'available',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'Un número nuevo, compartido o reciclado requerirá revisión humana antes de mostrar historial privado. Los próximos envíos usarán solamente el número confirmado.',
    decisionText: null,
    externalRequirement:
      'Los envíos pendientes se podrán cancelar o revisar cuando WhatsApp esté conectado.',
  },
  {
    step: 7,
    title: 'Da apoyo temporal sin cambiar al responsable',
    role: 'Gerencia autorizada',
    currentStateText:
      'La cobertura permite que otra persona atienda acciones concretas durante un periodo definido. El cliente conserva una sola persona responsable.',
    status: 'available',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'La gerencia verá qué cobertura empieza, termina o necesita revisión. El apoyo podrá continuar el trabajo autorizado sin convertir a la persona de apoyo en propietaria del cliente.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 8,
    title: 'Mantén el cliente al día',
    role: 'Asesor autorizado y Gerencia',
    currentStateText:
      'Las preferencias de seguimiento, solicitudes de corrección, archivo y reactivación usan controles específicos y conservan el historial.',
    status: 'partial',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'Antes de archivar, el sistema revisará pedidos, pagos, compromisos e incidencias abiertas. Reactivar no devolverá automáticamente coberturas, consentimientos, precios o aprobaciones vencidas.',
    decisionText: null,
    externalRequirement:
      'Los módulos de pagos, pedidos y compromisos deberán estar conectados antes de que todas las obligaciones puedan evaluarse automáticamente.',
  },
  {
    step: 9,
    title: 'Consulta el catálogo de productos',
    role: 'Asesor',
    currentStateText:
      'Esta evaluación todavía no tiene el catálogo comercial integrado como fuente publicada.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'El catálogo mostrará productos publicados, fuentes revisadas, condiciones y especificaciones confirmadas. Si no existe un precio aprobado, mostrará ‘Precio por confirmar’.',
    decisionText:
      'Necesitamos el catálogo PDF aprobado y la lista de precios vigente, o una persona autorizada para aprobar cada excepción de precio.',
    externalRequirement: null,
  },
  {
    step: 10,
    title: 'Organiza la oportunidad y el próximo paso',
    role: 'Asesor',
    currentStateText: 'Esta etapa todavía se presenta como propuesta de flujo.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'La oportunidad conectará la consulta, productos o cantidades conocidas, responsable, etapa comercial y próximo paso. Una consulta no se marcará como venta hasta que exista el pedido correspondiente.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 11,
    title: 'Prepara la cotización',
    role: 'Asesor',
    currentStateText: 'La cotización segura todavía no está habilitada en esta evaluación.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'El asesor agregará productos o un ítem especial, cantidad, unidad, descripción, precio, descuento, condiciones y vigencia. Podrá guardar un borrador antes de emitirlo.',
    decisionText: null,
    externalRequirement:
      'El catálogo y las reglas de precio aprobadas deben estar disponibles antes de emitir una oferta válida.',
  },
  {
    step: 12,
    title: 'Solicita la aprobación necesaria',
    role: 'Asesor y Aprobador autorizado',
    currentStateText: 'La aprobación comercial todavía no está habilitada en esta evaluación.',
    status: 'decision',
    workingActionLabel: null,
    href: null,
    proposalText:
      'Una excepción de precio o descuento se solicitará antes de presentar la cotización. La aprobación quedará ligada a los términos y a la versión exacta. Un cambio importante invalidará esa aprobación.',
    decisionText:
      'Necesitamos confirmar quién aprueba excepciones de precio y descuento, y qué persona real tendrá esa autoridad en la activación.',
    externalRequirement: null,
  },
  {
    step: 13,
    title: 'Emite el documento exacto',
    role: 'Asesor',
    currentStateText: 'El PDF comercial versionado todavía no está habilitado en esta evaluación.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'Emitir creará una versión inmutable de la cotización con número, fecha, vigencia, productos, cantidades, totales y condiciones. Descargar el PDF no significará que fue enviado ni aceptado.',
    decisionText: null,
    externalRequirement:
      'Los datos públicos aprobados del emisor y las condiciones comerciales deben estar confirmados antes de activar el documento.',
  },
  {
    step: 14,
    title: 'Comparte la cotización y registra la aceptación',
    role: 'Asesor',
    currentStateText:
      'El envío por WhatsApp y la aceptación comercial todavía no están habilitados en esta evaluación.',
    status: 'external',
    workingActionLabel: null,
    href: null,
    proposalText:
      'El asesor revisará el destinatario, la línea emisora, el PDF exacto y el texto antes de enviar. La aceptación identificará la cotización y la versión acordadas; una entrega o lectura no equivaldrá a aceptación.',
    decisionText:
      'Necesitamos confirmar si cada asesor usará su número corporativo o si ISALWA usará una línea compartida.',
    externalRequirement:
      'Se requiere una conexión oficial de WhatsApp, una línea autorizada y pruebas con destinatarios consentidos.',
  },
  {
    step: 15,
    title: 'Crea el pedido de forma explícita',
    role: 'Asesor autorizado',
    currentStateText:
      'La creación comercial de pedidos todavía no está habilitada en esta evaluación.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'Después de registrar aceptación válida, el asesor autorizado creará un pedido único. El pedido no confirmará producción, despacho ni pago por sí solo.',
    decisionText:
      'Necesitamos confirmar quién puede cancelar pedidos y si una gerencia puede convertir cotizaciones de su equipo.',
    externalRequirement: null,
  },
  {
    step: 16,
    title: 'Reporta y verifica pagos',
    role: 'Asesor y Contabilidad',
    currentStateText:
      'Los pagos reportados y su verificación todavía no están habilitados en esta evaluación.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'El asesor registrará QR, efectivo, transferencia u otro medio con sus montos. Contabilidad verificará cada parte; una foto o comprobante no significará que los fondos están confirmados.',
    decisionText:
      'Necesitamos confirmar si el pago validado será requisito antes del despacho y quién puede autorizar una excepción.',
    externalRequirement:
      'Se requieren instrucciones de pago publicadas y responsables de Contabilidad configurados.',
  },
  {
    step: 17,
    title: 'Cumple compromisos y resuelve problemas',
    role: 'Asesor y Responsable actual',
    currentStateText:
      'Los compromisos y recordatorios comerciales completos todavía no están habilitados en esta evaluación.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'Cada compromiso tendrá responsable, fecha, fuente, cambios y resultado. Si un cliente no responde, el sistema propondrá seguimiento interno; no enviará mensajes automáticamente.',
    decisionText:
      'Necesitamos confirmar horarios de atención, responsables de escalamiento y reglas de seguimiento.',
    externalRequirement:
      'Las notificaciones por correo o mensajería requieren remitentes y destinos autorizados.',
  },
  {
    step: 18,
    title: 'El equipo continúa sin perder contexto',
    role: 'Asesor y Gerencia',
    currentStateText:
      'La cobertura de clientes y el historial ya muestran cómo otra persona autorizada puede continuar parte del trabajo.',
    status: 'partial',
    workingActionLabel: 'Abrir esta sección',
    href: '/clientes',
    proposalText:
      'Cuando una persona esté ausente o suspendida, el trabajo pendiente quedará en una cola autorizada para reasignación. La historia conservará a la persona que realizó cada acción.',
    decisionText: null,
    externalRequirement: null,
  },
  {
    step: 19,
    title: 'Revisa clientes y seguimiento en el mapa',
    role: 'Gerencia y Asesor autorizado',
    currentStateText: 'El mapa comercial todavía no está habilitado en esta evaluación.',
    status: 'proposal',
    workingActionLabel: null,
    href: null,
    proposalText:
      'El mapa mostrará solamente ubicaciones confirmadas y filtros permitidos por rol. Una ubicación pendiente aparecerá en lista, sin inventar una coordenada.',
    decisionText:
      'Necesitamos confirmar si las ubicaciones importadas con GPS se mostrarán como ubicaciones confirmadas o requerirán revisión humana.',
    externalRequirement: 'Se requiere una configuración de mapa con credenciales restringidas.',
  },
  {
    step: 20,
    title: 'Conecta WhatsApp e IA con control humano',
    role: 'Configuración autorizada',
    currentStateText:
      'No hay una línea real de WhatsApp ni respuestas automáticas activadas en esta evaluación.',
    status: 'external',
    workingActionLabel: null,
    href: null,
    proposalText:
      'La IA podrá responder únicamente información pública aprobada, proponer borradores y entregar la atención a una persona. Nunca aprobará precios, confirmará pagos, decidirá identidad ni creará pedidos finales por sí sola.',
    decisionText:
      'Necesitamos confirmar la línea de WhatsApp, horario, ubicación, preguntas frecuentes publicables, responsables de escalamiento y presupuesto de IA.',
    externalRequirement:
      'Se requieren acceso Meta/WhatsApp, número autorizado, contenido publicado y pruebas controladas antes de activar mensajes reales.',
  },
] as const;

export function storyStepState(
  stepNumber: number,
  currentStep: number,
): 'completed' | 'current' | 'future' {
  if (stepNumber < currentStep) return 'completed';
  if (stepNumber === currentStep) return 'current';
  return 'future';
}
