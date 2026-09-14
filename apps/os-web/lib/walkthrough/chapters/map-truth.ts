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
  tourId: 'map',
  title: 'Mapa y verdad de los datos',
  steps: [
    {
      stepId: 'cobertura',
      target: 'map-coverage',
      title: 'Qué muestra el mapa',
      body: 'La ubicación se puede guardar como coordenadas, y aquí ves quién ya las tiene entre los clientes visibles. El mapa interactivo no está conectado: no hay mapa para recorrer ni mapa de calor. Se activará cuando conectemos un proveedor.',
      stateLabel: 'parcial',
      nextRoute: '/mapa',
    },
    {
      stepId: 'salud-de-datos',
      target: 'map-coverage',
      title: 'Salud de datos es revisión',
      body: 'Si dos clientes comparten un enlace, conviene revisarlo con quien los conoce. No se fusionan en silencio ni se elige cuál dato es el correcto. No es un mapa de calor.',
      stateLabel: 'parcial',
      nextRoute: '/mapa',
    },
    {
      stepId: 'ubicacion',
      target: 'location-state',
      title: 'Coordenadas y procedencia',
      body: 'Las coordenadas son un hecho de ubicación. Un enlace de Maps es procedencia, de dónde salió el dato. No son lo mismo, y el enlace no coloca al cliente en el mapa.',
      stateLabel: 'disponible',
    },
    {
      stepId: 'dato-manual',
      target: 'manual-draft',
      title: 'Dato manual',
      body: 'En la ficha puedes anotar lo que alguien informa: un pago, un despacho o un stock. Queda marcado Dato manual y Pendiente de confirmar, y no se guarda en el sistema. Un pago reportado no es dinero cobrado.',
      stateLabel: 'manual',
    },
    {
      stepId: 'vista-demo',
      title: 'Vista demo no es de hoy',
      body: 'Lo marcado Vista demo no está conectado. No es una cifra ni un pendiente de hoy.',
      stateLabel: 'vista-demo',
    },
  ],
};
