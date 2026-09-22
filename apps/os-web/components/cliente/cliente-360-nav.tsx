'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { clienteSectionHref } from '@/lib/commercial/navigation';
import { explicitDataMode, samePathQueryNavigation } from '@/lib/demo/preserve-data-mode';
import {
  CLIENTE360_NAV_SECTIONS,
  isCliente360NavSection,
  type Cliente360NavSectionId,
} from '@/lib/cliente/nav-sections';
import { clienteTabActiveClass, clienteTabInactiveClass } from '@/lib/ui/visual-status';

type Cliente360NavProps = {
  partyId: string;
  activeTab: Cliente360NavSectionId;
  /** When nested under Cliente360Sticky, drop the own sticky chrome. */
  embedded?: boolean;
};

/**
 * Cliente360 workspace tabs — only one panel is shown by the page.
 * Deep links use `?tab=`; legacy `#section` hashes redirect once to `?tab=`.
 * Mobile: horizontal scroll tabs + select.
 */
function landSamePathQuery(router: { push: (href: string) => void }, href: string) {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const decision = samePathQueryNavigation(current, href);
  if (decision.kind === 'assign') {
    window.location.assign(decision.href);
    return;
  }
  if (decision.kind === 'push') router.push(href);
}

export function Cliente360Nav({ partyId, activeTab, embedded = false }: Cliente360NavProps) {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!isCliente360NavSection(hash)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === hash) return;
    landSamePathQuery(
      router,
      clienteSectionHref(partyId, hash, undefined, explicitDataMode(params.get('datos'))),
    );
  }, [partyId, router]);

  return (
    <nav
      aria-label="Secciones del cliente"
      className={
        embedded
          ? 'max-w-full border-t border-[var(--isalwa-mist)] pt-1'
          : 'isalwa-sticky-under-shell mt-6 max-w-full border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-surface-ops)_92%,transparent)] shadow-[var(--isalwa-glass-light-edge)] backdrop-blur-md'
      }
    >
      <div className="sm:hidden">
        <label className="sr-only" htmlFor="cliente360-tab-select">
          Sección del cliente
        </label>
        <select
          id="cliente360-tab-select"
          className="mb-2 h-10 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-surface-ops)] px-3 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          value={activeTab}
          onChange={(event) => {
            const next = event.target.value;
            if (isCliente360NavSection(next)) {
              const mode = explicitDataMode(new URLSearchParams(window.location.search).get('datos'));
              landSamePathQuery(router, clienteSectionHref(partyId, next, undefined, mode));
            }
          }}
        >
          {CLIENTE360_NAV_SECTIONS.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain sm:block" role="presentation">
        <ul className="flex w-max gap-0.5" role="tablist">
          {CLIENTE360_NAV_SECTIONS.map((section) => {
            const active = activeTab === section.id;
            return (
              <li key={section.id} role="presentation">
                <Link
                  href={clienteSectionHref(partyId, section.id)}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? 'page' : undefined}
                  className={active ? clienteTabActiveClass : clienteTabInactiveClass}
                >
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
