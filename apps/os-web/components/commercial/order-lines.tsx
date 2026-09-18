import { SectionHeader } from '@isalwa/ui';
import { presentProductRef } from '@/lib/commercial/human-facing';
import { formatCentavos } from '@/lib/commercial/money';
import { presentOrderLines, type OrderLineView } from '@/lib/commercial/order-lines';

type OrderLinesProps = {
  currency: string;
  lines: readonly OrderLineView[] | null | undefined;
};

export function OrderLines({ currency, lines }: OrderLinesProps) {
  const presentation = presentOrderLines(lines);

  return (
    <>
      <SectionHeader
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {presentation.title}
          </h2>
        }
      />
      {presentation.recorded ? (
        <>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {presentation.note}
          </p>
          <ul className="mt-6 divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas del pedido">
            {presentation.lines.map((line) => {
              const productRefLabel = presentProductRef(line.productRef);
              return (
              <li key={line.orderLineId} className="py-6 first:pt-2">
                <p className="font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                <dl className="mt-4 grid gap-4 text-sm text-[var(--isalwa-slate)] sm:grid-cols-3">
                  <div>
                    <dt className="isalwa-section-label">Cantidad</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">
                      {line.quantity}
                      {line.unitLabel ? ` ${line.unitLabel}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Precio unitario</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">
                      {formatCentavos(line.unitPriceCentavos, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Total línea</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">
                      {formatCentavos(line.lineTotalCentavos, currency)}
                    </dd>
                  </div>
                  {line.discountCentavos !== '0' ? (
                    <div>
                      <dt className="isalwa-section-label">Descuento</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">
                        {formatCentavos(line.discountCentavos, currency)}
                      </dd>
                    </div>
                  ) : null}
                  {productRefLabel ? (
                    <div>
                      <dt className="isalwa-section-label">Referencia</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">{productRefLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="mt-6 max-w-xl space-y-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          <p>{presentation.message}</p>
          <p>{presentation.note}</p>
        </div>
      )}
    </>
  );
}
