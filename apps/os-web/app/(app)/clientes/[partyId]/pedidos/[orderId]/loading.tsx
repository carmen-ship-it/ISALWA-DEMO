import { PageContainer } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';

export default function PedidoLoading() {
  return (
    <PageContainer label="Pedido">
      <PageHeader kicker="Pedido" title="Pedido" />
      <p className="text-sm text-[var(--isalwa-slate)]">Cargando el pedido…</p>
    </PageContainer>
  );
}
