import { PageContainer, StatusPill } from '@isalwa/ui';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { PageHeader } from '@/components/shell/page-header';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';
import { loadComprasQueue } from '@/lib/purchasing/load-queue';

/** CROSS_LANE: add 'comprasFilter' to TOUR_TARGET in lib/walkthrough/targets.ts */
const COMPRAS_FILTER_TARGET = 'compras-filter';

type ComprasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  const query = await searchParams;
  const q = one(query.q);
  const estado = one(query.estado);
  const queue = await loadComprasQueue({ q, buyer: one(query.buyer), estado });

  return (
    <PageContainer label={COMPRAS_COPY.title} data-tour={COMPRAS_FILTER_TARGET}>
      <PageHeader
        kicker={COMPRAS_COPY.kicker}
        title={COMPRAS_COPY.title}
        description={COMPRAS_COPY.description}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="manual">No es inventario</StatusPill>
          </div>
        }
      />
      {queue.state === 'ready' ? (
        <PurchaseRequestPanel
          state="ready"
          items={queue.items}
          count={queue.count}
          buyerSuggestions={queue.buyerSuggestions}
          query={q}
          statusFilter={estado}
        />
      ) : (
        <PurchaseRequestPanel state={queue.state} />
      )}
    </PageContainer>
  );
}
