import { PageContainer } from '@isalwa/ui';
import { WAREHOUSE_TASK_COPY } from '@/lib/warehouse';

export default function AlmacenLoading() {
  return (
    <PageContainer label={WAREHOUSE_TASK_COPY.title}>
      <div className="flex min-h-[40vh] items-center justify-center" aria-live="polite" aria-busy="true">
        <p className="text-sm text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.loading}</p>
      </div>
    </PageContainer>
  );
}
