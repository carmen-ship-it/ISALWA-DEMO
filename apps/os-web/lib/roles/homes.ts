import { managementCommandCenter } from '@/lib/management/command-center';
import type { NamedExceptionId } from '@/lib/management/exceptions';
import {
  DEPARTMENT_LENSES,
  asesorMaySee,
  departmentLensAllowed,
  hasCommercialOwnWorkScope,
  hasCompanyCommercialRead,
  hasTeamCommercialRead,
  jefeMaySee,
  mayAuthorizePaymentException,
  requireSessionOrganization,
  sameTenant,
  systemControlsAllowed,
  type CommercialRow,
  type RoleSession,
  type Visibility,
} from '@/lib/roles/access';
import {
  ATTENTION_QUESTION,
  NO_RECORD,
  mountedDeskHref,
  queueItem,
  type QueueItem,
} from '@/lib/roles/queues';

export type QueueKind =
  | 'follow-up'
  | 'quote'
  | 'customer-date'
  | 'approval'
  | 'order-needs-customer'
  | 'customer'
  | 'opportunity'
  | 'order';

export type QueueRecord = CommercialRow & {
  kind: QueueKind;
  subject: string;
  href: string | null;
  visibility: Visibility;
};

export type PaymentExceptionRecord = {
  id: string;
  organizationId: string;
  subject: string;
  href: string | null;
};

export type ExceptionRecord = {
  id: string;
  organizationId: string;
  exceptionId: NamedExceptionId;
  subject: string;
  href: string | null;
};

export type RoleQueue = {
  id: string;
  title: string;
  empty: string;
  /** Set when this list has no tenant-scoped load on this branch. Not a zero. */
  unavailable: string | null;
  deskHref: string | null;
  items: QueueItem[];
};

export type RoleAction = { label: string; href: string };

export type RoleHome = {
  id: string;
  kicker: string;
  title: string;
  question: typeof ATTENTION_QUESTION;
  description: string;
  queues: RoleQueue[];
  nextAction: RoleAction | null;
  actions: RoleAction[];
};

export type TechnicalControl = {
  id: string;
  label: string;
  href: string | null;
  unavailable: string | null;
};

export type SystemControls = {
  id: 'system-controls';
  label: string;
  href: string;
  separateFromBusinessHome: true;
  /** No live integration or health figure. A missing route stays unavailable. */
  includesIntegrationHealth: false;
  controls: TechnicalControl[];
};

export type OperatingHomesModel = {
  status: 'loading' | 'ready' | 'denied';
  denial: 'missing-organization' | 'unauthorized-role' | 'capabilities-unavailable' | null;
  businessHomes: RoleHome[];
  systemControls: SystemControls | null;
};

const EMPTY = 'No hay un registro.';
const UNAVAILABLE = 'No disponible. Esta lista no está cargada para esta empresa.';

/** Kinds the commercial record list can fill. Other kinds stay unavailable until loaded. */
const RECORD_BACKED: readonly QueueKind[] = [
  'follow-up',
  'quote',
  'customer-date',
  'approval',
  'order-needs-customer',
];

const GERENTE_EXCEPTION_QUEUES: ReadonlyArray<{
  id: string;
  title: string;
  exceptionIds: readonly NamedExceptionId[];
  deskHref: string | null;
}> = [
  {
    id: 'gerente-exceptions',
    title: 'Excepciones de la empresa',
    exceptionIds: ['missing-evidence'],
    deskHref: null,
  },
  {
    id: 'gerente-production-risk',
    title: 'Riesgos de producción',
    exceptionIds: ['production-calendar-risk', 'customer-date-vs-production'],
    deskHref: '/produccion',
  },
  {
    id: 'gerente-purchase-blockers',
    title: 'Bloqueos de compra',
    exceptionIds: ['purchase-requests-pending'],
    deskHref: '/compras',
  },
  {
    id: 'gerente-finished-goods',
    title: 'Producto terminado en espera de asignación',
    exceptionIds: ['finished-goods-awaiting-allocation'],
    deskHref: '/almacen',
  },
  {
    id: 'gerente-awaiting-communication',
    title: 'Clientes que esperan comunicación',
    exceptionIds: ['customer-not-informed'],
    deskHref: '/mensajes',
  },
];

function desk(href: string | null | undefined): string | null {
  return mountedDeskHref(href);
}

function action(label: string, href: string): RoleAction | null {
  const mounted = desk(href);
  return mounted ? { label, href: mounted } : null;
}

function actionsOf(...entries: Array<RoleAction | null>): RoleAction[] {
  return entries.filter((entry): entry is RoleAction => entry !== null);
}

function itemsFor(
  session: RoleSession,
  records: readonly QueueRecord[],
  kind: QueueKind,
  allow: (session: RoleSession, row: QueueRecord) => boolean,
): QueueItem[] {
  return records
    .filter((row) => row.kind === kind && allow(session, row))
    .map((row) => queueItem({ id: row.id, subject: row.subject, href: row.href }));
}

function queue(
  id: string,
  title: string,
  items: QueueItem[],
  deskHref: string | null = null,
): RoleQueue {
  return { id, title, empty: EMPTY, unavailable: null, deskHref, items };
}

function unavailableQueue(id: string, title: string, deskHref: string | null = null): RoleQueue {
  return {
    id,
    title,
    empty: EMPTY,
    unavailable: UNAVAILABLE,
    deskHref,
    items: [],
  };
}

function recordQueue(
  id: string,
  title: string,
  kind: QueueKind,
  records: readonly QueueRecord[],
  items: QueueItem[],
  deskHref: string | null = null,
): RoleQueue {
  const provided = RECORD_BACKED.includes(kind) || records.some((row) => row.kind === kind);
  if (!provided) return unavailableQueue(id, title, deskHref);
  return queue(id, title, items, deskHref);
}

function paymentItems(
  session: RoleSession,
  records: readonly PaymentExceptionRecord[],
): QueueItem[] {
  if (!mayAuthorizePaymentException(session.grantedScopes)) return [];
  if (!requireSessionOrganization(session)) return [];
  return records
    .filter((row) => sameTenant(session, row.organizationId))
    .map((row) => queueItem({ id: row.id, subject: row.subject, href: row.href }));
}

function exceptionItems(
  session: RoleSession,
  exceptions: readonly ExceptionRecord[],
  exceptionIds: readonly NamedExceptionId[],
): QueueItem[] {
  const counted = managementCommandCenter({
    session,
    records: exceptions.filter((row) => exceptionIds.includes(row.exceptionId)),
  });
  if (!counted.allowed) return [];
  return counted.items.map((item) => queueItem({ id: item.id, subject: item.subject, href: item.href }));
}

function asesorHome(session: RoleSession, records: readonly QueueRecord[]): RoleHome | null {
  if (!hasCommercialOwnWorkScope(session.grantedScopes)) return null;
  return {
    id: 'asesor',
    kicker: 'Asesor',
    title: 'Su trabajo y cobertura',
    question: ATTENTION_QUESTION,
    description:
      'Solo lo propio, o un cliente cubierto. Clientes, trabajo, cotizaciones, pedidos y lo que espera al cliente. No es la lectura del equipo.',
    queues: [
      recordQueue(
        'asesor-customers',
        'Clientes propios',
        'customer',
        records,
        itemsFor(session, records, 'customer', asesorMaySee),
        desk('/clientes'),
      ),
      queue(
        'asesor-follow-up',
        'Seguimientos',
        itemsFor(session, records, 'follow-up', asesorMaySee),
        desk('/trabajo'),
      ),
      queue(
        'asesor-quote',
        'Cotizaciones',
        itemsFor(session, records, 'quote', asesorMaySee),
        desk('/cotizaciones'),
      ),
      recordQueue(
        'asesor-orders',
        'Pedidos',
        'order',
        records,
        itemsFor(session, records, 'order', asesorMaySee),
        desk('/clientes'),
      ),
      unavailableQueue('asesor-communication', 'Comunicación con el cliente', desk('/mensajes')),
      queue(
        'asesor-date',
        'Riesgo de fecha con el cliente',
        itemsFor(session, records, 'customer-date', asesorMaySee),
      ),
      queue(
        'asesor-approval',
        'Aprobaciones en espera',
        itemsFor(session, records, 'approval', asesorMaySee),
        desk('/aprobaciones'),
      ),
      queue(
        'asesor-order',
        'Pedidos que necesitan al cliente',
        itemsFor(session, records, 'order-needs-customer', asesorMaySee),
      ),
    ],
    nextAction: action('Ir a clientes', '/clientes'),
    actions: actionsOf(action('Acción comercial', '/cotizaciones'), action('Mensajes', '/mensajes')),
  };
}

function jefeHome(
  session: RoleSession,
  records: readonly QueueRecord[],
  payments: readonly PaymentExceptionRecord[],
): RoleHome | null {
  if (!hasTeamCommercialRead(session.grantedScopes)) return null;
  const queues = [
    recordQueue(
      'jefe-clients',
      'Clientes del equipo',
      'customer',
      records,
      itemsFor(session, records, 'customer', jefeMaySee),
      desk('/clientes'),
    ),
    recordQueue(
      'jefe-opportunities',
      'Oportunidades del equipo',
      'opportunity',
      records,
      itemsFor(session, records, 'opportunity', jefeMaySee),
      desk('/oportunidades'),
    ),
    queue(
      'jefe-quote',
      'Cotizaciones del equipo',
      itemsFor(session, records, 'quote', jefeMaySee),
      desk('/cotizaciones'),
    ),
    recordQueue(
      'jefe-orders',
      'Pedidos del equipo',
      'order',
      records,
      itemsFor(session, records, 'order', jefeMaySee),
    ),
    queue(
      'jefe-follow-up',
      'Seguimientos del equipo',
      itemsFor(session, records, 'follow-up', jefeMaySee),
      desk('/trabajo'),
    ),
    queue(
      'jefe-approval',
      'Aprobaciones que esperan al equipo',
      itemsFor(session, records, 'approval', jefeMaySee),
      desk('/aprobaciones'),
    ),
    queue(
      'jefe-date',
      'Riesgo de fecha con el cliente del equipo',
      itemsFor(session, records, 'customer-date', jefeMaySee),
    ),
  ];
  if (mayAuthorizePaymentException(session.grantedScopes)) {
    queues.push(
      queue('jefe-exception', 'Excepciones comerciales por autorizar', paymentItems(session, payments), desk('/aprobaciones')),
    );
  }
  return {
    id: 'jefe',
    kicker: 'Jefe',
    title: 'Trabajo comercial del equipo',
    question: ATTENTION_QUESTION,
    description: 'Lectura comercial de las personas a su cargo. No administra personas ni el sistema.',
    queues,
    nextAction: action('Ver cotizaciones', '/cotizaciones'),
    actions: actionsOf(action('Oportunidades', '/oportunidades'), action('Aprobaciones', '/aprobaciones')),
  };
}

function gerenteQueues(
  session: RoleSession,
  exceptions: readonly ExceptionRecord[],
  payments: readonly PaymentExceptionRecord[],
): RoleQueue[] {
  const queues: RoleQueue[] = [
    unavailableQueue('gerente-blockers', 'Bloqueos entre áreas', desk('/coordinacion')),
    unavailableQueue('gerente-special-orders', 'Pedidos especiales'),
  ];
  for (const spec of GERENTE_EXCEPTION_QUEUES) {
    queues.push(
      queue(
        spec.id,
        spec.title,
        exceptionItems(session, exceptions, spec.exceptionIds),
        desk(spec.deskHref),
      ),
    );
  }
  queues.push(
    unavailableQueue('gerente-partial', 'Cumplimiento parcial'),
    unavailableQueue('gerente-decisions', 'Decisiones en espera', desk('/aprobaciones')),
    unavailableQueue('gerente-changes', 'Cambios importantes'),
  );
  if (mayAuthorizePaymentException(session.grantedScopes)) {
    queues.unshift(
      queue(
        'gerente-exception',
        'Excepciones de pago por autorizar',
        paymentItems(session, payments),
        desk('/aprobaciones'),
      ),
    );
  }
  return queues;
}

function gerenteHome(
  session: RoleSession,
  exceptions: readonly ExceptionRecord[],
  payments: readonly PaymentExceptionRecord[],
): RoleHome | null {
  if (!hasCompanyCommercialRead(session.grantedScopes)) return null;
  return {
    id: 'gerente',
    kicker: 'Gerencia',
    title: 'Excepciones de la empresa',
    question: ATTENTION_QUESTION,
    description:
      'Solo excepciones ya registradas de esta empresa. Operación de negocio. Sin controles de infraestructura.',
    queues: gerenteQueues(session, exceptions, payments),
    nextAction: null,
    actions: actionsOf(action('Coordinación', '/coordinacion'), action('Aprobaciones', '/aprobaciones')),
  };
}

const DEPARTMENT_QUEUES: Record<
  string,
  ReadonlyArray<{ id: string; title: string; deskHref?: string }>
> = {
  produccion: [
    { id: 'produccion-risk', title: 'Riesgos de producción', deskHref: '/produccion' },
    { id: 'produccion-next', title: 'Qué espera producción', deskHref: '/produccion' },
  ],
  almacen: [
    { id: 'almacen-allocation', title: 'Producto terminado en espera de asignación', deskHref: '/almacen' },
    { id: 'almacen-exit', title: 'Salida de almacén', deskHref: '/almacen' },
  ],
  compras: [
    { id: 'compras-solicitado', title: 'Solicitado', deskHref: '/compras' },
    { id: 'compras-cotizandose', title: 'Cotizándose', deskHref: '/compras' },
    { id: 'compras-preparandose', title: 'Pedido y Preparándose', deskHref: '/compras' },
    { id: 'compras-entregado', title: 'Entregado', deskHref: '/compras' },
  ],
  contabilidad: [
    { id: 'contabilidad-payment', title: 'Evidencia de pago operativo', deskHref: '/entregas' },
    { id: 'contabilidad-release', title: 'Evidencia de liberación', deskHref: '/entregas' },
    { id: 'contabilidad-sku', title: 'Contexto de SKU', deskHref: '/productos' },
  ],
  auxiliar: [
    { id: 'auxiliar-issues', title: 'Cruces entre áreas', deskHref: '/coordinacion' },
    { id: 'auxiliar-decisions', title: 'Registro de decisiones', deskHref: '/aprobaciones' },
    { id: 'auxiliar-owners', title: 'Responsables' },
    { id: 'auxiliar-due', title: 'Fechas de compromiso', deskHref: '/trabajo' },
  ],
};

function departmentHomes(grantedScopes: readonly string[]): RoleHome[] {
  return DEPARTMENT_LENSES.filter((lens) => departmentLensAllowed(grantedScopes, lens.scopes)).map(
    (lens) => {
      const specs = DEPARTMENT_QUEUES[lens.id] ?? [{ id: lens.id, title: lens.kicker, deskHref: lens.href }];
      return {
        id: lens.id,
        kicker: lens.kicker,
        title: lens.title,
        question: ATTENTION_QUESTION,
        description: lens.description,
        queues: specs.map((spec) => unavailableQueue(spec.id, spec.title, desk(spec.deskHref))),
        nextAction: action(lens.action, lens.href),
        actions: [],
      };
    },
  );
}

function technicalControl(id: string, label: string, href: string | null): TechnicalControl {
  const mounted = href ? desk(href) : null;
  return {
    id,
    label,
    href: mounted,
    unavailable: mounted ? null : UNAVAILABLE,
  };
}

export function systemControlsFor(grantedScopes: readonly string[]): SystemControls | null {
  if (!systemControlsAllowed(grantedScopes)) return null;
  return {
    id: 'system-controls',
    label: 'Controles del sistema',
    href: '/administracion',
    separateFromBusinessHome: true,
    includesIntegrationHealth: false,
    controls: [
      technicalControl('access', 'Acceso', '/administracion/accesos'),
      technicalControl('capabilities', 'Capacidades', '/administracion/capacidades'),
      technicalControl('integration', 'Estado de integración', null),
      technicalControl('audit', 'Auditoría y recuperación', null),
      technicalControl('configuration', 'Configuración', null),
      technicalControl('import-source', 'Importación y origen', null),
      technicalControl('health', 'Salud del sistema', null),
    ],
  };
}

export function composeOperatingHomes(input: {
  session: RoleSession | null | undefined;
  records?: readonly QueueRecord[];
  exceptions?: readonly ExceptionRecord[];
  payments?: readonly PaymentExceptionRecord[];
}): OperatingHomesModel {
  const session = input.session;
  if (!requireSessionOrganization(session) || !session) {
    return {
      status: 'denied',
      denial: 'missing-organization',
      businessHomes: [],
      systemControls: null,
    };
  }
  const records = input.records ?? [];
  const exceptions = input.exceptions ?? [];
  const payments = input.payments ?? [];
  const businessHomes = [
    asesorHome(session, records),
    jefeHome(session, records, payments),
    gerenteHome(session, exceptions, payments),
    ...departmentHomes(session.grantedScopes),
  ].filter((home): home is RoleHome => home !== null);

  return {
    status: 'ready',
    denial: null,
    businessHomes,
    systemControls: systemControlsFor(session.grantedScopes),
  };
}

export function homeById(model: OperatingHomesModel, id: string): RoleHome | null {
  return model.businessHomes.find((home) => home.id === id) ?? null;
}

export function businessHomeHasSystemControls(home: RoleHome | null): boolean {
  if (!home) return false;
  const text = JSON.stringify(home);
  return /system\.admin|integration\.admin|integraci[oó]n|controles del sistema|\/administracion/i.test(
    text,
  );
}

export { NO_RECORD };
