import { PageContainer } from '@isalwa/ui';
import { ProductCatalogPreview } from '@/components/catalog/product-catalog-preview';
import { PageHeader } from '@/components/shell/page-header';

export default function ProductosPage() {
  return (
    <PageContainer label="Productos">
      <PageHeader
        kicker="Catálogo"
        title="Productos"
        description="Los catálogos Vitri son el material de origen. La extracción de texto no probó un monto, así que ningún precio queda verificado."
      />
      <ProductCatalogPreview />
    </PageContainer>
  );
}
