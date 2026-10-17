import { PageContainer } from '@isalwa/ui';
import { ProductCatalogPreview } from '@/components/catalog/product-catalog-preview';
import { PageHeader } from '@/components/shell/page-header';
import { CATALOG_COPY } from '@/lib/catalog/copy';

export default function ProductosPage() {
  return (
    <PageContainer label={CATALOG_COPY.title}>
      <PageHeader
        kicker={CATALOG_COPY.kicker}
        title={CATALOG_COPY.title}
        description={CATALOG_COPY.description}
      />
      <ProductCatalogPreview />
    </PageContainer>
  );
}
