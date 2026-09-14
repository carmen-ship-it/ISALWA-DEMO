import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmptyState, Panel, StatGroup, StatusPill } from '@isalwa/ui';
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
  const extractionLabel = review.structuredExtractionSucceeded
    ? 'Extracción con éxito'
    : 'Extracción sin monto';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="info">Origen existe</StatusPill>
        <StatusPill tone="warning">{extractionLabel}</StatusPill>
        <StatusPill tone="neutral">Sin código comercial</StatusPill>
      </div>
      <p className="text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
        Busque por nombre, categoría o detalle técnico. El código comercial sigue vacío. Un precio se
        verifica solo si el monto y la correspondencia son deterministas.
      </p>

      <StatGroup
        items={[
          { label: 'Candidatos', value: String(review.reviewedCandidateCount) },
          { label: 'Sin código', value: String(cards.filter((product) => !product.businessCode).length) },
          { label: 'Verificados', value: String(review.sourcedEntryCount) },
          { label: 'Revisión', value: String(review.reviewRequiredCount) },
        ]}
      />

      <Panel padded>
        <h2 className="isalwa-section-label mb-3">Qué cuenta cada número</h2>
        <ul className="m-0 list-none space-y-2 p-0 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
          <li>
            {review.reviewedCandidateCount} candidatos revisados. Son productos únicos. Una aparición de
            marketing repetida no crea otro registro.
          </li>
          <li>
            {review.reviewRequiredCount} en revisión. No es el conteo de productos. Son{' '}
            {review.additionalArtifactCount} artefacto adicional ausente,{' '}
            {review.printedLabelWithoutAmountCount} etiquetas PRICE sin monto y{' '}
            {review.reviewedCandidateCount} candidatos sin monto probado.
          </li>
          <li>
            {review.sourcedEntryCount} precios verificados. La extracción de texto no probó un monto.
          </li>
        </ul>
      </Panel>

      <section aria-labelledby="catalogo-origen">
        <h2 id="catalogo-origen" className="isalwa-section-label mb-3">
          Material de origen
        </h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0">
          {preview.sources.map((source) => (
            <li key={source.sha256}>
              <Panel className="p-4">
                <p className="text-[var(--isalwa-text-md)] font-semibold text-[var(--isalwa-kiln)]">
                  {source.filename}
                </p>
                <p className="mt-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                  {source.byteSize.toLocaleString('es-BO')} bytes · {source.pageCount} páginas · origen
                  existe
                </p>
                <p className="mt-2 break-all font-mono text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                  {source.sha256}
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

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
