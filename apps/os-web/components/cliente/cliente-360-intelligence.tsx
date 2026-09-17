import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import type { Cliente360Intelligence } from '@/lib/cliente/client-intelligence';

type Cliente360IntelligenceProps = {
  facts: Cliente360Intelligence;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="isalwa-section-label">{label}</dt>
      <dd className="mt-2 text-[var(--isalwa-kiln)]">{value}</dd>
    </div>
  );
}

function formatCount(value: number | null): string {
  if (value === null) return '—';
  return String(value);
}

export function Cliente360Intelligence({ facts }: Cliente360IntelligenceProps) {
  return (
    <section aria-label={CLIENTE360_UX_COPY.intelligenceTitle} className="space-y-4">
      <p className="isalwa-section-label">{CLIENTE360_UX_COPY.intelligenceTitle}</p>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label={CLIENTE360_UX_COPY.openOpportunities} value={formatCount(facts.openOpportunities)} />
        <Metric label={CLIENTE360_UX_COPY.quotes} value={formatCount(facts.quotes)} />
        <Metric label={CLIENTE360_UX_COPY.orders} value={formatCount(facts.openOrders)} />
        {facts.deliveryNotes !== null && facts.deliveryNotes > 0 ? (
          <Metric label={CLIENTE360_UX_COPY.ordersDelivered} value={String(facts.deliveryNotes)} />
        ) : null}
        {facts.ordersFromQuotes !== null && facts.ordersFromQuotes > 0 ? (
          <Metric label={CLIENTE360_UX_COPY.quotesConverted} value={String(facts.ordersFromQuotes)} />
        ) : null}
        <Metric label={CLIENTE360_UX_COPY.openIssues} value={String(facts.openIssues)} />
        <Metric
          label={CLIENTE360_UX_COPY.lastActivity}
          value={facts.lastActivityLabel ?? 'Sin actividad registrada'}
        />
      </dl>
    </section>
  );
}
