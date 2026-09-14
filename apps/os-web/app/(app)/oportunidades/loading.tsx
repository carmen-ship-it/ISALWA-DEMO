import { PageContainer } from '@isalwa/ui';
import { LoadingShell } from '@/components/states/app-states';

export default function OportunidadesLoading() {
  return (
    <PageContainer label="Oportunidades">
      <LoadingShell />
    </PageContainer>
  );
}
