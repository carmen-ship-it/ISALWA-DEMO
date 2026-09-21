import Link from 'next/link';

type ListPageNavProps = {
  from: number;
  to: number;
  total: number | null;
  page: number;
  pageCount: number | null;
  prevHref: string | null;
  nextHref: string | null;
};

/**
 * Numbered pages only when the loaded set has a known length.
 * Cursor lists pass total=null and say "Página actual" — no invented Y.
 */
export function ListPageNav({
  from,
  to,
  total,
  page,
  pageCount,
  prevHref,
  nextHref,
}: ListPageNavProps) {
  if (!prevHref && !nextHref) return null;

  const range =
    total != null && from > 0 ? `${from}–${to} de ${total}` : from > 0 ? `${from}–${to}` : null;
  const pageLabel =
    pageCount != null ? `Página ${page} de ${pageCount}` : 'Página actual';

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_72%,white)] px-3 py-3"
      aria-label="Páginas"
      data-list-page-nav=""
    >
      <p className="text-sm text-[var(--isalwa-kiln)]">{range}</p>
      <div className="flex flex-wrap items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm font-medium text-[var(--isalwa-kiln)]"
          >
            ‹ Anterior
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center px-3 text-sm text-[var(--isalwa-slate)]">‹ Anterior</span>
        )}
        <span className="text-sm font-medium text-[var(--isalwa-kiln)]">{pageLabel}</span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm font-medium text-[var(--isalwa-kiln)]"
          >
            Siguiente ›
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center px-3 text-sm text-[var(--isalwa-slate)]">Siguiente ›</span>
        )}
      </div>
    </nav>
  );
}
