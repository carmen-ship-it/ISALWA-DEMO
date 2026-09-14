import { PageContainer } from '@isalwa/ui';
import { ProductCatalogPreview } from '@/components/catalog/product-catalog-preview';
import { PageHeader } from '@/components/shell/page-header';

export default function ProductosPage() {
  return (
    <PageContainer label="Productos">
      <PageHeader
        kicker="Catálogo"
        title="Productos"
        description="Candidatos leídos de los catálogos. No es una lista de precios mientras no exista un precio de origen."
      />
      <ProductCatalogPreview />
    </PageContainer>
  );
}
