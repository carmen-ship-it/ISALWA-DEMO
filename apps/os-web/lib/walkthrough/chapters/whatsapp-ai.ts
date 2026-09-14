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

/**
 * Future capabilities stay prefixed with Próximamente or Cuando conectemos.
 * WhatsApp and OpenAI are not connected. Evidence review is not on a page.
 * The payment sentence is a present truth, not a future one.
 */
export const chapter: TourChapter = {
  tourId: 'messages',
  title: 'Mensajes, todavía no',
  steps: [
    {
      stepId: 'messages-not-connected',
      target: 'messages-future',
      title: 'Mensajes está en Próximamente',
      body: 'En Mensajes dice Próximamente. WhatsApp no está conectado. Cuando conectemos WhatsApp, esta página va a dejar de ser solo un aviso.',
      stateLabel: 'proximamente',
      nextRoute: '/mensajes',
    },
    {
      stepId: 'source-confidence-confirmation',
      title: 'Tres cosas distintas',
      body: 'Origen = de dónde salió. Confianza = qué tan bien lo entendimos. Confirmación = si la empresa lo acepta. El cliente dijo que pagó no es un pago confirmado.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'evidence-review-not-on-a-page',
      title: 'La revisión todavía no está',
      body: 'Próximamente, cuando conectemos la revisión de evidencia, vas a poder mirar origen, confianza y confirmación juntos. Hoy esa revisión no está en una página.',
      stateLabel: 'proximamente',
    },
    {
      stepId: 'future-conversations',
      target: 'messages-future',
      title: 'Próximamente: la conversación',
      body: 'Cuando conectemos WhatsApp, vas a ver las conversaciones con clientes, el tiempo de espera, las preguntas sin responder y si hay frustración o urgencia. Hoy WhatsApp no está conectado.',
      stateLabel: 'proximamente',
    },
    {
      stepId: 'future-ai-prepares',
      title: 'Próximamente: la IA prepara',
      body: 'Cuando conectemos OpenAI, la IA podrá ayudar a entender y preparar: borradores de respuesta, resúmenes, la preparación de una llamada, qué cambió en la conversación y próximos pasos sugeridos. No podrá aprobar, confirmar pagos, cambiar precios ni tomar decisiones delicadas. Hoy OpenAI no está conectado.',
      stateLabel: 'proximamente',
    },
    {
      stepId: 'future-commitment-escalation',
      title: 'Próximamente: escalar no reasigna',
      body: 'Cuando conectemos esas funciones, se podrá guardar un compromiso y preparar un escalamiento. El escalamiento no cambia al responsable automáticamente. Próximamente también la inteligencia para la dirección. Hoy ninguna de esas tres está activa.',
      stateLabel: 'proximamente',
    },
  ],
};
