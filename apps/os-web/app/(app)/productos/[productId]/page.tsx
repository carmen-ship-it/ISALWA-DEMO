import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState, PageContainer } from '@isalwa/ui';
import { ProductSheetView } from '@/components/catalog/product-sheet';
import { PageHeader } from '@/components/shell/page-header';
import { loadProductSheet } from '@/lib/catalog/catalog-view';
import { CATALOG_COPY } from '@/lib/catalog/copy';

type ProductSheetPageProps = {
  params: Promise<{ productId: string }>;
};

function BackLink() {
  return (
    <Link
      href="/productos"
      className="inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)]"
    >
      {CATALOG_COPY.backToCatalog}
    </Link>
  );
}

export default async function ProductSheetPage({ params }: ProductSheetPageProps) {
  const { productId } = await params;
  const result = loadProductSheet(productId);

  if (result.state === 'redirect') redirect(`/productos/${result.productId}`);

  if (result.state !== 'ready') {
    const description =
      result.state === 'missing'
        ? CATALOG_COPY.missingDescription
        : result.state === 'unmatched'
          ? `${CATALOG_COPY.sheetUnmatchedDescription} ${result.basis}`
          : CATALOG_COPY.sheetNotFoundDescription;
    return (
      <PageContainer label={CATALOG_COPY.sheetKicker}>
        <PageHeader kicker={CATALOG_COPY.title} title={CATALOG_COPY.sheetNotFoundTitle} action={<BackLink />} />
        <EmptyState
          title={result.state === 'missing' ? CATALOG_COPY.missingTitle : CATALOG_COPY.sheetNotFoundTitle}
          description={description}
        />
      </PageContainer>
    );
  }

  const { sheet } = result;
  return (
    <PageContainer label={sheet.name.value}>
      <PageHeader kicker={CATALOG_COPY.sheetKicker} title={sheet.name.value} action={<BackLink />} />
      <ProductSheetView sheet={sheet} />
    </PageContainer>
  );
}
