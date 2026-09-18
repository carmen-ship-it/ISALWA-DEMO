import Link from 'next/link';
import { SPECIAL_ITEM_LABEL } from '@/lib/commercial/product-picker';
import { formatCentavos } from '@/lib/commercial/money';
import {
  QUOTED_CONTEXT_HEADING,
  QUOTED_PRODUCTS_NOTE,
  QUOTED_PRODUCTS_TITLE,
  QUOTED_PRODUCTS_UNAVAILABLE,
  QUOTED_QUANTITY_LABEL,
  type QuotedProductLine,
} from '@/lib/commercial/quoted-product-context';

const linkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

type QuotedProductContextProps = {
  lines: readonly QuotedProductLine[];
  currency?: string;
  quoteHref?: string | null;
  quoteNumber?: string | null;
  orderHref?: string | null;
  orderNumber?: string | null;
  unavailable?: boolean;
  showPrices?: boolean;
  heading?: string;
};

export function QuotedProductContext({
  lines,
  currency = 'BOB',
  quoteHref,
  quoteNumber,
  orderHref,
  orderNumber,
  unavailable = false,
  showPrices = true,
  heading = QUOTED_PRODUCTS_TITLE,
}: QuotedProductContextProps) {
  return (
    <section aria-label={heading}>
      <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
        {heading}
      </h2>
      {unavailable ? (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {QUOTED_PRODUCTS_UNAVAILABLE}
        </p>
      ) : lines.length === 0 ? (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Esta cotización no tiene líneas guardadas.
        </p>
      ) : (
        <>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{QUOTED_PRODUCTS_NOTE}</p>
          <ul className="mt-6 divide-y divide-[var(--isalwa-mist)]">
            {lines.map((line) => (
              <li key={line.quoteLineId} className="py-5 first:pt-2">
                <p className="whitespace-pre-line font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                {line.specialItem ? (
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{SPECIAL_ITEM_LABEL}</p>
                ) : null}
                <dl className="mt-4 grid gap-4 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                  <div>
                    <dt className="isalwa-section-label">{QUOTED_QUANTITY_LABEL}</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">
                      {line.quantity}
                      {line.unitLabel ? ` ${line.unitLabel}` : ''}
                    </dd>
                  </div>
                  {showPrices ? (
                    <>
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
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {quoteHref ? (
          <Link href={quoteHref} className={linkClass}>
            {quoteNumber ? `Cotización ${quoteNumber}` : 'Abrir cotización'}
          </Link>
        ) : null}
        {orderHref ? (
          <Link href={orderHref} className={linkClass}>
            {orderNumber ? `Pedido ${orderNumber}` : 'Abrir pedido'}
          </Link>
        ) : null}
      </p>
    </section>
  );
}

export { QUOTED_CONTEXT_HEADING };
