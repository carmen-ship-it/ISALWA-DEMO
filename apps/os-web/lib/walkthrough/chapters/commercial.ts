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
  tourId: 'commercial',
  title: 'Oportunidades, cotizaciones y pedidos',
  steps: [
    {
      stepId: 'opportunities',
      target: 'opportunity-list',
      title: 'Una posibilidad en curso',
      body: 'Una oportunidad es una posibilidad comercial todavía en proceso. Ves el estado, el cliente, el monto estimado y quién es el responsable.',
      stateLabel: 'disponible',
      nextRoute: '/oportunidades',
    },
    {
      stepId: 'quotes',
      target: 'quote-list',
      title: 'La oferta del cliente',
      body: 'La cotización es la oferta de esa posibilidad. En la lista ves el estado, el cliente, el total y el responsable.',
      stateLabel: 'disponible',
      nextRoute: '/cotizaciones',
    },
    {
      stepId: 'quote-status',
      target: 'quote-status',
      title: 'Cómo va la cotización',
      body: 'Puede estar en borrador, enviada, aceptada o cancelada. Convertir a pedido crea un pedido solo si esa acción ya está en una cotización enviada y elegible. Esta función está terminando su validación: hoy no la des por disponible.',
      stateLabel: 'validacion',
      nextRoute: '/cotizaciones',
    },
    {
      stepId: 'quote-pdf',
      target: 'quote-pdf',
      title: 'Revisar o compartir',
      body: 'Desde la cotización puedes abrir el documento para revisarlo o compartirlo. Abrirlo no cambia el estado ni crea un pedido.',
      stateLabel: 'disponible',
      nextRoute: '/cotizaciones',
    },
    {
      stepId: 'orders',
      target: 'order-list',
      title: 'El pedido registrado',
      body: 'Un pedido queda registrado desde una cotización. Ves el estado, el cliente, el total y el responsable. Despacho, cobranzas e inventario no están conectados.',
      stateLabel: 'parcial',
      nextRoute: '/clientes',
    },
    {
      stepId: 'approval-consequence',
      target: 'approval-consequence',
      title: 'Aprobar no crea un pedido',
      body: 'Ves quién solicitó, quién debe aprobar y el estado. Aprobar registra la decisión y no crea un pedido. Aprobar o rechazar entre varias personas está terminando su validación.',
      stateLabel: 'validacion',
      nextRoute: '/aprobaciones',
    },
  ],
};
