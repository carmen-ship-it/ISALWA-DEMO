import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx, StatusPill } from '@isalwa/ui';

const linkClass =
  'text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline';

export type ProximoPasoStripProps = {
  /** Heading label — caller supplies registered vs empty copy. */
  heading: string;
  /** Deterministic statement; never invent work. */
  text: string;
  href?: string | null;
  dueText?: string | null;
  overdue?: boolean;
  /** Optional tertiary control (e.g. schedule follow-up). */
  trailing?: ReactNode;
  className?: string;
  'data-tour'?: string;
};

/**
 * Reusable PRÓXIMO PASO / siguiente paso strip shell.
 * Sky context band by default; amber attention when overdue.
 * Accepts only deterministic props — does not invent actions.
 */
export function ProximoPasoStrip({
  heading,
  text,
  href = null,
  dueText = null,
  overdue = false,
  trailing,
  className,
  'data-tour': dataTour,
}: ProximoPasoStripProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--isalwa-radius-panel)] border px-4 py-3 shadow-[var(--isalwa-shadow-soft)]',
        overdue
          ? 'border-[var(--isalwa-tint-amber-border)] bg-[var(--isalwa-surface-attention)]'
          : 'border-[color-mix(in_srgb,var(--isalwa-sky-200)_80%,var(--isalwa-mist))] bg-[var(--isalwa-surface-context)]',
        className,
      )}
      data-tour={dataTour}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="isalwa-section-label">{heading}</p>
        {overdue ? <StatusPill tone="danger">Vencido</StatusPill> : null}
        {!overdue && dueText ? <StatusPill tone="warning">Pendiente</StatusPill> : null}
      </div>
      <p className="mt-1.5 font-[family-name:var(--isalwa-font-display)] text-base italic leading-snug text-[var(--isalwa-kiln)] md:text-lg">
        {href ? (
          <Link href={href} className="text-[var(--isalwa-kiln)] underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--isalwa-slate)]">
        {dueText ? <span>{dueText}</span> : null}
        {trailing ? <span className="text-[var(--isalwa-kiln)]">{trailing}</span> : null}
        {href ? (
          <Link href={href} className={linkClass}>
            Abrir
          </Link>
        ) : null}
      </div>
    </div>
  );
}
