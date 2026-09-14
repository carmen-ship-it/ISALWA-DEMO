'use client';

import { PageContainer } from '@isalwa/ui';
import { ServiceUnavailableState } from '@/components/states/app-states';
import { WAREHOUSE_TASK_COPY } from '@/lib/warehouse';

export default function AlmacenError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer label={WAREHOUSE_TASK_COPY.title} className="flex min-h-[50vh] items-center justify-center">
      <div data-warehouse-status="error">
        <ServiceUnavailableState onRetry={reset} />
        <p className="mt-4 max-w-xl text-sm text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.errorDescription}</p>
      </div>
    </PageContainer>
  );
}
