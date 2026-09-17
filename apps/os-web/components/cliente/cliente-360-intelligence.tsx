import { SectionHeader, StatGroup } from '@isalwa/ui';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import type { Cliente360Intelligence } from '@/lib/cliente/client-intelligence';

type Cliente360IntelligenceProps = {
  facts: Cliente360Intelligence;
};

function formatCount(value: number | null): string {
  if (value === null) return '—';
  return String(value);
}

export function Cliente360Intelligence({ facts }: Cliente360IntelligenceProps) {
  const items = [
    { label: CLIENTE360_UX_COPY.openOpportunities, value: formatCount(facts.openOpportunities) },
    { label: CLIENTE360_UX_COPY.quotes, value: formatCount(facts.quotes) },
    { label: CLIENTE360_UX_COPY.orders, value: formatCount(facts.openOrders) },
    ...(facts.deliveryNotes !== null && facts.deliveryNotes > 0
      ? [{ label: CLIENTE360_UX_COPY.ordersDelivered, value: String(facts.deliveryNotes) }]
      : []),
    ...(facts.ordersFromQuotes !== null && facts.ordersFromQuotes > 0
      ? [{ label: CLIENTE360_UX_COPY.quotesConverted, value: String(facts.ordersFromQuotes) }]
      : []),
    {
      label: CLIENTE360_UX_COPY.openIssues,
      value: String(facts.openIssues),
      tone: facts.openIssues > 0 ? 'var(--isalwa-danger)' : undefined,
    },
    {
      label: CLIENTE360_UX_COPY.lastActivity,
      value: facts.lastActivityLabel ?? 'Sin actividad',
    },
  ];

  return (
    <section aria-label={CLIENTE360_UX_COPY.intelligenceTitle}>
      <SectionHeader title={CLIENTE360_UX_COPY.intelligenceTitle} className="mb-3" />
      <StatGroup items={items} />
    </section>
  );
}
