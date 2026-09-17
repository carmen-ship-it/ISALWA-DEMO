/**
 * Cliente360 finance summary.
 * Shows order totals aggregated. Does NOT claim payment, ledger, or accounts receivable.
 * No invented KPIs. Only shows what exists in orders.
 */

import type { OsApiClient } from '@/lib/api/os-api-client';
import { formatCentavos } from '@/lib/commercial/money';

export type ClienteFinanceSummary = {
  /** Total from open orders (not cancelled) */
  openOrdersTotalCentavos: bigint;
  openOrdersCount: number;
  currency: string;
};

export type FinanceSummaryOutcome =
  | { status: 'ok'; summary: ClienteFinanceSummary }
  | { status: 'unavailable'; message: string }
  | { status: 'forbidden'; message: string };

export type LoadClienteFinanceOptions = {
  commercialQuery?: Record<string, string>;
  /** Ops View As: hide commercial finance aggregate (negotiation totals). */
  suppressNegotiation?: boolean;
};

/**
 * Load finance summary for a party.
 * Only aggregates order totals. Does not claim payment status.
 */
export async function loadClienteFinanceSummary(
  client: OsApiClient,
  partyId: string,
  options: LoadClienteFinanceOptions = {},
): Promise<FinanceSummaryOutcome> {
  if (options.suppressNegotiation) {
    return {
      status: 'ok',
      summary: {
        openOrdersTotalCentavos: BigInt(0),
        openOrdersCount: 0,
        currency: 'BOB',
      },
    };
  }
  const commercialQuery = options.commercialQuery ?? {};
  try {
    let orders;
    try {
      orders = await client.listOrders({
        partyId,
        limit: 100,
        visibility: 'org',
        ...commercialQuery,
      });
    } catch {
      orders = await client.listOrders({ partyId, limit: 100, ...commercialQuery });
    }
    const openOrders = orders.items.filter((order) => order.status === 'open');

    let totalCentavos = BigInt(0);
    let currency = 'BOB';

    for (const order of openOrders) {
      try {
        const centavos = BigInt(order.totalCentavos);
        totalCentavos += centavos;
        currency = order.currency;
      } catch {
        // Skip invalid amounts
      }
    }

    return {
      status: 'ok',
      summary: {
        openOrdersTotalCentavos: totalCentavos,
        openOrdersCount: openOrders.length,
        currency,
      },
    };
  } catch {
    return { status: 'unavailable', message: 'No se pudo cargar el resumen financiero.' };
  }
}

export function formatFinanceSummary(summary: ClienteFinanceSummary): string {
  return formatCentavos(summary.openOrdersTotalCentavos.toString(), summary.currency);
}

export const FINANZAS_COPY = {
  title: 'Finanzas',
  subtitle: 'Resumen de pedidos',
  openOrders: 'Pedidos abiertos',
  openOrdersTotal: 'Total en pedidos abiertos',
  noData: 'Sin datos',
  noOrders: 'Sin pedidos abiertos',
  noOrdersHint: 'Cuando existan pedidos abiertos, su total aparecerá aquí.',
  unavailable: 'No se pudo cargar el resumen financiero.',
  forbidden: 'No tiene permiso para ver información financiera de este cliente.',
  disclaimer:
    'Este es un resumen de pedidos. No representa cobranza, facturación ni contabilidad oficial.',
  noPaymentClaim:
    'ISALWA no reclama pago. Un pedido abierto no significa cobranza pendiente ni deuda.',
} as const;
