import { PageContainer } from '@isalwa/ui';
import { EntregaPanel } from '@/components/delivery/entrega-panel';

export default function EntregasLoading() {
  return (
    <PageContainer label="Entregas">
      <EntregaPanel status="loading" warehouseExits={[]} deliveries={[]} />
    </PageContainer>
  );
}
