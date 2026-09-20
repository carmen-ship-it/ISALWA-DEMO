'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { hrefWithClientDataMode } from '@/lib/demo/preserve-data-mode';
import { deriveShellBreadcrumbs } from '@/lib/navigation/breadcrumbs';
import { workDetailReturn } from '@/lib/work/navigation';

/**
 * Path-derived trail under the sticky header.
 * Not sticky itself — only appears on deep routes.
 * Honors safe `from=` on work detail so Volver matches the opening desk.
 */
export function ShellBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trail = deriveShellBreadcrumbs(pathname);
  if (trail.crumbs.length === 0) return null;

  const from = searchParams.get('from');
  const back =
    pathname.startsWith('/trabajo/') && from
      ? workDetailReturn(from)
      : trail.back;

  return (
    <div className="border-b border-[var(--isalwa-mist)] bg-[var(--isalwa-surface-canvas)] px-4 py-2.5 lg:px-8">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {back ? (
          <Link
            href={hrefWithClientDataMode(back.href)}
            className="isalwa-t-fast inline-flex min-h-9 items-center gap-1 rounded-[var(--isalwa-radius-control)] px-1.5 text-sm font-medium text-[var(--isalwa-glaze)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            <ChevronLeft aria-hidden size={16} strokeWidth={1.75} />
            <span className="sr-only sm:not-sr-only sm:inline">{back.label}</span>
            <span className="sm:hidden" aria-hidden>
              Volver
            </span>
          </Link>
        ) : null}
        <nav aria-label="Ubicación" className="min-w-0">
          <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-[var(--isalwa-slate)]">
            {trail.crumbs.map((crumb, index) => {
              const last = index === trail.crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                  {index > 0 ? (
                    <span aria-hidden className="text-[var(--isalwa-mist)]">
                      /
                    </span>
                  ) : null}
                  {crumb.href && !last ? (
                    <Link
                      href={hrefWithClientDataMode(crumb.href)}
                      className="isalwa-t-fast truncate rounded-[var(--isalwa-radius-control)] outline-none hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={last ? 'truncate font-medium text-[var(--isalwa-kiln)]' : 'truncate'}
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
      </div>
    </div>
  );
}
