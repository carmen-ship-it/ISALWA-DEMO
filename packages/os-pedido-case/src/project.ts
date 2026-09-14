import { authorizePedidoRead, type PedidoTrustedContext } from './authorize';
import { asIso, readPedidoIdentity, statusDisplay, type PedidoIdentityStore } from './identity';
import {
  calendarDate,
  containsFakeZero,
  explicitSpecialOrder,
  productLinkedFact,
  type CoveringAdvisorFact,
  type DateFact,
  type InjectedSection,
  type PedidoSectionReaders,
  type ProductionFact,
  type SpecialOrderFact,
} from './readers';
import {
  PEDIDO_LABELS,
  availableSection,
  errorSection,
  noFactSection,
  unprovenSection,
  type PedidoSection,
} from './source';

export type PedidoSections = {
  customer: PedidoSection<{ partyId: string; displayName: string; label: 'Cliente' }>;
  order: PedidoSection<{
    orderId: string;
    orderNumber: string;
    currency: string;
    createdAt: string | null;
    cancelledAt: string | null;
    label: 'Pedido';
  }>;
  primaryOwner: PedidoSection<{
    memberId: string;
    label: 'Responsable principal';
    sharedOwnership: false;
  }>;
  coveringAdvisor: PedidoSection<CoveringAdvisorFact>;
  status: PedidoSection<{ status: string; label: 'Estado' }>;
  specialOrderClassification: PedidoSection<SpecialOrderFact>;
  customerCommittedDate: PedidoSection<DateFact>;
  productionInternalTargetDate: PedidoSection<DateFact>;
  production: PedidoSection<ProductionFact>;
  risk: PedidoSection<unknown>;
  customerInformed: PedidoSection<unknown>;
  purchasing: PedidoSection<unknown>;
  release: PedidoSection<unknown>;
  finishedGoods: PedidoSection<unknown>;
  allocation: PedidoSection<unknown>;
  remainingFulfillment: PedidoSection<unknown>;
  warehouseExit: PedidoSection<unknown>;
  delivery: PedidoSection<unknown>;
  nextAction: PedidoSection<unknown>;
  latestImportantChange: PedidoSection<unknown>;
  evidenceHistory: PedidoSection<unknown>;
};

export type PedidoOperatingCaseDeps = {
  identity?: PedidoIdentityStore;
  readers?: PedidoSectionReaders;
  /**
   * Explicit product links from a product source.
   * Never derived from the order id. Omitted means production is not queried.
   */
  productIds?: readonly string[];
};

export type PedidoOperatingCase =
  | {
      outcome: 'denied';
      reason: 'context_required' | 'role_forbidden';
      orderId: string;
      organizationId: null;
      sections: null;
      leaked: false;
    }
  | {
      outcome: 'missing';
      reason: 'not_in_tenant';
      orderId: string;
      organizationId: string;
      sections: null;
      leaked: false;
    }
  | {
      outcome: 'error';
      reason: string;
      orderId: string;
      organizationId: string;
      sections: null;
      leaked: false;
    }
  | {
      outcome: 'ready';
      orderId: string;
      organizationId: string;
      sections: PedidoSections;
      leaked: false;
      boundaries: {
        coveringIsSharedOwner: false;
        productionAttachedByOrderId: false;
        specialOrderUsesNumericThreshold: false;
        clientOrganizationIdUsed: false;
        parkedPageMerged: false;
      };
    };

const ERROR_COPY = 'No se pudo leer esta parte.';

function lookup(organizationId: string, orderId: string) {
  return { organizationId, orderId };
}

function adopt<T>(
  injected: InjectedSection<T> | null | undefined,
  noFactCopy: string,
): PedidoSection<T> {
  if (!injected) return unprovenSection();
  if (injected.state === 'UNPROVEN') return unprovenSection();
  if (injected.state === 'NO_FACT') {
    return noFactSection(injected.reason || 'no_fact', injected.displayCopy ?? noFactCopy);
  }
  if (injected.state === 'ERROR') {
    return errorSection(injected.reason || 'reader_failed', injected.displayCopy ?? ERROR_COPY);
  }
  return availableSection(injected.displayCopy ?? '', injected.fact);
}

async function readInjected<T>(
  reader: ((input: { organizationId: string; orderId: string }) => Promise<InjectedSection<T> | null>) | undefined,
  organizationId: string,
  orderId: string,
  noFactCopy: string,
): Promise<PedidoSection<T>> {
  if (!reader) return unprovenSection();
  try {
    return adopt(await reader(lookup(organizationId, orderId)), noFactCopy);
  } catch {
    return errorSection('reader_failed', ERROR_COPY);
  }
}

function dateSection(injected: PedidoSection<DateFact>, missingCopy: string): PedidoSection<DateFact> {
  if (injected.state !== 'AVAILABLE') return injected;
  const date = calendarDate(injected.fact);
  if (!date) return noFactSection('missing_date', injected.displayCopy || missingCopy);
  return availableSection(injected.displayCopy || date, { date });
}

function specialSection(injected: PedidoSection<SpecialOrderFact>): PedidoSection<SpecialOrderFact> {
  if (injected.state === 'NO_FACT') {
    return noFactSection(
      injected.reason,
      injected.displayCopy || 'Sin clasificación registrada',
    );
  }
  if (injected.state !== 'AVAILABLE') return injected;
  const explicit = explicitSpecialOrder(injected.fact);
  if (explicit === 'threshold') return errorSection('numeric_threshold_refused', ERROR_COPY);
  if (!explicit) return noFactSection('classification_not_explicit', 'Sin clasificación registrada');
  const label = explicit.classification === 'special' ? 'Pedido especial' : 'Pedido normal';
  const planning = explicit.requiresProductionPlanning
    ? ' Requiere planificación de producción.'
    : '';
  return availableSection(injected.displayCopy || `${label}.${planning}`.trim(), explicit);
}

function quantitySection<T>(injected: PedidoSection<T>, noFactCopy: string): PedidoSection<T> {
  if (injected.state !== 'AVAILABLE') return injected;
  if (containsFakeZero(injected.fact)) {
    return noFactSection('zero_is_not_a_recorded_balance', noFactCopy);
  }
  if (falseAbsence(injected.fact)) {
    return noFactSection('missing_recorded_notice', noFactCopy);
  }
  return injected;
}

function falseAbsence(fact: unknown): boolean {
  if (!fact || typeof fact !== 'object') return false;
  const record = fact as Record<string, unknown>;
  return record.informed === false || record.recorded === false || record.notified === false;
}

async function coveringSection(
  readers: PedidoSectionReaders | undefined,
  organizationId: string,
  orderId: string,
  customerPartyId: string,
  primaryOwnerMemberId: string,
): Promise<PedidoSection<CoveringAdvisorFact>> {
  const reader = readers?.coveringAdvisor;
  if (!reader) {
    return noFactSection(
      'no_stored_covering_actor',
      'Sin cobertura registrada. No es un segundo responsable.',
    );
  }
  try {
    const injected = await reader({
      organizationId,
      orderId,
      customerPartyId,
      primaryOwnerMemberId,
    });
    if (!injected) {
      return noFactSection(
        'no_stored_covering_actor',
        'Sin cobertura registrada. No es un segundo responsable.',
      );
    }
    if (injected.state === 'UNPROVEN') return unprovenSection();
    if (injected.state === 'ERROR') {
      return errorSection(injected.reason || 'reader_failed', injected.displayCopy ?? ERROR_COPY);
    }
    if (injected.state === 'NO_FACT') {
      return noFactSection(
        injected.reason || 'no_stored_covering_actor',
        injected.displayCopy ?? 'Sin cobertura registrada. No es un segundo responsable.',
      );
    }
    const actor = injected.fact.actingAdvisorMemberId?.trim() ?? '';
    if (!actor || actor === primaryOwnerMemberId) {
      return noFactSection(
        'no_stored_covering_actor',
        'Sin cobertura registrada. No es un segundo responsable.',
      );
    }
    const fact: CoveringAdvisorFact = {
      actingAdvisorMemberId: actor,
      actingAdvisorLabel: injected.fact.actingAdvisorLabel ?? null,
      sharedOwnership: false,
      note: 'Cubre. No es responsable principal.',
    };
    return availableSection(injected.displayCopy || fact.note, fact);
  } catch {
    return errorSection('reader_failed', ERROR_COPY);
  }
}

async function productionSection(
  readers: PedidoSectionReaders | undefined,
  organizationId: string,
  productIds: readonly string[] | undefined,
): Promise<PedidoSection<ProductionFact>> {
  const reader = readers?.production;
  const links = (productIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0);
  if (!reader || links.length === 0) return unprovenSection();
  try {
    const injected = await reader({ organizationId, productIds: links });
    if (!injected || injected.state === 'UNPROVEN') return unprovenSection();
    if (injected.state === 'NO_FACT') {
      return noFactSection(
        injected.reason || 'no_product_linked_production',
        injected.displayCopy ?? 'Sin producción ligada a un producto.',
      );
    }
    if (injected.state === 'ERROR') {
      return errorSection(injected.reason || 'reader_failed', injected.displayCopy ?? ERROR_COPY);
    }
    const linked = productLinkedFact(injected.fact);
    if (!linked || !links.includes(linked.productId)) return unprovenSection();
    return availableSection(
      injected.displayCopy || 'La producción no es hija de este pedido.',
      linked,
    );
  } catch {
    return errorSection('reader_failed', ERROR_COPY);
  }
}

function identitySections(
  identity: Awaited<ReturnType<typeof readPedidoIdentity>>,
): Pick<PedidoSections, 'customer' | 'order' | 'primaryOwner' | 'status'> | null {
  if (!identity) return null;
  const { order, party } = identity;
  const customerName = party?.displayName?.trim() ?? '';
  const customer: PedidoSection<{ partyId: string; displayName: string; label: 'Cliente' }> =
    customerName
      ? availableSection(customerName, {
          partyId: party!.id,
          displayName: customerName,
          label: 'Cliente',
        })
      : noFactSection('customer_not_in_tenant', 'Sin cliente registrado en esta empresa.');

  const createdAt = asIso(order.createdAt);
  const orderFact = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    currency: order.currency,
    createdAt,
    cancelledAt: asIso(order.cancelledAt),
    label: 'Pedido' as const,
  };

  return {
    customer,
    order: availableSection(order.orderNumber, orderFact),
    primaryOwner: availableSection('Responsable principal', {
      memberId: order.ownerMemberId,
      label: 'Responsable principal' as const,
      sharedOwnership: false as const,
    }),
    status: availableSection(statusDisplay(order.status), {
      status: order.status,
      label: 'Estado' as const,
    }),
  };
}

/**
 * Composed Pedido operating case.
 * Tenant comes only from trustedContext.organizationId.
 * Uninjected date, ops, and fulfillment readers stay UNPROVEN.
 * Production is not attached by order id.
 */
export async function getPedidoOperatingCase(
  orderId: string,
  trustedContext: PedidoTrustedContext,
  deps: PedidoOperatingCaseDeps = {},
): Promise<PedidoOperatingCase> {
  const requestedId = orderId?.trim() ?? '';
  const access = authorizePedidoRead(trustedContext);
  if (!access.ok) {
    return {
      outcome: 'denied',
      reason: access.reason,
      orderId: requestedId,
      organizationId: null,
      sections: null,
      leaked: false,
    };
  }
  if (!requestedId) {
    return {
      outcome: 'missing',
      reason: 'not_in_tenant',
      orderId: '',
      organizationId: access.organizationId,
      sections: null,
      leaked: false,
    };
  }
  if (!deps.identity) {
    return {
      outcome: 'error',
      reason: 'identity_reader_required',
      orderId: requestedId,
      organizationId: access.organizationId,
      sections: null,
      leaked: false,
    };
  }

  let identity: Awaited<ReturnType<typeof readPedidoIdentity>>;
  try {
    identity = await readPedidoIdentity(deps.identity, access.organizationId, requestedId);
  } catch {
    return {
      outcome: 'error',
      reason: 'identity_read_failed',
      orderId: requestedId,
      organizationId: access.organizationId,
      sections: null,
      leaked: false,
    };
  }
  if (!identity) {
    return {
      outcome: 'missing',
      reason: 'not_in_tenant',
      orderId: requestedId,
      organizationId: access.organizationId,
      sections: null,
      leaked: false,
    };
  }

  const organizationId = access.organizationId;
  const readers = deps.readers;
  const core = identitySections(identity);
  if (!core) {
    return {
      outcome: 'missing',
      reason: 'not_in_tenant',
      orderId: requestedId,
      organizationId,
      sections: null,
      leaked: false,
    };
  }

  const [
    coveringAdvisor,
    specialOrderClassification,
    customerCommittedDate,
    productionInternalTargetDate,
    production,
    risk,
    customerInformed,
    purchasing,
    release,
    finishedGoods,
    allocation,
    remainingFulfillment,
    warehouseExit,
    delivery,
    nextAction,
    latestImportantChange,
    evidenceHistory,
  ] = await Promise.all([
    coveringSection(
      readers,
      organizationId,
      requestedId,
      identity.order.partyId,
      identity.order.ownerMemberId,
    ),
    readInjected(
      readers?.specialOrderClassification,
      organizationId,
      requestedId,
      'Sin clasificación registrada',
    ).then(specialSection),
    readInjected(
      readers?.customerCommittedDate,
      organizationId,
      requestedId,
      'Sin fecha con el cliente',
    ).then((section) => dateSection(section, 'Sin fecha con el cliente')),
    readInjected(
      readers?.productionInternalTargetDate,
      organizationId,
      requestedId,
      'Sin fecha interna de producción',
    ).then((section) => dateSection(section, 'Sin fecha interna de producción')),
    productionSection(readers, organizationId, deps.productIds),
    readInjected(readers?.risk, organizationId, requestedId, PEDIDO_LABELS.risk),
    readInjected(
      readers?.customerInformed,
      organizationId,
      requestedId,
      'Sin aviso registrado',
    ).then((section) => quantitySection(section, 'Sin aviso registrado')),
    readInjected(readers?.purchasing, organizationId, requestedId, PEDIDO_LABELS.purchasing).then(
      (section) => quantitySection(section, PEDIDO_LABELS.purchasing),
    ),
    readInjected(readers?.release, organizationId, requestedId, PEDIDO_LABELS.release),
    readInjected(
      readers?.finishedGoods,
      organizationId,
      requestedId,
      PEDIDO_LABELS.finishedGoods,
    ).then((section) => quantitySection(section, PEDIDO_LABELS.finishedGoods)),
    readInjected(readers?.allocation, organizationId, requestedId, 'No hay registro de asignación.').then(
      (section) => quantitySection(section, 'No hay registro de asignación.'),
    ),
    readInjected(
      readers?.remainingFulfillment,
      organizationId,
      requestedId,
      PEDIDO_LABELS.remainingFulfillment,
    ).then((section) => quantitySection(section, PEDIDO_LABELS.remainingFulfillment)),
    readInjected(readers?.warehouseExit, organizationId, requestedId, PEDIDO_LABELS.warehouseExit),
    readInjected(readers?.delivery, organizationId, requestedId, PEDIDO_LABELS.delivery).then(
      (section) => quantitySection(section, PEDIDO_LABELS.delivery),
    ),
    readInjected(readers?.nextAction, organizationId, requestedId, PEDIDO_LABELS.nextAction),
    readInjected(
      readers?.latestImportantChange,
      organizationId,
      requestedId,
      PEDIDO_LABELS.latestImportantChange,
    ),
    readInjected(readers?.evidenceHistory, organizationId, requestedId, PEDIDO_LABELS.evidenceHistory),
  ]);

  return {
    outcome: 'ready',
    orderId: identity.order.id,
    organizationId,
    leaked: false,
    boundaries: {
      coveringIsSharedOwner: false,
      productionAttachedByOrderId: false,
      specialOrderUsesNumericThreshold: false,
      clientOrganizationIdUsed: false,
      parkedPageMerged: false,
    },
    sections: {
      customer: core.customer,
      order: core.order,
      primaryOwner: core.primaryOwner,
      coveringAdvisor,
      status: core.status,
      specialOrderClassification,
      customerCommittedDate,
      productionInternalTargetDate,
      production,
      risk,
      customerInformed,
      purchasing,
      release,
      finishedGoods,
      allocation,
      remainingFulfillment,
      warehouseExit,
      delivery,
      nextAction,
      latestImportantChange,
      evidenceHistory,
    },
  };
}
