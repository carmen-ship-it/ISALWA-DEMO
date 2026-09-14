import { EmptyState, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { formatTimestamp } from '@/lib/commercial/labels';
import { displayQualityRatio } from '@/lib/production/quality-display';

/**
 * Manufacturing panel. Product is the subject.
 * Do not mount this on a Pedido page. A quema is not an order, and Listo is not an allocation.
 * CROSS_LANE: no production route is owned here. Mount on a manufacturing surface only.
 */

export const PRODUCTION_STEP_LABELS = [
  'Laboratorio — preparación de materia prima y esmalte',
  'Molienda',
  'Colaje',
  'Secado',
  'Pulido',
  'Esmaltado',
  'Carga y Limpieza',
  'Horno',
  'Resane',
  'Clasificación',
  'Almacén de Productos Terminados',
] as const;

export const PRODUCTION_PANEL_COPY = {
  kicker: 'Producción',
  title: 'Producción',
  intro: 'Registro de fabricación del producto. La producción no se anota contra un pedido.',
  quema: 'Quema',
  quemaHint: 'Una quema puede reunir varios productos. No corresponde a un pedido.',
  listo: 'Listo',
  listoMeaning:
    'Listo significa que el producto entró al Almacén de Productos Terminados. No lo asigna a un pedido.',
  notReady: 'Sin ingreso a almacén',
  notReadyMeaning: 'Todavía no hay ingreso al Almacén de Productos Terminados.',
  emptyTitle: 'Sin registros de fabricación',
  emptyDescription: 'Los pasos se muestran en el orden de planta. El nombre de cada paso no se cambia.',
  source: 'Registro manual',
  consumptionNote: 'Consumo informado. No descuenta stock. El stock de entrada no es una fuente confiable.',
  categories: 'materia prima, insumos, combustible',
  qualityMissing: 'Sin porcentaje. Hacen falta las dos cuentas: piezas buenas y piezas perdidas.',
  qualityDerived: 'Porcentaje calculado solo con las piezas buenas y las piezas perdidas.',
  quantityPending: 'Cantidad pendiente',
  allocationDenied: 'La asignación a un pedido no se registra aquí.',
  correction: 'Corrección',
  preserved: 'Se conserva',
} as const;

export type ProductionPanelRecord = {
  id: string;
  kind: string;
  stepLabel: string | null;
  actorLabel: string;
  occurredAt: string;
  recordedAt: string;
  evidenceNote: string | null;
  summary: string;
  correctsEntryId: string | null;
  goodCount?: number | null;
  lostCount?: number | null;
};

export type ProductionPanelQuema = {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  products: ReadonlyArray<{ productId: string; quantity: string | null; unit: string | null }>;
};

type ProductionPanelProps = {
  productId: string;
  records: ReadonlyArray<ProductionPanelRecord>;
  quemas?: ReadonlyArray<ProductionPanelQuema>;
};

export function ProductionPanel({ productId, records, quemas = [] }: ProductionPanelProps) {
  const listo = records.some((record) => record.kind === 'finished_goods_receipt');
  const superseded = new Set(
    records.map((record) => record.correctsEntryId).filter((id): id is string => id !== null),
  );

  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={PRODUCTION_PANEL_COPY.title}>
      <SectionHeader
        kicker={PRODUCTION_PANEL_COPY.kicker}
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {PRODUCTION_PANEL_COPY.title}
          </h2>
        }
        action={
          listo ? (
            <StatusPill tone="success">{PRODUCTION_PANEL_COPY.listo}</StatusPill>
          ) : (
            <StatusPill tone="neutral">{PRODUCTION_PANEL_COPY.notReady}</StatusPill>
          )
        }
      />
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{PRODUCTION_PANEL_COPY.intro}</p>
      <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">Producto · {productId}</p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {listo ? PRODUCTION_PANEL_COPY.listoMeaning : PRODUCTION_PANEL_COPY.notReadyMeaning}{' '}
        {PRODUCTION_PANEL_COPY.allocationDenied}
      </p>

      <ol className="mt-8 space-y-2">
        {PRODUCTION_STEP_LABELS.map((label, index) => (
          <li key={label} className="text-sm text-[var(--isalwa-kiln)]">
            <span className="text-[var(--isalwa-slate)]">{index + 1}</span> {label}
          </li>
        ))}
      </ol>

      {records.length === 0 && quemas.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={PRODUCTION_PANEL_COPY.emptyTitle}
            description={PRODUCTION_PANEL_COPY.emptyDescription}
          />
        </div>
      ) : (
        <ul className="mt-8 min-w-0" aria-label="Registros de producción">
          {records.map((record) => {
            const ratio = displayQualityRatio(record.goodCount, record.lostCount);
            return (
              <ListRow key={record.id} as="li">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    {record.stepLabel ?? record.summary}
                  </p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{record.summary}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {record.actorLabel} · ocurrió {formatTimestamp(record.occurredAt) ?? record.occurredAt} ·
                    registrado {formatTimestamp(record.recordedAt) ?? record.recordedAt} ·{' '}
                    {PRODUCTION_PANEL_COPY.source}
                  </p>
                  {record.evidenceNote ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Evidencia · {record.evidenceNote}</p>
                  ) : null}
                  {record.kind === 'classification' ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                      {ratio
                        ? `${ratio.goodPercent}% buenas · ${ratio.lostPercent}% pérdida. ${PRODUCTION_PANEL_COPY.qualityDerived}`
                        : PRODUCTION_PANEL_COPY.qualityMissing}
                    </p>
                  ) : null}
                  {record.kind === 'consumption' ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{PRODUCTION_PANEL_COPY.consumptionNote}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {record.correctsEntryId ? (
                    <StatusPill tone="manual">{PRODUCTION_PANEL_COPY.correction}</StatusPill>
                  ) : null}
                  {superseded.has(record.id) ? (
                    <StatusPill tone="neutral">{PRODUCTION_PANEL_COPY.preserved}</StatusPill>
                  ) : null}
                </div>
              </ListRow>
            );
          })}
        </ul>
      )}

      <div className="mt-10">
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
          {PRODUCTION_PANEL_COPY.quema}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {PRODUCTION_PANEL_COPY.quemaHint}
        </p>
        {quemas.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">Sin quema para este producto.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {quemas.map((quema) => (
              <li key={quema.id} className="text-sm text-[var(--isalwa-kiln)]">
                <p>
                  Inicio {formatTimestamp(quema.startedAt) ?? 'sin inicio'} · Fin{' '}
                  {quema.endedAt ? formatTimestamp(quema.endedAt) : 'sin fin'}
                </p>
                <p className="mt-1 text-[var(--isalwa-slate)]">
                  {quema.products.length} productos
                  {quema.products.length > 1 ? '. No se asume un solo producto.' : '.'}
                </p>
                <ul className="mt-2 space-y-1">
                  {quema.products.map((product) => (
                    <li key={product.productId}>
                      {product.productId}
                      {' · '}
                      {product.quantity
                        ? `${product.quantity}${product.unit ? ` ${product.unit}` : ''}`
                        : PRODUCTION_PANEL_COPY.quantityPending}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-sm text-[var(--isalwa-slate)]">
        Consumo: {PRODUCTION_PANEL_COPY.categories}. {PRODUCTION_PANEL_COPY.consumptionNote}
      </p>
    </PageSection>
  );
}
