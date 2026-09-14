/**
 * Tenant-scoped identity for this SHA.
 * OsOrder, OsParty, and OsCommercialAccount only.
 * Covering advisor is not a column on those models.
 * Production is not queried here, by order id or otherwise.
 */

export type PedidoOrderRow = {
  id: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  ownerMemberId: string;
  orderNumber: string;
  status: string;
  currency: string;
  createdAt: Date | string;
  cancelledAt: Date | string | null;
};

export type PedidoPartyRow = {
  id: string;
  organizationId: string;
  displayName: string;
  status: string;
};

export type PedidoAccountRow = {
  id: string;
  organizationId: string;
  partyId: string;
  ownerMemberId: string | null;
  status: string;
};

export type PedidoIdentityStore = {
  findOrderInOrg(organizationId: string, orderId: string): Promise<PedidoOrderRow | null>;
  findPartyInOrg(organizationId: string, partyId: string): Promise<PedidoPartyRow | null>;
  findCommercialAccountInOrg(
    organizationId: string,
    partyId: string,
    commercialAccountId: string | null,
  ): Promise<PedidoAccountRow | null>;
};

export type PedidoIdentity = {
  order: PedidoOrderRow;
  party: PedidoPartyRow | null;
  account: PedidoAccountRow | null;
};

export async function readPedidoIdentity(
  store: PedidoIdentityStore,
  organizationId: string,
  orderId: string,
): Promise<PedidoIdentity | null> {
  const order = await store.findOrderInOrg(organizationId, orderId);
  if (!order) return null;
  if (order.organizationId !== organizationId || order.id !== orderId) return null;

  const party = await store.findPartyInOrg(organizationId, order.partyId);
  const sameParty =
    party && party.organizationId === organizationId && party.id === order.partyId ? party : null;

  const account = await store.findCommercialAccountInOrg(
    organizationId,
    order.partyId,
    order.commercialAccountId,
  );
  const sameAccount =
    account &&
    account.organizationId === organizationId &&
    account.partyId === order.partyId &&
    (order.commercialAccountId == null || account.id === order.commercialAccountId)
      ? account
      : null;

  return { order, party: sameParty, account: sameAccount };
}

type OrderDelegate = {
  findFirst(args: {
    where: { id: string; organizationId: string };
    select: {
      id: true;
      organizationId: true;
      partyId: true;
      commercialAccountId: true;
      ownerMemberId: true;
      orderNumber: true;
      status: true;
      currency: true;
      createdAt: true;
      cancelledAt: true;
    };
  }): Promise<PedidoOrderRow | null>;
};

type PartyDelegate = {
  findFirst(args: {
    where: { id: string; organizationId: string };
    select: { id: true; organizationId: true; displayName: true; status: true };
  }): Promise<PedidoPartyRow | null>;
};

type AccountDelegate = {
  findFirst(args: {
    where: { organizationId: string; partyId?: string; id?: string };
    select: { id: true; organizationId: true; partyId: true; ownerMemberId: true; status: true };
  }): Promise<PedidoAccountRow | null>;
};

/** Structural Prisma client. Does not import a generated client or a production model. */
export type PedidoPrismaLike = {
  osOrder: OrderDelegate;
  osParty: PartyDelegate;
  osCommercialAccount: AccountDelegate;
};

/**
 * Reads OsOrder, OsParty, and OsCommercialAccount with organizationId from the caller.
 * Foreign id is a miss. There is no production delegate on this client.
 */
export function createPrismaPedidoIdentityStore(db: PedidoPrismaLike): PedidoIdentityStore {
  return {
    async findOrderInOrg(organizationId, orderId) {
      return db.osOrder.findFirst({
        where: { id: orderId, organizationId },
        select: {
          id: true,
          organizationId: true,
          partyId: true,
          commercialAccountId: true,
          ownerMemberId: true,
          orderNumber: true,
          status: true,
          currency: true,
          createdAt: true,
          cancelledAt: true,
        },
      });
    },
    async findPartyInOrg(organizationId, partyId) {
      return db.osParty.findFirst({
        where: { id: partyId, organizationId },
        select: { id: true, organizationId: true, displayName: true, status: true },
      });
    },
    async findCommercialAccountInOrg(organizationId, partyId, commercialAccountId) {
      return db.osCommercialAccount.findFirst({
        where: commercialAccountId
          ? { id: commercialAccountId, organizationId, partyId }
          : { organizationId, partyId },
        select: {
          id: true,
          organizationId: true,
          partyId: true,
          ownerMemberId: true,
          status: true,
        },
      });
    },
  };
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  cancelled: 'Cancelado',
};

export function statusDisplay(status: string): string {
  const stored = status.trim();
  return STATUS_LABELS[stored] ?? stored;
}

export function asIso(value: Date | string | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
