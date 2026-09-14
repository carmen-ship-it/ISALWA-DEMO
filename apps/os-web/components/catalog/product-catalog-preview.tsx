import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmptyState, ListRow, Panel, StatGroup, StatusPill } from '@isalwa/ui';

type PreviewCitation = {
  sourceFilename: string;
  page: number;
};

type PreviewProduct = {
  id: string;
  businessCode: string | null;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
  provenance: PreviewCitation[];
  reviewStatus: string;
};

type PreviewFile = {
  importExecuted: boolean;
  isPriceList: boolean;
  productCount: number;
  products: PreviewProduct[];
  unresolved: Array<{ name: string; sourceFilename: string; page: number; reason: string }>;
};

const PREVIEW_CANDIDATES = [
  join(process.cwd(), 'packages/os-catalog/preview/vitri-2026-reviewed.json'),
  join(process.cwd(), '../../packages/os-catalog/preview/vitri-2026-reviewed.json'),
];

const CATEGORY_LABEL: Record<string, string> = {
  sanitarios: 'Sanitarios',
  tanques: 'Tanques',
  lavamanos: 'Lavamanos',
  urinarios: 'Urinarios',
};

const REVIEW_LABEL: Record<string, string> = {
  spec_page: 'Ficha en página',
  dimensions_unspecified: 'Medidas no impresas',
  named_only: 'Solo nombre en página',
  comparison_row_only: 'Solo fila comparativa',
};

const CATEGORY_ORDER = ['sanitarios', 'tanques', 'lavamanos', 'urinarios'];

function loadPreview(): PreviewFile | null {
  for (const path of PREVIEW_CANDIDATES) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as PreviewFile;
    } catch {
      // try the next workspace root
    }
  }
  return null;
}

function citations(product: PreviewProduct): string {
  const unique = new Map<string, PreviewCitation>();
  for (const citation of product.provenance) {
    unique.set(`${citation.sourceFilename}:${citation.page}`, citation);
  }
  return [...unique.values()]
    .map((citation) => `${citation.sourceFilename} · p. ${citation.page}`)
    .join(' · ');
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

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    products: preview.products.filter((product) => product.category === category),
  })).filter((group) => group.products.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-[var(--isalwa-text-md)] font-medium text-[var(--isalwa-kiln)]">
        Esto no es una lista de precios.
      </p>
      <p className="text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
        Revise los candidatos y confirme cuáles entran al maestro; no hay código comercial en estas páginas.
      </p>

      <StatGroup
        items={[
          { label: 'Candidatos', value: String(preview.productCount) },
          { label: 'Sin código', value: String(preview.products.filter((product) => !product.businessCode).length) },
          { label: 'Importados', value: '0' },
        ]}
      />

      {grouped.map((group) => (
        <section key={group.category} aria-labelledby={`catalogo-${group.category}`}>
          <h2
            id={`catalogo-${group.category}`}
            className="isalwa-section-label mb-3"
          >
            {CATEGORY_LABEL[group.category] ?? group.category}
          </h2>
          <Panel className="overflow-hidden">
            <ul className="m-0 list-none p-0">
              {group.products.map((product) => (
                <ListRow key={product.id} as="li">
                  <div className="min-w-0">
                    <p className="text-[var(--isalwa-text-md)] font-semibold text-[var(--isalwa-kiln)]">
                      {product.name}
                    </p>
                    {product.description ? (
                      <p className="mt-1 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
                        {product.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                      {citations(product)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusPill tone="neutral">Sin código comercial</StatusPill>
                    <StatusPill tone={product.reviewStatus === 'spec_page' ? 'info' : 'warning'}>
                      {REVIEW_LABEL[product.reviewStatus] ?? product.reviewStatus}
                    </StatusPill>
                  </div>
                </ListRow>
              ))}
            </ul>
          </Panel>
        </section>
      ))}

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
