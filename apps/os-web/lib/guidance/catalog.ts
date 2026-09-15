import { guidanceNote, type GuidanceNoteModel } from './model';

/**
 * Governed sentences already used in Ayuda, customer create, quote send,
 * convert, owner reassignment, and the reported-payment truth boundary.
 * Checklist sentences are Consejo. Consequence sentences are Regla.
 * No Sugerencia: there is no governed suggestion that is neither.
 */

export const SEARCH_CUSTOMER_CHECKLIST = guidanceNote({
  id: 'search-customer-checklist',
  kind: 'consejo',
  title: 'Antes de crear cliente',
  items: ['Busque por nombre y teléfono.', 'Si ya existe, no cree otro.'],
});

export const SEARCH_CUSTOMER_MIN_LENGTH = guidanceNote({
  id: 'search-customer-min-length',
  kind: 'consejo',
  title: 'Antes de crear cliente',
  items: ['Escriba al menos 2 caracteres para buscar.'],
});

export const CREATE_CUSTOMER_REVIEW_MATCHES = guidanceNote({
  id: 'create-customer-review-matches',
  kind: 'consejo',
  title: 'Antes de crear cliente',
  items: ['Si uno de estos es el mismo cliente, ábralo. No se fusionará en silencio.'],
});

export const CREATE_CUSTOMER_NO_MERGE = guidanceNote({
  id: 'create-customer-no-merge',
  kind: 'regla',
  title: 'Crear no fusiona',
  items: [
    'Un teléfono repetido no fusiona el cliente.',
    'Crear uno nuevo no fusiona registros.',
    'No se fusiona en silencio.',
  ],
});

export const CREATE_CUSTOMER_MORE_MATCHES = guidanceNote({
  id: 'create-customer-more-matches',
  kind: 'regla',
  title: 'Afine la búsqueda antes de crear',
  items: ['Hay más coincidencias. Afine la búsqueda antes de crear. No se fusiona en silencio.'],
});

export const CREATE_QUOTE_CHECKLIST = guidanceNote({
  id: 'create-quote-checklist',
  kind: 'consejo',
  title: 'Antes de crear la cotización',
  items: ['Confirme que esta es la oportunidad correcta.'],
});

export const CREATE_QUOTE_CONSEQUENCE = guidanceNote({
  id: 'create-quote-consequence',
  kind: 'regla',
  title: 'Crear deja un borrador',
  items: ['Crear deja un borrador. No envía la cotización.'],
});

export const SEND_QUOTE_CHECKLIST = guidanceNote({
  id: 'send-quote-checklist',
  kind: 'consejo',
  title: 'Antes de enviar cotización',
  items: ['Revise el cliente, las líneas y las cantidades.', 'Si hace falta aprobación, solicítela.'],
});

export const SEND_QUOTE_NEEDS_LINES = guidanceNote({
  id: 'send-quote-needs-lines',
  kind: 'consejo',
  title: 'Antes de enviar cotización',
  items: ['Agregue al menos una línea antes de enviar.'],
});

export const SEND_QUOTE_DOES_NOT_GRANT_APPROVAL = guidanceNote({
  id: 'send-quote-does-not-grant-approval',
  kind: 'regla',
  title: 'Enviar no otorga la aprobación',
  items: ['Si hace falta aprobación, solicítela. Enviar no la otorga.'],
});

export const APPROVE_DOES_NOT_CREATE_ORDER = guidanceNote({
  id: 'approve-does-not-create-order',
  kind: 'regla',
  title: 'Aprobar',
  items: ['Aprobar registra la decisión. No crea un pedido.'],
});

export const CONVERT_QUOTE_CHECKLIST = guidanceNote({
  id: 'convert-quote-checklist',
  kind: 'consejo',
  title: 'Antes de convertir a pedido',
  items: ['Confirme que esta es la cotización correcta.'],
});

export const CONVERT_CREATES_ORDER = guidanceNote({
  id: 'convert-creates-order',
  kind: 'regla',
  title: 'Convertir crea un pedido',
  items: ['Convertir crea un pedido desde una cotización enviada. No emite factura ni nota de entrega.'],
});

export const CARGO_IS_NOT_AUTHORITY = guidanceNote({
  id: 'cargo-is-not-authority',
  kind: 'regla',
  title: 'Responsable',
  items: ['El responsable comercial es el miembro asignado. El cargo no asigna la cuenta ni autoriza convertir.'],
});

export const REASSIGN_OWNER_CHECKLIST = guidanceNote({
  id: 'reassign-owner-checklist',
  kind: 'consejo',
  title: 'Antes de cambiar responsable',
  items: ['Confirme el miembro asignado. No se infiere del cargo.'],
});

export const ASSIGN_OWNER_CHECKLIST = guidanceNote({
  id: 'assign-owner-checklist',
  kind: 'consejo',
  title: 'Antes de asignar responsable',
  items: ['Asigne un responsable comercial en la ficha. No se infiere del cargo.'],
});

export const REASSIGN_OWNER_CONSEQUENCE = guidanceNote({
  id: 'reassign-owner-consequence',
  kind: 'regla',
  title: 'Cambiar responsable no cambia la autoridad',
  items: ['Cambia el responsable comercial. No cambia el aprobador ni otorga permisos.'],
});

export const CUSTOMER_MESSAGE_IS_NOT_PAYMENT = guidanceNote({
  id: 'customer-message-is-not-payment',
  kind: 'regla',
  title: 'Un mensaje no confirma un pago',
  items: [
    'La fuente dice de dónde salió. La confianza dice si entendimos el mensaje. La confirmación dice si la empresa lo acepta.',
    'Dicho por el cliente no es un cobro confirmado.',
    'Una interpretación no cambia el pedido, la cotización ni la ubicación.',
  ],
});

export const REPORTED_PAYMENT_DOES_NOT_CONFIRM = guidanceNote({
  id: 'reported-payment-does-not-confirm',
  kind: 'regla',
  title: 'Registrar un pago reportado no confirma el cobro',
  items: ['Registrar un pago reportado no confirma el cobro.', 'Sigue pendiente de confirmar.'],
});

export const STANDING_RULES: readonly GuidanceNoteModel[] = [
  guidanceNote({
    id: 'standing-inicio',
    kind: 'regla',
    title: 'Inicio',
    items: ['Inicio muestra lo que ya requiere su atención. No inventa urgencias ni plazos.'],
  }),
  guidanceNote({
    id: 'standing-buscar',
    kind: 'regla',
    title: 'Buscar',
    items: ['Buscar encuentra clientes, oportunidades, cotizaciones y trabajo de su alcance. No crea registros.'],
  }),
  CARGO_IS_NOT_AUTHORITY,
  APPROVE_DOES_NOT_CREATE_ORDER,
  CONVERT_CREATES_ORDER,
  guidanceNote({
    id: 'standing-vista-demo',
    kind: 'regla',
    title: 'Vista demo',
    items: [
      'Lo marcado Vista demo no está conectado. No es una cifra ni un pendiente de hoy. Se activará cuando exista la fuente real.',
    ],
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// Access explanation (for Ayuda page)
// ─────────────────────────────────────────────────────────────────────────────

export const ACCESS_EXPLANATION = guidanceNote({
  id: 'access-explanation',
  kind: 'regla',
  title: 'Tu acceso',
  items: [
    'Cada persona tiene su propio acceso.',
    'Lo que puedes ver o cambiar depende de los permisos que tengas asignados.',
    'Tu cargo no te da permisos automáticamente.',
    'Ver algo no siempre significa que puedes modificarlo.',
    'No compartas tu cuenta con otra persona.',
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp / Mensajes (unwired placeholder)
// ─────────────────────────────────────────────────────────────────────────────

export const WHATSAPP_UNWIRED = guidanceNote({
  id: 'whatsapp-unwired',
  kind: 'regla',
  title: 'Mensajes todavía no está conectado',
  items: [
    'Más adelante, esta área podrá reunir conversaciones y compromisos relacionados con clientes cuando se conecte el servicio correspondiente.',
    'Un mensaje es evidencia, no necesariamente una verdad confirmada.',
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// AI honest future (unwired placeholder)
// ─────────────────────────────────────────────────────────────────────────────

export const AI_FUTURE_UNWIRED = guidanceNote({
  id: 'ai-future-unwired',
  kind: 'regla',
  title: 'Asistencia de IA',
  items: [
    'La IA podrá ayudar a resumir, explicar, preparar y sugerir próximos pasos.',
    'La IA no aprueba, no confirma pagos, no cambia precios y no otorga permisos.',
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Glossary short entries (for Ayuda page)
// ─────────────────────────────────────────────────────────────────────────────

export const GLOSSARY_SHORT = guidanceNote({
  id: 'glossary-short',
  kind: 'consejo',
  title: 'Glosario breve',
  items: [
    'Cliente 360 — vista unificada del cliente: datos, oportunidades, cotizaciones, pedidos.',
    'Responsable — el miembro asignado a una cuenta u oportunidad.',
    'Oportunidad — un posible negocio antes de convertirse en cotización.',
    'Cotización — propuesta de precios y condiciones para el cliente.',
    'Pedido — compromiso confirmado a partir de una cotización enviada.',
    'Aprobación — decisión registrada que autoriza avanzar.',
    'Dato manual — información cargada manualmente, no sincronizada de otra fuente.',
    'Pendiente de confirmar — aún no validado por la empresa.',
    'Ubicación registrada — lugar guardado en el sistema, no necesariamente verificado.',
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Employee admin help (for authorized admins)
// ─────────────────────────────────────────────────────────────────────────────

export const EMPLOYEE_ADMIN_HELP = guidanceNote({
  id: 'employee-admin-help',
  kind: 'consejo',
  title: 'Administración de empleados',
  items: [
    'Invitar — envía una invitación al empleado para que cree su cuenta.',
    'Estado — indica si el empleado está activo, suspendido o terminado.',
    'Activar — habilita el acceso de un empleado.',
    'Suspender — desactiva temporalmente el acceso sin eliminar la cuenta.',
    'Reactivar — restaura el acceso de un empleado suspendido.',
    'Terminar — finaliza la relación laboral y desactiva el acceso.',
    'Rol — define qué permisos tiene el empleado.',
    'Cada empleado crea su propia contraseña.',
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Learning Mode contextual helper labels (exports for walkthrough core)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contextual helper label strings for Learning Mode.
 * Walkthrough core imports these to display in-context tips.
 */
export const LEARNING_MODE_LABELS = {
  consejo: 'Consejo',
  quéSignificaEsto: '¿Qué significa esto?',
  porQuéVeoEsto: '¿Por qué veo esto?',
  quéHagoAhora: '¿Qué hago ahora?',
} as const;

/**
 * Deterministic empty next-action message.
 * Displayed when no pending action is identified.
 */
export const EMPTY_NEXT_ACTION = 'No hay una acción pendiente identificada en este momento.' as const;
