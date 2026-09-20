import { PageContainer, StatusPill } from '@isalwa/ui';
import { ProductCatalogPreview } from '@/components/catalog/product-catalog-preview';
import { PageHeader } from '@/components/shell/page-header';

export default function ProductosPage() {
  return (
    <PageContainer label="Productos">
      <PageHeader
        kicker="Catálogo"
        title="Productos"
        description="Candidatos leídos de los catálogos. Revise nombre y detalle. No hay stock inventado aquí. Sin precio de origen en la tarjeta: esto no es una lista de precios; en cada producto solo se muestran excepciones (código comercial o precio)."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="manual">Vista previa</StatusPill>
            <StatusPill tone="neutral">No es lista de precios</StatusPill>
          </div>
        }
      />
      <div className="mt-2 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,transparent)] p-1 md:p-2">
        <ProductCatalogPreview />
      </div>
    </PageContainer>
  );
}
