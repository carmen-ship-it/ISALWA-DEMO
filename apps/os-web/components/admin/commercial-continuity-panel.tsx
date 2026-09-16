import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';
import { ReassignOpportunitiesPanel } from '@/components/admin/reassign-opportunities-panel';
import { orderHref, quoteHref } from '@/lib/commercial/navigation';
import { partyHref } from '@/lib/party/navigation';
import type { TerminationImpactResponse } from '@/lib/workforce/types';

type CommercialContinuityPanelProps = {
  fromMemberId: string;
  fromMemberName: string;
  opportunities: readonly OpportunitySummaryReadModel[];
  blockingQuotes: readonly QuoteSummaryReadModel[];
  openOrders: readonly OrderSummaryReadModel[];
  terminationImpact: TerminationImpactResponse | null;
};

function commercialAccountLinks(impact: TerminationImpactResponse | null): Array<{
  commercialAccountId: string;
  partyId: string;
}> {
  if (!impact) return [];
  const category = impact.categories.find((c) => c.key === 'commercial_accounts');
  if (!category) return [];
  return category.items
    .map((item) => {
      const match = /^Cuenta (.+)$/.exec(item.summary.trim());
      const partyId = match?.[1]?.trim();
      if (!partyId) return null;
      return { commercialAccountId: item.id, partyId };
    })
    .filter((row): row is { commercialAccountId: string; partyId: string } => row != null);
}

export function CommercialContinuityPanel({
  fromMemberId,
  fromMemberName,
  opportunities,
  blockingQuotes,
  openOrders,
  terminationImpact,
}: CommercialContinuityPanelProps) {
  const accounts = commercialAccountLinks(terminationImpact);
  const hasAnything =
    opportunities.length > 0 ||
    accounts.length > 0 ||
    blockingQuotes.length > 0 ||
    openOrders.length > 0;

  return (
    <PageSection card className="p-8" id="continuidad-comercial">
      <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Continuidad comercial</h2>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        Responsabilidades comerciales a nombre de {fromMemberName}. Reasigne lo que tenga camino
        gobernado antes de finalizar el acceso.
      </p>

      {!hasAnything ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
          No hay cuentas, oportunidades, cotizaciones ni pedidos activos detectados para esta persona.
        </p>
      ) : null}

      <ReassignOpportunitiesPanel
        fromMemberId={fromMemberId}
        fromMemberName={fromMemberName}
        items={opportunities}
      />

      {accounts.length > 0 ? (
        <div className="mt-8 border-t border-[var(--isalwa-mist)] pt-6">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">Cuentas comerciales</p>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Cambie el responsable desde la ficha del cliente cuando su permiso lo permita.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--isalwa-slate)]">
            {accounts.map((row) => (
              <li key={row.commercialAccountId}>
                <Link href={partyHref(row.partyId)} className="text-[var(--isalwa-glaze)] hover:underline">
                  Ver cliente
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {blockingQuotes.length > 0 ? (
        <div className="mt-8 border-t border-[var(--isalwa-mist)] pt-6">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">Cotizaciones activas</p>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Aún no hay reasignación de cotizaciones en administración. Cancele o reasigne por los
            caminos disponibles cuando existan.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {blockingQuotes.slice(0, 8).map((quote) => (
              <li key={quote.quoteId}>
                <Link
                  href={quoteHref(quote.partyId, quote.quoteId)}
                  className="text-[var(--isalwa-glaze)] hover:underline"
                >
                  {quote.quoteNumber}
                </Link>
                <span className="ml-2 text-[var(--isalwa-slate)]">{quote.status}</span>
              </li>
            ))}
            {blockingQuotes.length > 8 ? (
              <li className="text-[var(--isalwa-slate)]">…y {blockingQuotes.length - 8} más</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {openOrders.length > 0 ? (
        <div className="mt-8 border-t border-[var(--isalwa-mist)] pt-6">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">Pedidos abiertos</p>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Aún no hay reasignación de pedidos en administración. Cancele o gestione el pedido en su
            ficha.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {openOrders.slice(0, 8).map((order) => (
              <li key={order.orderId}>
                <Link
                  href={orderHref(order.partyId, order.orderId)}
                  className="text-[var(--isalwa-glaze)] hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </li>
            ))}
            {openOrders.length > 8 ? (
              <li className="text-[var(--isalwa-slate)]">…y {openOrders.length - 8} más</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </PageSection>
  );
}
