import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState, PageSection, SectionHeader } from '@isalwa/ui';
import {
  PEDIDO_SECTION_DENIED,
  PEDIDO_SCOPES_UNCONFIRMED,
  type PedidoCaseFile,
  type PedidoCaseSectionId,
} from '@/lib/operations/pedido-case-file';

const linkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

const PERMISSION_COPY: Record<'denied' | 'scopes_unconfirmed', string> = {
  denied: PEDIDO_SECTION_DENIED,
  scopes_unconfirmed: PEDIDO_SCOPES_UNCONFIRMED,
};

type PedidoCaseSectionsProps = {
  file: PedidoCaseFile;
  slots?: Partial<Record<PedidoCaseSectionId, ReactNode>>;
};

function stateTitle(state: 'empty' | 'unavailable' | 'denied' | 'scopes_unconfirmed'): string {
  if (state === 'empty') return 'Sin registro';
  if (state === 'unavailable') return 'No disponible';
  if (state === 'denied') return 'Sin permiso';
  return 'Permisos no cargados';
}

/**
 * Open sections show loaded facts or an empty/unavailable state.
 * Closed sections stay closed. No primary button.
 */
export function PedidoCaseSections({ file, slots }: PedidoCaseSectionsProps) {
  const open = file.sections.filter((section) => section.gate === 'open' && section.id !== 'resumen');
  const closed = file.closedSectionTitles;

  return (
    <div className="mt-10 grid gap-10">
      {closed.length > 0 ? (
        <PageSection card className="bg-white p-8 md:p-10" aria-label="Partes cerradas del pedido">
          <SectionHeader
            kicker="Pedido"
            title={
              <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                Partes cerradas
              </h2>
            }
          />
          <EmptyState
            className="mt-8"
            title={file.scopesConfirmed ? 'Sin permiso' : 'Permisos no cargados'}
            description={
              file.scopesConfirmed
                ? `${PEDIDO_SECTION_DENIED} ${closed.join(', ')}.`
                : `${PEDIDO_SCOPES_UNCONFIRMED} ${closed.join(', ')}.`
            }
          />
        </PageSection>
      ) : null}

      {open.map((section) => {
        const slot = slots?.[section.id] ?? null;
        return (
          <PageSection key={section.id} card className="bg-white p-8 md:p-10" aria-label={section.title}>
            <SectionHeader
              kicker="Pedido"
              title={
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                  {section.title}
                </h2>
              }
            />
            {section.state === 'ready' ? (
              <ul className="mt-6 grid gap-3">
                {section.lines.map((line, index) => (
                  <li key={`${section.id}-${index}`} className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-8">
                <EmptyState
                  title={stateTitle(section.state)}
                  description={section.lines.join(' ')}
                />
              </div>
            )}
            {slot ? <div className="mt-8">{slot}</div> : null}
            {section.links.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-4">
                {section.links.map((lane) => (
                  <li key={lane.href}>
                    <Link href={lane.href} className={linkClass}>
                      {lane.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </PageSection>
        );
      })}
    </div>
  );
}

export function pedidoPermissionCopy(kind: 'denied' | 'scopes_unconfirmed'): string {
  return PERMISSION_COPY[kind];
}
