/**
 * Guided presentation — "Recorrido de ISALWA".
 *
 * Every step describes behavior ISALWA demonstrably has today (commercial release
 * batches 2–8, tested locally against a disposable database). Nothing here is a plan,
 * a provider integration or an invented record:
 *
 * - steps link to generic product pages that the person's own permissions govern;
 * - opening the Journey changes no company, creates no records and sends nothing;
 * - production, warehouse and delivery are not part of this presentation until they
 *   are demonstrated end to end; the last step lists what is not connected.
 */

export const STORY_MODE_TITLE = 'Recorrido de ISALWA' as const;

export type StoryModeStep = {
  step: number;
  title: string;
  whatHappened: string;
  whoNormallyActs: string;
  whatIsalwaRecorded: string;
  ctaLabel: string;
  href: string;
};

/** True for product PDF download APIs — not app pages. */
export function isStoryPdfApiHref(href: string): boolean {
  const pathOnly = href.split('?')[0] ?? href;
  return pathOnly.startsWith('/api/') && pathOnly.endsWith('/pdf');
}

export const STORY_MODE_STEPS: readonly StoryModeStep[] = [
  {
    step: 1,
    title: 'Registrar una atención',
    whatHappened:
      'Una persona del equipo anota una llamada, una visita, una atención presencial o un WhatsApp registrado a mano.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded:
      'Canal, cliente o contacto, fecha y hora, motivo y nota, con un próximo paso opcional. WhatsApp no está conectado: ISALWA no envía ni recibe mensajes por ese canal.',
    ctaLabel: 'Ver conversaciones',
    href: '/conversaciones',
  },
  {
    step: 2,
    title: 'Reconocer o registrar al cliente',
    whatHappened:
      'Se busca por nombre, teléfono o empresa. Si hay una posible coincidencia, se revisa antes de crear nada.',
    whoNormallyActs: 'Asesor con permiso para registrar clientes',
    whatIsalwaRecorded:
      'El cliente y su contacto con el teléfono normalizado. Un número compartido o reciclado no une identidades por sí solo.',
    ctaLabel: 'Ver clientes',
    href: '/clientes',
  },
  {
    step: 3,
    title: 'Abrir la ficha del cliente',
    whatHappened:
      'La ficha reúne resumen, comercial, operación, trabajo, documentos e historial de ese cliente.',
    whoNormallyActs: 'Asesor / persona con acceso al cliente',
    whatIsalwaRecorded:
      'Solo se muestra lo que la persona puede leer. Cambiar un nombre pide motivo, y los cambios quedan en el historial.',
    ctaLabel: 'Ver clientes',
    href: '/clientes',
  },
  {
    step: 4,
    title: 'Dejar un compromiso',
    whatHappened:
      'Se crea un compromiso con responsable activo, fecha y hora de Bolivia y origen.',
    whoNormallyActs: 'Asesor / responsable',
    whatIsalwaRecorded:
      'El compromiso y un aviso dentro de ISALWA para quien debe cumplirlo. No se envía correo ni mensaje.',
    ctaLabel: 'Ver compromisos',
    href: '/compromisos',
  },
  {
    step: 5,
    title: 'Preparar una cotización',
    whatHappened:
      'Desde el cliente se arma un borrador con productos o un ítem especial, precio, cantidad y descuento.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded:
      'Un borrador guardado con los precios que escribió una persona. No se emite ni se envía.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 6,
    title: 'Pedir aprobación',
    whatHappened:
      'Cuando hace falta, se solicita la aprobación a una persona con autoridad para aprobar precios.',
    whoNormallyActs: 'Asesor solicita; persona autorizada decide',
    whatIsalwaRecorded:
      'La solicitud y la decisión sobre la versión exacta. Quien solicita no se aprueba a sí mismo, y un cambio de condiciones invalida la aprobación.',
    ctaLabel: 'Ver aprobaciones',
    href: '/aprobaciones',
  },
  {
    step: 7,
    title: 'Emitir la cotización y descargar el PDF',
    whatHappened:
      'Con la aprobación vigente, se emite una versión con número y se descarga su PDF.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded:
      'Versión, número y huella del documento. Emitir no es enviar: descargar el PDF no marca la cotización como enviada ni aceptada.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 8,
    title: 'Registrar la aceptación del cliente',
    whatHappened:
      'Una persona anota cómo y cuándo aceptó el cliente, con la evidencia que tiene.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded:
      'Versión aceptada, canal, fecha y evidencia escrita por una persona. Un acuse de lectura o un “ok” ambiguo no es aceptación.',
    ctaLabel: 'Ver cotizaciones',
    href: '/cotizaciones',
  },
  {
    step: 9,
    title: 'Crear el pedido',
    whatHappened:
      'Con la aceptación registrada, una persona autorizada a convertir crea el pedido.',
    whoNormallyActs: 'Persona autorizada a convertir',
    whatIsalwaRecorded:
      'Un solo pedido por cotización, aunque se repita el clic. No se despacha, produce ni confirma ningún pago.',
    ctaLabel: 'Ver pedidos',
    href: '/pedidos',
  },
  {
    step: 10,
    title: 'Registrar un pago reportado',
    whatHappened:
      'Se anota lo que el cliente dice haber pagado, en uno o varios medios, con referencias y evidencia privada.',
    whoNormallyActs: 'Asesor',
    whatIsalwaRecorded:
      'Un pago reportado, no confirmado. La suma de los medios debe ser igual al total; el efectivo indica quién lo recibió o por qué aún no se sabe.',
    ctaLabel: 'Ver finanzas',
    href: '/finanzas',
  },
  {
    step: 11,
    title: 'Verificar cada parte del pago',
    whatHappened:
      'Contabilidad revisa cada medio por separado y lo confirma o rechaza con motivo.',
    whoNormallyActs: 'Contabilidad autorizada',
    whatIsalwaRecorded:
      'Un resultado por medio, con quién y cuándo. Una imagen o lo que dice el cliente no confirma fondos. No es un libro contable.',
    ctaLabel: 'Ver finanzas',
    href: '/finanzas',
  },
  {
    step: 12,
    title: 'Cambiar la fecha o reasignar un compromiso',
    whatHappened:
      'El responsable reprograma, y quien puede, reasigna o cancela, siempre con motivo.',
    whoNormallyActs: 'Responsable / gerente con autoridad sobre ese cliente',
    whatIsalwaRecorded:
      'La fecha anterior, el responsable anterior, el motivo y quién actuó. El nuevo responsable recibe el aviso.',
    ctaLabel: 'Ver compromisos',
    href: '/compromisos',
  },
  {
    step: 13,
    title: 'Ver los clientes en el mapa',
    whatHappened:
      'El mapa de clientes muestra solo clientes visibles para la persona y con coordenadas confirmadas.',
    whoNormallyActs: 'Asesor / gerencia',
    whatIsalwaRecorded:
      'Los clientes sin coordenadas figuran como “Pendiente de ubicación” en la lista. Si el proveedor de mapas no está configurado, no se dibuja ningún pin.',
    ctaLabel: 'Ver mapa',
    href: '/mapa',
  },
  {
    step: 14,
    title: 'Empezar el día en Hoy',
    whatHappened:
      'Hoy reúne lo que la persona tiene pendiente: atención, trabajo, aprobaciones, compromisos e incidencias.',
    whoNormallyActs: 'Todo el equipo',
    whatIsalwaRecorded:
      'Solo lo que la persona puede leer. Si una carga falla, Hoy lo dice y ofrece reintentar; nunca lo muestra como cero.',
    ctaLabel: 'Ver Hoy',
    href: '/inicio',
  },
  {
    step: 15,
    title: 'Lo que todavía no está conectado',
    whatHappened:
      'Esta presentación no incluye producción, almacén ni entregas, ni envíos por WhatsApp, ni respuestas automáticas.',
    whoNormallyActs: 'Responsable del sistema',
    whatIsalwaRecorded:
      'Nada. Cada capacidad se activa con sus credenciales y autorización; hasta entonces el trabajo manual sigue disponible.',
    ctaLabel: 'Ver ayuda',
    href: '/ayuda',
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
