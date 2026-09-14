'use client';

import { PageContainer } from '@isalwa/ui';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { PageHeader } from '@/components/shell/page-header';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';

export default function ComprasError() {
  return (
    <PageContainer label={COMPRAS_COPY.title}>
      <PageHeader kicker={COMPRAS_COPY.kicker} title={COMPRAS_COPY.title} />
      <PurchaseRequestPanel state="error" />
    </PageContainer>
  );
}
