/**
 * Ayuda / cómo trabajamos. Content only.
 * Framework places data-tour and wires replay buttons later.
 * No governed Sugerencia exists, so that word is omitted.
 * This chapter does not own Mapa navigation.
 */

export type TourStateLabel =
  | 'disponible'
  | 'manual'
  | 'parcial'
  | 'preparacion'
  | 'proximamente'
  | 'vista-demo'
  | 'validacion';

export type TourStep = {
  stepId: string;
  target?: string;
  title: string;
  body: string;
  stateLabel: TourStateLabel;
  nextRoute?: string;
};

export type TourChapter = {
  tourId: string;
  title: string;
  steps: TourStep[];
};

export const ALLOWED_TARGETS = ['help', 'learning-mode'] as const;

export type KnowledgeTarget = (typeof ALLOWED_TARGETS)[number];

/** Consejo = recommendation to work better. Not a system definition. */
export const consejo = {
  label: 'Consejo',
  meaning: 'Una recomendación para trabajar mejor. Puede no seguirla.',
} as const;

/** Regla = how the system is defined to work. Not advice. */
export const regla = {
  label: 'Regla',
  meaning: 'Cómo está definido el sistema. No es una recomendación.',
} as const;

export const learningMode = {
  onTitle: 'Avisos extra',
  onBody: 'Los consejos extra se pueden apagar cuando ya no los necesite.',
  offHint: 'Si los apaga, las recomendaciones desaparecen y las reglas siguen vigentes.',
} as const;

export const replay = {
  title: 'Volver a hacer el recorrido',
  pageHint: 'Ver recorrido de esta página',
  /** Chapter names only. No routes and no buttons. */
  tours: ['global', 'customer', 'commercial', 'workforce', 'knowledge', 'map', 'messages'] as const,
  tourNames: ['Orientación', 'Clientes', 'Comercial', 'Equipo', 'Ayuda', 'Mapa', 'Mensajes'] as const,
} as const;

const validationNote = 'Esta función está terminando su validación.';

export const chapter: TourChapter = {
  tourId: 'knowledge',
  title: 'Cómo trabajamos',
  steps: [
    {
      stepId: 'ayuda',
      target: 'help',
      title: 'Cómo trabajamos',
      body: 'Aquí está lo que ya rige el trabajo. No sustituye una autorización ni un dato que aún no existe.',
      stateLabel: 'disponible',
      nextRoute: '/ayuda',
    },
    {
      stepId: 'consejo',
      title: 'Consejo',
      body: 'Un consejo es una recomendación para trabajar mejor. Conviene buscar por nombre y teléfono antes de crear un cliente. Puede no seguirlo.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'regla',
      title: 'Regla',
      body: 'Una regla dice cómo está definido el sistema. Aprobar registra la decisión y no crea un pedido. Un mensaje del cliente no confirma un pago.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'distincion',
      title: 'No se mezclan',
      body: 'Buscar antes de crear es un consejo. Que crear no fusione clientes es una regla. El consejo no se vuelve obligación, ni la regla un tip.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'junto-a-la-accion',
      title: 'Junto a la acción',
      body: 'El aviso aparece donde va a decidir, antes de crear, enviar o convertir. Léalo ahí. Ayuda no decide por usted.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'que-hago-ahora',
      title: '¿Qué hago ahora?',
      body: 'En Cliente 360 esa frase es una señal de lo que ya está registrado. No es inteligencia. Si no hay señal suficiente, lo dice y no inventa una llamada ni una visita.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'vista-demo',
      title: 'Vista demo',
      body: 'Lo marcado Vista demo no está conectado. No es una cifra ni un pendiente de hoy. Se activará cuando exista la fuente real.',
      stateLabel: 'vista-demo',
    },
    {
      stepId: 'aprendizaje',
      target: 'learning-mode',
      title: learningMode.onTitle,
      body: `${learningMode.onBody} ${learningMode.offHint} ${validationNote}`,
      stateLabel: 'validacion',
    },
    {
      stepId: 'volver',
      target: 'help',
      title: replay.title,
      body: `Desde Ayuda, los recorridos se llaman ${replay.tourNames.slice(0, -1).join(', ')} y ${replay.tourNames.at(-1)}. Aquí solo están los nombres. ${replay.pageHint} abre el de la página en la que está; ${validationNote.charAt(0).toLowerCase()}${validationNote.slice(1)}`,
      stateLabel: 'validacion',
    },
  ],
};
