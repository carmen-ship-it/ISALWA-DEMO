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
  tourId: 'customer',
  title: 'Clientes',
  steps: [
    {
      stepId: 'customer-search',
      title: 'Buscar',
      body: 'Escriba un nombre, un contacto o un teléfono y pulse Buscar. Limpiar vuelve al listado.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-filters',
      title: 'Filtros',
      body: 'Filtre por relación: cliente, proveedor, distribuidor o socio. Todas quita ese filtro.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-row',
      target: 'customer-row',
      title: 'La fila',
      body: 'El nombre abre Cliente 360. El estado dice Activo, Inactivo o Fusionado. El responsable se muestra solo si hay uno asignado.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-quick-view',
      target: 'customer-quick-view',
      title: 'Vista rápida',
      body: 'En Más acciones, Vista rápida mira sin salir de la lista. Ahí ve el estado, el responsable y un recorte de la relación. La ficha completa sigue en Cliente 360.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-location',
      target: 'location-state',
      title: 'Ubicación',
      body: 'Las coordenadas son la ubicación. Un enlace de Maps es procedencia: de dónde salió el dato. No es lo mismo. Sin coordenadas, ese enlace no ubica al cliente.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-add',
      title: 'Agregar cliente',
      body: 'Agregar cliente pide buscar primero. Si ya existe, ábralo. Crear uno nuevo no fusiona registros.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-360',
      target: 'customer-360',
      title: 'Cliente 360',
      body: 'Aquí se reúne la relación: responsable, contacto, ubicación y actividad reciente. No inventa una llamada ni una visita.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-next-action',
      target: 'customer-360',
      title: '¿Qué hago ahora?',
      body: 'Solo indica una acción si ya hay un seguimiento guardado, un registro principal por fusión, o si usted puede asignar responsable. Si no, dice que no hay señal suficiente.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'customer-later',
      title: 'Más adelante',
      body: 'Compromisos, evidencia y escalamiento no están en este recorrido. Más adelante.',
      stateLabel: 'proximamente',
    },
  ],
};
