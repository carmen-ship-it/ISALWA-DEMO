import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';
import { formatCentavos } from '@/lib/commercial/money';
import { elapsedAge } from '@/lib/time/elapsed';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

type ExecutiveLensProps = {
  opportunities: OpportunitySummaryReadModel[];
  quotes: QuoteSummaryReadModel[];
  /** Null when this session has no loaded order page. Never treated as a company total. */
  orders: OrderSummaryReadModel[] | null;
  opportunitiesPartial: boolean;
  quotesPartial: boolean;
  /** Loaded order page is a slice. Order amounts are never a company total. */
  ordersPartial: boolean;
};

type MoneyTotal = { currency: string; centavos: string };

export function ExecutiveLens({
  opportunities,
  quotes,
  orders,
  opportunitiesPartial,
  quotesPartial,
  ordersPartial,
}: ExecutiveLensProps) {
  const active = visibleOpportunities(opportunities);
  const quoted = quotedRecords(quotes);
  const openOrders = orders ? visibleOrders(orders) : null;
  const quotedTotals = sumByCurrency(quoted);
  const orderTotals = openOrders ? sumByCurrency(openOrders) : null;
  const showOrderAmount = Boolean(orderTotals && orderTotals.length > 0);
  const caveat = opportunitiesPartial || quotesPartial || ordersPartial || showOrderAmount;

  return (
    <section aria-label="Lectura ejecutiva" className="min-w-0 border-t border-[var(--isalwa-mist)] pt-8">
      <p className="isalwa-kicker">Empresa</p>
      <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
        Lectura comercial
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Solo lectura de registros comerciales ya cargados. No es un tablero aparte.
      </p>
      <ExceptionList quotes={quoted} quotesPartial={quotesPartial} />
      <dl className="mt-5 divide-y divide-[var(--isalwa-mist)] border-y border-[var(--isalwa-mist)]">
        <LensRow
          label="Oportunidades activas"
          value={opportunityFigure(active.length, opportunitiesPartial)}
        />
        <LensRow label="Valor cotizado" value={moneyFigure(quotedTotals, quotedEmpty(quotesPartial))} />
        <LensRow
          label="Valor de pedidos"
          value={
            showOrderAmount
              ? moneyFigure(orderTotals, '')
              : 'No hay un total de pedidos de la empresa en esta lectura.'
          }
        />
      </dl>
      {caveat ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Estas cifras son los registros visibles en esta lectura. No son el total de la empresa.
        </p>
      ) : null}
    </section>
  );
}

function ExceptionList({
  quotes,
  quotesPartial,
}: {
  quotes: QuoteSummaryReadModel[];
  quotesPartial: boolean;
}) {
  const submitted = quotes.filter((item) => item.status === 'submitted' && item.submittedAt);
  const oldest = submitted
    .map((item) => item.submittedAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const age = oldest ? elapsedAge(oldest) : null;
  if (submitted.length === 0 && !quotesPartial) return null;

  return (
    <div className="mt-5 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-info)_8%,white)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">Necesita atención</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {submitted.length > 0
          ? `${submitted.length} cotización${submitted.length === 1 ? '' : 'es'} enviada${submitted.length === 1 ? '' : 's'}${age ? `. La más antigua, ${age.phrase}` : ''}. No es un plazo incumplido.`
          : 'Hay más cotizaciones de las que esta lectura muestra.'}
      </p>
    </div>
  );
}

function LensRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:items-baseline sm:gap-4">
      <dt className="text-sm font-medium text-[var(--isalwa-kiln)]">{label}</dt>
      <dd className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{value}</dd>
    </div>
  );
}

function opportunityFigure(count: number, visibleOnly: boolean): string {
  if (visibleOnly && count === 0) return 'Hay más registros de los que esta lectura muestra.';
  if (visibleOnly) return `${count} visibles`;
  return String(count);
}

function quotedEmpty(visibleOnly: boolean): string {
  if (visibleOnly) return 'Hay más cotizaciones de las que esta lectura muestra.';
  return 'Sin cotizaciones enviadas visibles.';
}

function moneyFigure(totals: MoneyTotal[] | null, empty: string): string {
  if (!totals || totals.length === 0) return empty;
  return totals.map((total) => formatCentavos(total.centavos, total.currency)).join(' · ');
}

function visibleOpportunities(items: OpportunitySummaryReadModel[]): OpportunitySummaryReadModel[] {
  return items.filter((item) => item.status === 'open' && !isEngineeringFixtureCopy(item.title));
}

function quotedRecords(items: QuoteSummaryReadModel[]): QuoteSummaryReadModel[] {
  return items.filter((item) => {
    if (item.status !== 'submitted' && item.status !== 'accepted') return false;
    if (item.cancelledAt) return false;
    if (isEngineeringFixtureCopy(item.quoteNumber) || isEngineeringFixtureCopy(item.notes)) return false;
    return true;
  });
}

function visibleOrders(items: OrderSummaryReadModel[]): OrderSummaryReadModel[] {
  return items.filter(
    (item) =>
      item.status === 'open' &&
      !item.cancelledAt &&
      !isEngineeringFixtureCopy(item.orderNumber),
  );
}

function sumByCurrency(
  items: Array<{ currency: string; totalCentavos: string }>,
): MoneyTotal[] {
  const totals = new Map<string, bigint>();
  for (const item of items) {
    if (!/^-?\d+$/.test(item.totalCentavos)) continue;
    const currency = item.currency.trim() || 'BOB';
    totals.set(currency, (totals.get(currency) ?? BigInt(0)) + BigInt(item.totalCentavos));
  }
  return [...totals.entries()].map(([currency, value]) => ({
    currency,
    centavos: value.toString(),
  }));
}
