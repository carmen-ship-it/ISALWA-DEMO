import { PageContainer, StatusPill } from '@isalwa/ui';
import { ProductCatalogPreview } from '@/components/catalog/product-catalog-preview';
import { PageHeader } from '@/components/shell/page-header';

export default function ProductosPage() {
  return (
    <PageContainer label="Productos">
      <PageHeader
        kicker="Catálogo"
        title="Productos"
        description="Candidatos leídos de los catálogos. Revise nombre y detalle. No hay stock inventado aquí."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="manual">Vista previa</StatusPill>
            <StatusPill tone="neutral">No es lista de precios</StatusPill>
          </div>
        }
      />
      <ProductCatalogPreview />
    </PageContainer>
  );
}
