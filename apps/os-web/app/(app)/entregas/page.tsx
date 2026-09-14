import { PageContainer } from '@isalwa/ui';
import { EntregaPanel } from '@/components/delivery/entrega-panel';
import { PageHeader } from '@/components/shell/page-header';
import { loadEntregaPage } from '@/lib/delivery/load-entregas';

export default async function EntregasPage() {
  const view = await loadEntregaPage();
  const status = view.status === 'ready' ? 'empty' : view.status;

  return (
    <PageContainer label="Entregas">
      <PageHeader
        kicker="Entrega"
        title="Entregas"
        description="Este es un registro interno de entrega. No reclama un número oficial."
      />
      <EntregaPanel status={status} warehouseExits={[]} deliveries={[]} />
    </PageContainer>
  );
}
