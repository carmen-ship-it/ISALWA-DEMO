import { PageContainer, StatusPill } from '@isalwa/ui';
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
        description="Registro interno de salida y entrega. No reclama un número oficial."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="neutral">Sin número oficial</StatusPill>
            <StatusPill tone="manual">Registro interno</StatusPill>
          </div>
        }
      />
      <EntregaPanel status={status} warehouseExits={[]} deliveries={[]} />
    </PageContainer>
  );
}
