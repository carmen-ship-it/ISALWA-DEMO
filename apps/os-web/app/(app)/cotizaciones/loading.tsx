import { PageContainer } from '@isalwa/ui';
import { LoadingShell } from '@/components/states/app-states';

export default function CotizacionesLoading() {
  return (
    <PageContainer label="Cotizaciones">
      <LoadingShell />
    </PageContainer>
  );
}
