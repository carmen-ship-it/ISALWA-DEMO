import { PageContainer, PageSection, Skeleton } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { t } from '@/lib/i18n/es';

export default function InicioLoading() {
  return (
    <PageContainer label={t('pages.inicio.title')}>
      <PageHeader
        kicker={t('pages.inicio.kicker')}
        title={t('pages.inicio.title')}
        description={t('pages.inicio.description')}
      />
      <p className="mb-8 text-sm text-[var(--isalwa-slate)]" role="status" aria-live="polite" aria-busy="true">
        {t('states.loading')}
      </p>
      <div className="space-y-10" aria-hidden="true">
        <PageSection card className="space-y-3 p-5 md:p-6">
          <Skeleton h={12} className="w-36" />
          <Skeleton h={56} className="w-full" />
          <Skeleton h={56} className="w-full" />
        </PageSection>
        <PageSection card className="space-y-3 p-5 md:p-6">
          <Skeleton h={12} className="w-44" />
          <Skeleton h={48} className="w-full" />
        </PageSection>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <PageSection card className="p-5 md:p-6">
            <Skeleton h={72} className="w-full" />
          </PageSection>
          <PageSection card className="p-5 md:p-6">
            <Skeleton h={72} className="w-full" />
          </PageSection>
        </div>
      </div>
    </PageContainer>
  );
}
