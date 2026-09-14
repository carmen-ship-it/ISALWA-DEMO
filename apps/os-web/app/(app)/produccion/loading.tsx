import { PageContainer, PageSection, Skeleton } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';

export default function ProduccionLoading() {
  return (
    <PageContainer label="Producción">
      <PageHeader kicker="Planta" title="Producción" description="Cargando producción." />
      <p className="mb-6 text-sm text-[var(--isalwa-slate)]" role="status" aria-live="polite" aria-busy="true">
        Cargando producción.
      </p>
      <PageSection card className="space-y-3 p-5" aria-hidden="true">
        <Skeleton h={12} className="w-40" />
        <Skeleton h={40} className="w-full" />
        <Skeleton h={40} className="w-full" />
      </PageSection>
    </PageContainer>
  );
}
