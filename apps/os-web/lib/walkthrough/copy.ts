import type { TourWelcome } from './types';

/** Local fallback until chapters/global.ts registers a welcome. Not a product chapter. */
export const FALLBACK_WELCOME: TourWelcome = {
  title: 'Bienvenido a ISALWA',
  kicker: 'Primer paso',
  body: 'Puedes salir cuando quieras y volver desde Ayuda.',
};

export const SHELL_CONTROLS = {
  start: 'Comenzar recorrido',
  explore: 'Explorar por mi cuenta',
  close: 'Cerrar recorrido',
  later: 'Continuar después',
  home: 'Volver a Inicio',
  previous: 'Anterior',
  next: 'Siguiente',
  replay: 'Volver a hacer el recorrido',
  pageTour: 'Ver recorrido de esta página',
  pageOfferTitle: '¿Primera vez aquí?',
  viewTour: 'Ver recorrido',
  notNow: 'Ahora no',
} as const;

export const LEARNING_MODE_LABEL = 'Modo aprendizaje';

export const STATE_LABEL_TEXT = {
  disponible: 'Disponible',
  manual: 'Manual',
  parcial: 'Parcial',
  preparacion: 'En preparación',
  proximamente: 'Próximamente',
  'vista-demo': 'Vista demo',
  validacion: 'Validación',
} as const;
