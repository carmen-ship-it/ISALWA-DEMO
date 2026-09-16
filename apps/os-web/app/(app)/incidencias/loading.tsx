import { PageContainer, Skeleton } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { ISSUE_COPY } from '@/lib/issue/labels';

export default function IncidenciasLoading() {
  return (
    <PageContainer label={ISSUE_COPY.listTitle}>
      <PageHeader
        kicker={ISSUE_COPY.listKicker}
        title={ISSUE_COPY.listTitle}
        description={ISSUE_COPY.listDescription}
      />
      <div className="space-y-3 pt-4">
        <Skeleton h={16} />
        <Skeleton h={16} className="max-w-lg" />
        <Skeleton h={16} className="max-w-md" />
        <Skeleton h={16} className="max-w-sm" />
      </div>
    </PageContainer>
  );
}
