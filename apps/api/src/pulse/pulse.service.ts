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

@Injectable()
export class PulseService {
  async getPulse(): Promise<PulseResponse> {
    const prisma = getPrisma();
    if (!prisma) {
      return {
        asOf: new Date().toISOString(),
        sentence: 'Base de datos no configurada.',
        vitals: [],
        focus: [],
      };
    }

    const asOf = new Date();
    const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));

    const [paidAgg, openDebt, visitsMonth, visitsDone, convOpen, convBreached, attention] =
      await Promise.all([
        prisma.payment.aggregate({
          _sum: { amountCentavos: true },
          where: { paidAt: { gte: monthStart } },
        }),
        prisma.invoice.aggregate({
          _sum: { balanceCentavos: true },
          where: { balanceCentavos: { gt: 0 } },
        }),
        prisma.visit.count({ where: { plannedAt: { gte: monthStart } } }),
        prisma.visit.count({
          where: { plannedAt: { gte: monthStart }, status: 'completed' },
        }),
        prisma.conversation.count({ where: { status: 'open' } }),
        prisma.conversation.count({ where: { slaStatus: 'breached' } }),
        prisma.attentionItem.findMany({
          where: { status: 'open' },
          orderBy: { score: 'desc' },
          take: 5,
          include: { account: true },
        }),
      ]);

    const collected = paidAgg._sum.amountCentavos ?? 0n;
    const debt = openDebt._sum.balanceCentavos ?? 0n;
    const visitPct = visitsMonth === 0 ? 0 : Math.round((visitsDone / visitsMonth) * 100);
    const slaOk = convOpen === 0 ? 100 : Math.round(((convOpen - convBreached) / convOpen) * 100);

    const silent = attention.find((a) => a.kind === 'visit_gap');
    const debtItem = attention.find((a) => a.kind === 'collections');
    let sentence = 'Hoy el negocio está estable — con señales claras de seguimiento.';
    if (debtItem?.account) {
      sentence = `Hay presión de cobranza: ${debtItem.account.tradeName ?? debtItem.account.legalName} necesita atención.`;
    } else if (silent?.account) {
      sentence = `Cliente en silencio: ${silent.account.tradeName ?? silent.account.legalName} lleva demasiado sin visita.`;
    } else if (slaOk < 85) {
      sentence = 'WhatsApp está por debajo del SLA — Señal necesita foco.';
    }

    const focus = attention.map((a) => ({
      id: a.id,
      title: a.account?.tradeName ?? a.account?.legalName ?? a.kind,
      reason:
        a.kind === 'visit_gap'
          ? 'Sin visita reciente'
          : a.kind === 'collections'
            ? 'Cartera en riesgo'
            : a.kind,
      href: a.accountId ? `/personas/${a.accountId}` : '/radar',
      score: a.score,
    }));

    // Ensure demo heroes appear in focus if present
    const donJulio = await prisma.account.findFirst({ where: { code: DEMO_HEROES.donJulio } });
    if (donJulio && !focus.some((f) => f.href.includes(donJulio.id))) {
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
      focus: focus.slice(0, 3),
    };
  }
}
