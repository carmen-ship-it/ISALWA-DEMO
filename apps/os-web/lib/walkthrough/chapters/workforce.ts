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
  tourId: 'workforce',
  title: 'Trabajo y accesos',
  steps: [
    {
      stepId: 'trabajo-mios',
      target: 'work-list',
      title: 'Lo suyo, en Míos',
      body: 'En Trabajo, Míos es su cola: trabajo abierto, con responsable, cliente y fecha. Si está vacía, el seguimiento se registra en la ficha de un cliente, o alguien le asigna una tarea.',
      stateLabel: 'disponible',
      nextRoute: '/trabajo',
    },
    {
      stepId: 'trabajo-equipo-empresa',
      target: 'work-list',
      title: 'Equipo y empresa, solo si aparecen',
      body: 'Si su acceso lo permite, también pueden aparecer Equipo (las personas a su cargo) y Empresa. Esas vistas son solo lectura. Ver el trabajo de otra persona no le deja cambiarlo.',
      stateLabel: 'parcial',
    },
    {
      stepId: 'trabajo-vencido',
      target: 'work-list',
      title: 'Vencido se lee, no se dispara',
      body: 'Vencidos reúne el trabajo abierto cuya fecha ya pasó, con el tiempo transcurrido. Esa cifra es una etiqueta para leer. No manda recordatorios ni escala el tema: la escalación no está activa.',
      stateLabel: 'disponible',
      nextRoute: '/trabajo?view=overdue',
    },
    {
      stepId: 'acceso-propio',
      target: 'team',
      title: 'Cada quien, su acceso',
      body: 'Cada persona entra con su propio correo y su propia contraseña. No compartan una cuenta. Lo que alguien hace queda a nombre de quien lo hizo.',
      stateLabel: 'disponible',
      nextRoute: '/administracion/equipo',
    },
    {
      stepId: 'cargo-no-autoriza',
      target: 'team',
      title: 'El cargo no autoriza',
      body: 'El cargo no abre pantallas ni acciones. El rol se elige al invitar o en la ficha, y no se deduce del cargo. Ver una lista no es poder editarla.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'invitar-empleado',
      target: 'invite-employee',
      title: 'Invitar empleado',
      body: 'Quien administra personas usa Invitar empleado y anota nombre, apellido, correo y un rol. El rol hay que elegirlo: no sale del cargo. Enviar la invitación no crea una contraseña ni deja a esa persona administrando sola.',
      stateLabel: 'disponible',
      nextRoute: '/administracion/equipo/invitar',
    },
    {
      stepId: 'invitacion-enviada',
      target: 'invite-employee',
      title: 'La contraseña la crea la persona',
      body: 'Después de enviar, el estado queda en Invitación enviada, y la persona crea su contraseña en el correo de acceso. ISALWA no la guarda y Carmen no debe conocerla. Si el correo no sale, no se crea ninguna contraseña.',
      stateLabel: 'parcial',
    },
    {
      stepId: 'estados-acceso',
      target: 'team',
      title: 'Activo, suspender y cerrar',
      body: 'Quien está Activo puede entrar. En la ficha, según el estado, Suspender acceso bloquea la entrada sin cerrar la relación; Reactivar acceso la devuelve y no es un recontrato. Finalizar relación es permanente y revoca el acceso.',
      stateLabel: 'disponible',
    },
  ],
};
