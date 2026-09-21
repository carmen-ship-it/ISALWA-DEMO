import { PageContainer, Skeleton } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { ISSUE_COPY } from '@/lib/issue/labels';

export default function IssueDetailLoading() {
  return (
    <PageContainer label="Incidencia">
      <PageHeader
        kicker={ISSUE_COPY.detailKicker}
        title="Incidencia"
        description="Cargando el caso y el diario."
      />
      <div className="space-y-3 pt-4" role="status" aria-live="polite">
        <Skeleton h={16} />
        <Skeleton h={16} className="max-w-lg" />
        <Skeleton h={16} className="max-w-md" />
      </div>
    </PageContainer>
  );
}
