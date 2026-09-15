import { namedExceptionLabels, type NamedExceptionId } from '@/lib/management/exceptions';
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
import { SYSTEM_CONTROLS_HREF } from '@/lib/roles/system-controls';

export type QueueKind =
  | 'follow-up'
  | 'quote'
  | 'customer-date'
  | 'approval'
  | 'order-needs-customer';

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

export type RoleQueue = {
  id: string;
  title: string;
  empty: string;
  items: QueueItem[];
};

export type RoleHome = {
  id: string;
  kicker: string;
  title: string;
  question: typeof ATTENTION_QUESTION;
  description: string;
  queues: RoleQueue[];
  nextAction: { label: string; href: string } | null;
};

export type SystemControls = {
  id: 'system-controls';
  label: string;
  href: string;
  separateFromBusinessHome: true;
  includesIntegrationHealth: false;
};

export type OperatingHomesModel = {
  status: 'loading' | 'ready' | 'denied';
  denial: 'missing-organization' | 'unauthorized-role' | null;
  businessHomes: RoleHome[];
  systemControls: SystemControls | null;
};

const EMPTY = 'No hay un registro.';

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
): RoleQueue {
  return { id, title, empty: EMPTY, items };
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

function asesorHome(session: RoleSession, records: readonly QueueRecord[]): RoleHome | null {
  if (!hasCommercialOwnWorkScope(session.grantedScopes)) return null;
  return {
    id: 'asesor',
    kicker: 'Asesor',
    title: 'Su trabajo y cobertura',
    question: ATTENTION_QUESTION,
    description:
      'Seguimientos, cotizaciones, fecha con el cliente y pedidos que esperan al cliente. Solo lo propio, o un cliente cubierto.',
    queues: [
      queue('asesor-follow-up', 'Seguimientos', itemsFor(session, records, 'follow-up', asesorMaySee)),
      queue('asesor-quote', 'Cotizaciones', itemsFor(session, records, 'quote', asesorMaySee)),
      queue(
        'asesor-date',
        'Riesgo de fecha con el cliente',
        itemsFor(session, records, 'customer-date', asesorMaySee),
      ),
      queue(
        'asesor-approval',
        'Aprobaciones en espera',
        itemsFor(session, records, 'approval', asesorMaySee),
      ),
      queue(
        'asesor-order',
        'Pedidos que necesitan al cliente',
        itemsFor(session, records, 'order-needs-customer', asesorMaySee),
      ),
    ],
    nextAction: { label: 'Ir a clientes', href: '/clientes' },
  };
}

function jefeHome(
  session: RoleSession,
  records: readonly QueueRecord[],
  payments: readonly PaymentExceptionRecord[],
): RoleHome | null {
  if (!hasTeamCommercialRead(session.grantedScopes)) return null;
  const queues = [
    queue('jefe-follow-up', 'Seguimientos del equipo', itemsFor(session, records, 'follow-up', jefeMaySee)),
    queue('jefe-quote', 'Cotizaciones del equipo', itemsFor(session, records, 'quote', jefeMaySee)),
    queue(
      'jefe-approval',
      'Aprobaciones que esperan al equipo',
      itemsFor(session, records, 'approval', jefeMaySee),
    ),
  ];
  if (mayAuthorizePaymentException(session.grantedScopes)) {
    queues.push(
      queue('jefe-exception', 'Excepciones de pago por autorizar', paymentItems(session, payments)),
    );
  }
  return {
    id: 'jefe',
    kicker: 'Jefe',
    title: 'Trabajo comercial del equipo',
    question: ATTENTION_QUESTION,
    description: 'Lectura comercial de las personas a su cargo. No administra personas ni el sistema.',
    queues,
    nextAction: { label: 'Ver cotizaciones', href: '/cotizaciones' },
  };
}

function gerenteQueues(
  session: RoleSession,
  exceptions: ReadonlyArray<{
    id: string;
    organizationId: string;
    exceptionId: NamedExceptionId;
    subject: string;
    href: string | null;
  }>,
  payments: readonly PaymentExceptionRecord[],
): RoleQueue[] {
  const labels = namedExceptionLabels();
  const queues = labels.map((label) =>
    queue(
      `gerente-${label.id}`,
      label.label,
      exceptions
        .filter(
          (row) =>
            row.exceptionId === label.id && sameTenant(session, row.organizationId),
        )
        .map((row) => queueItem({ id: row.id, subject: row.subject, href: row.href })),
    ),
  );
  if (mayAuthorizePaymentException(session.grantedScopes)) {
    queues.unshift(
      queue(
        'gerente-exception',
        'Excepciones de pago por autorizar',
        paymentItems(session, payments),
      ),
    );
  }
  return queues;
}

function gerenteHome(
  session: RoleSession,
  exceptions: Parameters<typeof gerenteQueues>[1],
  payments: readonly PaymentExceptionRecord[],
): RoleHome | null {
  if (!hasCompanyCommercialRead(session.grantedScopes)) return null;
  return {
    id: 'gerente',
    kicker: 'Gerencia',
    title: 'Excepciones de la empresa',
    question: ATTENTION_QUESTION,
    description:
      'Solo excepciones ya registradas de esta empresa. Sin controles de infraestructura.',
    queues: gerenteQueues(session, exceptions, payments),
    nextAction: null,
  };
}

function departmentHomes(grantedScopes: readonly string[]): RoleHome[] {
  return DEPARTMENT_LENSES.filter((lens) => departmentLensAllowed(grantedScopes, lens.scopes)).map(
    (lens) => ({
      id: lens.id,
      kicker: lens.kicker,
      title: lens.title,
      question: ATTENTION_QUESTION,
      description: lens.description,
      queues: [queue(lens.id, lens.kicker, [])],
      nextAction: { label: lens.action, href: mountedDeskHref(lens.href) ?? lens.href },
    }),
  );
}

export function systemControlsFor(grantedScopes: readonly string[]): SystemControls | null {
  if (!systemControlsAllowed(grantedScopes)) return null;
  return {
    id: 'system-controls',
    label: 'Controles del sistema',
    href: SYSTEM_CONTROLS_HREF,
    separateFromBusinessHome: true,
    includesIntegrationHealth: false,
  };
}

export function composeOperatingHomes(input: {
  session: RoleSession | null | undefined;
  records?: readonly QueueRecord[];
  exceptions?: Parameters<typeof gerenteQueues>[1];
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
  return /system\.admin|integration\.admin|integraci[oó]n|controles del sistema|\/administracion|\/sistema/i.test(
    text,
  );
}

export { NO_RECORD };
