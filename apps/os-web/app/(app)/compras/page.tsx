import { PageContainer } from '@isalwa/ui';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { PageHeader } from '@/components/shell/page-header';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';
import { loadComprasQueue } from '@/lib/purchasing/load-queue';

type ComprasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  const query = await searchParams;
  const queue = await loadComprasQueue({ q: one(query.q), buyer: one(query.buyer) });

  return (
    <PageContainer label={COMPRAS_COPY.title}>
      <PageHeader
        kicker={COMPRAS_COPY.kicker}
        title={COMPRAS_COPY.title}
        description={COMPRAS_COPY.description}
      />
      {queue.state === 'ready' ? (
        <PurchaseRequestPanel
          state="ready"
          items={queue.items}
          count={queue.count}
          buyerSuggestions={queue.buyerSuggestions}
        />
      ) : (
        <PurchaseRequestPanel state={queue.state} />
      )}
    </PageContainer>
  );
}
