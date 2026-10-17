import { EmptyState, Panel, StatusPill } from '@isalwa/ui';
import { CatalogBrowser } from '@/components/catalog/catalog-browser';
import { loadCatalogPage, type CatalogPageState } from '@/lib/catalog/catalog-view';
import { CATALOG_COPY } from '@/lib/catalog/copy';

export function ProductCatalogPreview({ page = loadCatalogPage() }: { page?: CatalogPageState }) {
  if (page.state === 'missing') {
    return (
      <EmptyState title={CATALOG_COPY.missingTitle} description={CATALOG_COPY.missingDescription} />
    );
  }
  const { view } = page;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="warning">{CATALOG_COPY.pdfPending}</StatusPill>
        <p className="m-0 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
          {CATALOG_COPY.reviewedOn}: {view.reviewedOn}
        </p>
      </div>

      <CatalogBrowser cards={view.cards} categories={view.categories} />

      {view.unresolved.length > 0 ? (
        <section aria-labelledby="catalogo-sin-ficha">
          <h2 id="catalogo-sin-ficha" className="isalwa-section-label mb-3">
            {CATALOG_COPY.unresolvedTitle}
          </h2>
          <Panel padded>
            <ul className="m-0 list-none space-y-3 p-0">
              {view.unresolved.map((item) => (
                <li key={`${item.name}-${item.page}`}>
                  <p className="text-[var(--isalwa-text-md)] font-semibold text-[var(--isalwa-kiln)]">{item.name}</p>
                  <p className="mt-1 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
                    {item.reason}
                  </p>
                  <p className="mt-1 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                    {item.sourceFilename} · p. {item.page}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      ) : null}
    </div>
  );
}
