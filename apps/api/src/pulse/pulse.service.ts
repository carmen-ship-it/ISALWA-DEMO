import { Injectable } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import type { PulseResponse } from '@isalwa/contracts';
import { DEMO_HEROES } from '@isalwa/contracts';

function formatBob(centavos: bigint | number): string {
  const n = typeof centavos === 'bigint' ? Number(centavos) : centavos;
  const whole = Math.trunc(n / 100);
  const frac = Math.abs(n % 100)
    .toString()
    .padStart(2, '0');
  return `Bs ${whole.toLocaleString('es-BO')},${frac}`;
}

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.management_command_center. Not a caller-supplied tenant. */
export const PULSE_READ_SCOPE = 'management.org.read';

export type TrustedPulseSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type PulseDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type PulseAggregates = {
  collectedCentavos: number;
  debtCentavos: number;
  visitsMonth: number;
  visitsDone: number;
  conversationsOpen: number;
  conversationsBreached: number;
  attentionCount: number;
};

export type PulseReadResult = PulseResponse & {
  code: PulseDenialCode | null;
  count: number;
  aggregates: PulseAggregates;
};

type PulseAccount = {
  id: string;
  organizationId: string;
  tradeName: string | null;
  legalName: string;
};

type PulseAttention = {
  id: string;
  organizationId: string;
  kind: string;
  score: number;
  accountId: string | null;
  account: PulseAccount | null;
};

export type PulseReadDb = {
  payment: {
    aggregate: (args: {
      _sum: { amountCentavos: true };
      where: { organizationId: string; paidAt: { gte: Date } };
    }) => Promise<{ _sum: { amountCentavos: bigint | null } }>;
  };
  invoice: {
    aggregate: (args: {
      _sum: { balanceCentavos: true };
      where: { organizationId: string; balanceCentavos: { gt: number } };
    }) => Promise<{ _sum: { balanceCentavos: bigint | null } }>;
  };
  visit: {
    count: (args: {
      where: { organizationId: string; plannedAt: { gte: Date }; status?: string };
    }) => Promise<number>;
  };
  conversation: {
    count: (args: {
      where: { organizationId: string; status?: string; slaStatus?: string };
    }) => Promise<number>;
  };
  attentionItem: {
    findMany: (args: {
      where: { organizationId: string; status: 'open' };
      orderBy: { score: 'desc' };
      take: number;
      include: { account: true };
    }) => Promise<PulseAttention[]>;
  };
  account: {
    findFirst: (args: {
      where: { organizationId: string; code: string };
    }) => Promise<PulseAccount | null>;
  };
};

const ZERO: PulseAggregates = {
  collectedCentavos: 0,
  debtCentavos: 0,
  visitsMonth: 0,
  visitsDone: 0,
  conversationsOpen: 0,
  conversationsBreached: 0,
  attentionCount: 0,
};

const ATTENTION_PAGE = 5;

function trustedOrganization(session: TrustedPulseSession | null | undefined): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function holdsPulseScope(session: TrustedPulseSession | null | undefined): boolean {
  return (session?.grantedScopes ?? []).some((scope) => scope.trim() === PULSE_READ_SCOPE);
}

function pulseDb(explicit: PulseReadDb | null | undefined): PulseReadDb | null {
  if (explicit !== undefined) return explicit;
  return getPrisma() as PulseReadDb | null;
}

function denied(code: PulseDenialCode): PulseReadResult {
  return {
    asOf: new Date().toISOString(),
    sentence: 'Sesión no disponible.',
    vitals: [],
    focus: [],
    code,
    count: 0,
    aggregates: { ...ZERO },
  };
}

@Injectable()
export class PulseService {
  async getPulse(
    session?: TrustedPulseSession | null,
    db?: PulseReadDb | null,
  ): Promise<PulseReadResult> {
    const organizationId = trustedOrganization(session);
    if (!organizationId) return denied('AUTH_REQUIRED');
    if (!holdsPulseScope(session)) return denied('ROLE_FORBIDDEN');
    const prisma = pulseDb(db);
    if (!prisma) {
      return {
        asOf: new Date().toISOString(),
        sentence: 'Base de datos no configurada.',
        vitals: [],
        focus: [],
        code: null,
        count: 0,
        aggregates: { ...ZERO },
      };
    }

    const asOf = new Date();
    const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));

    const [paidAgg, openDebt, visitsMonth, visitsDone, convOpen, convBreached, attention, donJulio] =
      await Promise.all([
        prisma.payment.aggregate({
          _sum: { amountCentavos: true },
          where: { organizationId, paidAt: { gte: monthStart } },
        }),
        prisma.invoice.aggregate({
          _sum: { balanceCentavos: true },
          where: { organizationId, balanceCentavos: { gt: 0 } },
        }),
        prisma.visit.count({ where: { organizationId, plannedAt: { gte: monthStart } } }),
        prisma.visit.count({
          where: { organizationId, plannedAt: { gte: monthStart }, status: 'completed' },
        }),
        prisma.conversation.count({ where: { organizationId, status: 'open' } }),
        prisma.conversation.count({ where: { organizationId, slaStatus: 'breached' } }),
        prisma.attentionItem.findMany({
          where: { organizationId, status: 'open' },
          orderBy: { score: 'desc' },
          take: ATTENTION_PAGE,
          include: { account: true },
        }),
        prisma.account.findFirst({ where: { organizationId, code: DEMO_HEROES.donJulio } }),
      ]);

    const scopedAttention = attention.filter(
      (item) =>
        item.organizationId === organizationId &&
        (!item.account || item.account.organizationId === organizationId),
    );
    const collected = paidAgg._sum.amountCentavos ?? 0n;
    const debt = openDebt._sum.balanceCentavos ?? 0n;
    const visitPct = visitsMonth === 0 ? 0 : Math.round((visitsDone / visitsMonth) * 100);
    const slaOk = convOpen === 0 ? 100 : Math.round(((convOpen - convBreached) / convOpen) * 100);

    const silent = scopedAttention.find((a) => a.kind === 'visit_gap');
    const debtItem = scopedAttention.find((a) => a.kind === 'collections');
    let sentence = 'Hoy el negocio está estable — con señales claras de seguimiento.';
    if (debtItem?.account) {
      sentence = `Hay presión de cobranza: ${debtItem.account.tradeName ?? debtItem.account.legalName} necesita atención.`;
    } else if (silent?.account) {
      sentence = `Cliente en silencio: ${silent.account.tradeName ?? silent.account.legalName} lleva demasiado sin visita.`;
    } else if (slaOk < 85) {
      sentence = 'WhatsApp está por debajo del SLA — Señal necesita foco.';
    }

    const focus = scopedAttention.map((a) => ({
      id: a.id,
      title: a.account?.tradeName ?? a.account?.legalName ?? a.kind,
      reason:
        a.kind === 'visit_gap'
          ? 'Sin visita reciente'
          : a.kind === 'collections'
            ? 'Cartera en riesgo'
            : a.kind,
      href: a.account && a.accountId ? `/personas/${a.accountId}` : '/radar',
      score: a.score,
    }));

    const hero = donJulio && donJulio.organizationId === organizationId ? donJulio : null;
    if (hero && !focus.some((f) => f.href.includes(hero.id))) {
      focus.unshift({
        id: `hero-${hero.id}`,
        title: hero.tradeName ?? hero.legalName,
        reason: 'Cliente A en silencio',
        href: `/personas/${hero.id}`,
        score: 95,
      });
    }

    const aggregates: PulseAggregates = {
      collectedCentavos: Number(collected),
      debtCentavos: Number(debt),
      visitsMonth,
      visitsDone,
      conversationsOpen: convOpen,
      conversationsBreached: convBreached,
      attentionCount: scopedAttention.length,
    };

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
      focus: focus.slice(0, 3),
      code: null,
      count: aggregates.attentionCount,
      aggregates,
    };
  }
}
