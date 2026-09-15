import Link from 'next/link';

const linkClass =
  'isalwa-t-fast text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export type CommercialPathCrumb = {
  label: string;
  href?: string;
};

type CommercialPathProps = {
  crumbs: CommercialPathCrumb[];
};

/** Cliente → oportunidad → cotización → pedido trail. Labels only; no architecture terms. */
export function CommercialPath({ crumbs }: CommercialPathProps) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Ruta comercial" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--isalwa-slate)]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.href && !last ? (
                <Link href={crumb.href} className={`min-w-0 truncate ${linkClass}`}>
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={
                    last
                      ? 'min-w-0 truncate font-medium text-[var(--isalwa-kiln)]'
                      : 'min-w-0 truncate'
                  }
                  aria-current={last ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
