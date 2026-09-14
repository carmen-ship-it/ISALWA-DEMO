import { EmptyState, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import {
  ORDER_CASE_UNAVAILABLE,
  orderCasePanelModel,
  type OrderCaseFactInput,
  type OrderCaseLine,
  type OrderCaseReleaseInput,
} from '@/lib/operations/operational-case';

type OrderCasePanelProps = {
  organizationId: string;
  orderId: string;
  facts: readonly OrderCaseFactInput[];
  releases?: readonly OrderCaseReleaseInput[];
  /** recorded: facts were loaded. unavailable: this view has no case query yet. */
  availability?: 'recorded' | 'unavailable';
};

function CaseLine({ line }: { line: OrderCaseLine }) {
  return (
    <ListRow as="li" className="px-1 py-1">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{line.title}</h3>
          {line.confirmation ? <StatusPill tone="warning">{line.confirmation}</StatusPill> : null}
          <StatusPill tone="manual">Dato anotado</StatusPill>
        </div>
        <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">{line.value}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{line.who}</p>
        {line.when ? <p className="text-sm text-[var(--isalwa-slate)]">{line.when}</p> : null}
        {line.line ? <p className="text-sm text-[var(--isalwa-slate)]">{line.line}</p> : null}
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{line.boundary}</p>
        {line.reversal ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{line.reversal}</p>
        ) : null}
      </div>
    </ListRow>
  );
}

/**
 * Lists annotations and release decisions for one order.
 * Does not confirm payment, stock, or delivery. Does not require a payment to proceed.
 */
export function OrderCasePanel({
  organizationId,
  orderId,
  facts,
  releases,
  availability = 'recorded',
}: OrderCasePanelProps) {
  const model = orderCasePanelModel({ organizationId, orderId, facts, releases });
  const empty = model.facts.length === 0 && model.releases.length === 0;
  const emptyTitle = availability === 'unavailable' ? ORDER_CASE_UNAVAILABLE : model.empty;

  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={model.heading}>
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {model.heading}
          </h2>
        }
      />
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{model.intro}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {model.paymentNotRequired}
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{model.accounting}</p>
      {empty ? (
        <div className="mt-8">
          <EmptyState title={emptyTitle} description={model.paymentNotRequired} />
        </div>
      ) : (
        <ul className="mt-8" aria-label="Anotaciones y decisiones de este pedido">
          {model.releases.map((line) => (
            <CaseLine key={line.id} line={line} />
          ))}
          {model.facts.map((line) => (
            <CaseLine key={line.id} line={line} />
          ))}
        </ul>
      )}
    </PageSection>
  );
}
