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

export const chapter: TourChapter = {
  tourId: 'global',
  title: 'Cómo empezar',
  steps: [
    {
      stepId: 'global.inicio',
      target: 'home-attention',
      title: 'Inicio',
      body: 'Empiece en Inicio. Ahí están los pendientes, las decisiones y el seguimiento que ya piden su atención.',
      stateLabel: 'disponible',
      nextRoute: '/inicio',
    },
    {
      stepId: 'global.vista-demo',
      title: 'Vista demo',
      body: 'Lo marcado Vista demo no está conectado. No es una cifra ni un pendiente de hoy.',
      stateLabel: 'vista-demo',
    },
    {
      stepId: 'global.buscar',
      target: 'global-search',
      title: 'Buscar',
      body: 'Buscar encuentra clientes, cotizaciones y trabajo de su alcance. No crea registros.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'global.nav',
      target: 'nav-primary',
      title: 'A dónde ir',
      body: 'El menú lleva a Inicio, Clientes, Oportunidades, Cotizaciones, Trabajo, Aprobaciones y Administración. Administración aparece solo si su acceso lo incluye.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'global.responsable',
      title: 'Responsable',
      body: 'El responsable es el miembro asignado a ese tema. El cargo no asigna la cuenta ni autoriza una decisión.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'global.que-cambio',
      title: 'Qué cambió',
      body: 'Qué cambió es el historial de un cliente ya abierto. No es una página de toda la empresa, y puede no ser el registro completo.',
      stateLabel: 'parcial',
    },
    {
      stepId: 'global.ayuda',
      target: 'help',
      title: 'Ayuda',
      body: 'Puede salir cuando quiera. Para volver al recorrido, ábralo desde Ayuda.',
      stateLabel: 'disponible',
      nextRoute: '/ayuda',
    },
    {
      stepId: 'global.listo',
      title: 'Listo',
      body: 'Ya conoces lo esencial. Cuando entres por primera vez a una sección, ISALWA puede mostrarte rápidamente cómo funciona. También puedes repetir cualquier recorrido desde Ayuda.',
      stateLabel: 'disponible',
    },
  ],
};

export const welcome = {
  title: 'Bienvenido a ISALWA',
  body: 'Primer paso para clientes, pendientes, decisiones y seguimiento en un solo lugar. Aquí verá quién maneja cada tema y qué conviene revisar después.',
  startLabel: 'Comenzar recorrido',
  skipLabel: 'Explorar por mi cuenta',
  later: 'Puedes salir cuando quieras y volver desde Ayuda.',
};
