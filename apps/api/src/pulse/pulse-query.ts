/**
 * Company pulse aggregates. The tenant predicate is the session organization
 * already bound by authentication. A caller-supplied organizationId is not an
 * input and must not widen a sum, count, or hero lookup.
 *
 * Scope matches the existing management command center: management.org.read.
 * commercial.team.read is not a shortcut for company totals. people.admin is not this read.
 */

import { getPrisma } from '@isalwa/database';
import type { PulseResponse } from '@isalwa/contracts';
import { DEMO_HEROES } from '@isalwa/contracts';
import {
  holdsExactScope,
  trustedOrganizationId,
  type TenantDenialCode,
  type TrustedTenantSession,
} from '../auth/trusted-session';

export {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

export const PULSE_READ_SCOPE = 'management.org.read';
export const PULSE_ATTENTION_TAKE = 5;
export const PULSE_FOCUS_LIMIT = 3;

export type PulseDenialCode = TenantDenialCode;

export type PulseReadResult = PulseResponse & {
  code: PulseDenialCode | null;
};

type DatedWhere = {
  organizationId: string;
  paidAt: { gte: Date };
};

type BalanceWhere = {
  organizationId: string;
  balanceCentavos: { gt: 0 };
};

type VisitWhere = {
  organizationId: string;
  plannedAt: { gte: Date };
  status?: 'completed';
};

type ConversationWhere = {
  organizationId: string;
  status?: 'open';
  slaStatus?: 'breached';
};

export type PulseAttentionWhere = {
  organizationId: string;
  status: 'open';
};

export type PulseHeroWhere = {
  organizationId: string;
  code: string;
};

export type PulseAttentionRow = {
  id: string;
  organizationId: string;
  status: string;
  kind: string;
  score: number;
  accountId: string | null;
  account: {
    id: string;
    organizationId: string;
    tradeName: string | null;
    legalName: string;
  } | null;
};

export type PulseHeroAccount = {
  id: string;
  organizationId: string;
  code: string;
  tradeName: string | null;
  legalName: string;
};

export type PulseReadDb = {
  payment: {
    aggregate: (args: { where: DatedWhere; _sum: { amountCentavos: true } }) => Promise<{
      _sum: { amountCentavos: bigint | null };
    }>;
  };
  invoice: {
    aggregate: (args: { where: BalanceWhere; _sum: { balanceCentavos: true } }) => Promise<{
      _sum: { balanceCentavos: bigint | null };
    }>;
  };
  visit: {
    count: (args: { where: VisitWhere }) => Promise<number>;
  };
  conversation: {
    count: (args: { where: ConversationWhere }) => Promise<number>;
  };
  attentionItem: {
    findMany: (args: {
      where: PulseAttentionWhere;
      orderBy: { score: 'desc' };
      take: number;
      include: { account: true };
    }) => Promise<PulseAttentionRow[]>;
  };
  account: {
    findFirst: (args: { where: PulseHeroWhere }) => Promise<PulseHeroAccount | null>;
  };
};

export type AuthenticatedPulseRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  body?: { organizationId?: string };
  readDb?: PulseReadDb | null;
};

function formatBob(centavos: bigint | number): string {
  const n = typeof centavos === 'bigint' ? Number(centavos) : centavos;
  const whole = Math.trunc(n / 100);
  const frac = Math.abs(n % 100)
    .toString()
    .padStart(2, '0');
  return `Bs ${whole.toLocaleString('es-BO')},${frac}`;
}

function denied(code: PulseDenialCode): PulseReadResult {
  return {
    asOf: new Date().toISOString(),
    sentence: '',
    vitals: [],
    focus: [],
    code,
  };
}

function readDbOverride(req: AuthenticatedPulseRequest | undefined): PulseReadDb | null | undefined {
  if (!req || !Object.prototype.hasOwnProperty.call(req, 'readDb')) return undefined;
  return req.readDb ?? null;
}

export function canReadPulse(session: TrustedTenantSession | null): boolean {
  return session !== null && holdsExactScope(session.grantedScopes, PULSE_READ_SCOPE);
}

/**
 * Loads Prisma only after the session is allowed and no test override is present.
 * query.organizationId and body.organizationId are not read.
 */
export function resolvePulseDb(
  req: AuthenticatedPulseRequest | undefined,
  allowed: boolean,
  loadPrisma: () => PulseReadDb | null = () => (getPrisma() as PulseReadDb | null) ?? null,
): PulseReadDb | null {
  const override = readDbOverride(req);
  if (!allowed) return override ?? null;
  if (override !== undefined) return override;
  return loadPrisma();
}

export async function readPulse(input: {
  session: TrustedTenantSession | null | undefined;
  db: PulseReadDb | null;
  asOf?: Date;
}): Promise<PulseReadResult> {
  const organizationId = trustedOrganizationId(input.session);
  if (!organizationId || !input.session) return denied('AUTH_REQUIRED');
  if (!holdsExactScope(input.session.grantedScopes, PULSE_READ_SCOPE)) {
    return denied('ROLE_FORBIDDEN');
  }

  const asOf = input.asOf ?? new Date();
  if (!input.db) {
    return {
      asOf: asOf.toISOString(),
      sentence: 'Base de datos no configurada.',
      vitals: [],
      focus: [],
      code: null,
    };
  }

  const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  const db = input.db;

  const [paidAgg, openDebt, visitsMonth, visitsDone, convOpen, convBreached, attention] =
    await Promise.all([
      db.payment.aggregate({
        where: { organizationId, paidAt: { gte: monthStart } },
        _sum: { amountCentavos: true },
      }),
      db.invoice.aggregate({
        where: { organizationId, balanceCentavos: { gt: 0 } },
        _sum: { balanceCentavos: true },
      }),
      db.visit.count({ where: { organizationId, plannedAt: { gte: monthStart } } }),
      db.visit.count({
        where: { organizationId, plannedAt: { gte: monthStart }, status: 'completed' },
      }),
      db.conversation.count({ where: { organizationId, status: 'open' } }),
      db.conversation.count({ where: { organizationId, slaStatus: 'breached' } }),
      db.attentionItem.findMany({
        where: { organizationId, status: 'open' },
        orderBy: { score: 'desc' },
        take: PULSE_ATTENTION_TAKE,
        include: { account: true },
      }),
    ]);

  const collected = paidAgg._sum?.amountCentavos ?? 0n;
  const debt = openDebt._sum?.balanceCentavos ?? 0n;
  const visitPct = visitsMonth === 0 ? 0 : Math.round((visitsDone / visitsMonth) * 100);
  const slaOk = convOpen === 0 ? 100 : Math.round(((convOpen - convBreached) / convOpen) * 100);

  const silent = attention.find((item) => item.kind === 'visit_gap');
  const debtItem = attention.find((item) => item.kind === 'collections');
  let sentence = 'Hoy el negocio está estable — con señales claras de seguimiento.';
  if (debtItem?.account) {
    sentence = `Hay presión de cobranza: ${debtItem.account.tradeName ?? debtItem.account.legalName} necesita atención.`;
  } else if (silent?.account) {
    sentence = `Cliente en silencio: ${silent.account.tradeName ?? silent.account.legalName} lleva demasiado sin visita.`;
  } else if (slaOk < 85) {
    sentence = 'WhatsApp está por debajo del SLA — Señal necesita foco.';
  }

  const focus = attention.map((item) => ({
    id: item.id,
    title: item.account?.tradeName ?? item.account?.legalName ?? item.kind,
    reason:
      item.kind === 'visit_gap'
        ? 'Sin visita reciente'
        : item.kind === 'collections'
          ? 'Cartera en riesgo'
          : item.kind,
    href: item.accountId ? `/personas/${item.accountId}` : '/radar',
    score: item.score,
  }));

  const donJulio = await db.account.findFirst({
    where: { organizationId, code: DEMO_HEROES.donJulio },
  });
  if (donJulio && !focus.some((item) => item.href.includes(donJulio.id))) {
    focus.unshift({
      id: `hero-${donJulio.id}`,
      title: donJulio.tradeName ?? donJulio.legalName,
      reason: 'Cliente A en silencio',
      href: `/personas/${donJulio.id}`,
      score: 95,
    });
  }

  return {
    asOf: asOf.toISOString(),
    sentence,
    vitals: [
      {
        key: 'inflow',
        label: 'Dinero entrante',
        valueLabel: formatBob(collected),
        hint: 'Cobrado este mes',
        tone: 'success',
      },
      {
        key: 'risk',
        label: 'Dinero en riesgo',
        valueLabel: formatBob(debt),
        hint: 'Saldo abierto en facturas',
        tone: debt > 0n ? 'danger' : 'neutral',
      },
      {
        key: 'field',
        label: 'Motor comercial',
        valueLabel: `${visitPct}%`,
        hint: `${visitsDone}/${visitsMonth} visitas del mes`,
        tone: visitPct >= 70 ? 'success' : 'warning',
      },
      {
        key: 'signal',
        label: 'Respuesta',
        valueLabel: `${Math.max(slaOk, 0)}%`,
        hint: 'Conversaciones dentro de SLA',
        tone: slaOk >= 85 ? 'success' : 'warning',
      },
    ],
    focus: focus.slice(0, PULSE_FOCUS_LIMIT),
    code: null,
  };
}
