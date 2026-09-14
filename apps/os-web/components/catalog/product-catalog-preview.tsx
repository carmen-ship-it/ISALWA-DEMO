import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmptyState, Panel, StatGroup } from '@isalwa/ui';
import { CatalogBrowser } from '@/components/catalog/catalog-browser';
import type { CatalogCard } from '../../../../packages/os-catalog/src/browse';
import { reviewCatalogPrices } from '../../../../packages/os-catalog/src/price-source';
import type { CatalogPreview } from '@isalwa/os-contracts';

const PREVIEW_CANDIDATES = [
  join(process.cwd(), 'packages/os-catalog/preview/vitri-2026-reviewed.json'),
  join(process.cwd(), '../../packages/os-catalog/preview/vitri-2026-reviewed.json'),
];

function loadPreview(): CatalogPreview | null {
  for (const path of PREVIEW_CANDIDATES) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as CatalogPreview;
    } catch {
      // try the next workspace root
    }
  }
  return null;
}

function toCard(product: CatalogPreview['products'][number]): CatalogCard {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    businessCode: product.businessCode,
    reviewStatus: product.reviewStatus,
    attributeValues: product.attributes.map((attribute) =>
      attribute.label ? `${attribute.label}: ${attribute.value}` : attribute.value,
    ),
    aliases: product.aliases,
  };
}

export function ProductCatalogPreview() {
  const preview = loadPreview();
  if (!preview) {
    return (
      <EmptyState
        title="Vista previa no disponible"
        description="No se encontró el archivo de candidatos. No se inventan productos."
      />
    );
  }
  if (preview.isPriceList || preview.importExecuted) return null;

  const review = reviewCatalogPrices(preview);
  const cards = preview.products.map(toCard);

  return (
    <div className="space-y-6">
      <p className="text-[var(--isalwa-text-md)] font-medium text-[var(--isalwa-kiln)]">
        Esto no es una lista de precios.
      </p>
      <p className="text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
        Revise los candidatos por nombre o detalle técnico. El código comercial sigue vacío. Un precio
        aparece solo si hay un monto con origen.
      </p>

      <StatGroup
        items={[
          { label: 'Candidatos', value: String(preview.productCount) },
          { label: 'Sin código', value: String(cards.filter((product) => !product.businessCode).length) },
          { label: 'Precios de origen', value: String(review.entries.length) },
          { label: 'Revisión requerida', value: String(review.reviews.length) },
        ]}
      />

      <CatalogBrowser status="ready" products={cards} priceEntries={review.entries} />

      {preview.unresolved.length > 0 ? (
        <section aria-labelledby="catalogo-sin-ficha">
          <h2 id="catalogo-sin-ficha" className="isalwa-section-label mb-3">
            Nombrado, sin ficha
          </h2>
          <Panel padded>
            <ul className="m-0 list-none space-y-3 p-0">
              {preview.unresolved.map((item) => (
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
