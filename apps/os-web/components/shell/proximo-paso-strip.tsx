import Link from 'next/link';
import type { ReactNode } from 'react';

const linkClass = 'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline';

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
      className={
        className ??
        'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-surface-context)] px-3 py-2 text-sm text-[var(--isalwa-kiln)]'
      }
      data-tour={dataTour}
    >
      <span className="font-medium">{heading}</span>
      {' · '}
      {href ? (
        <Link href={href} className={linkClass}>
          {text}
        </Link>
      ) : (
        <span>{text}</span>
      )}
      {dueText ? <span className="text-[var(--isalwa-slate)]"> · {dueText}</span> : null}
      {overdue ? <span className="text-[var(--isalwa-danger)]"> · Vencido</span> : null}
      {trailing ? <> · {trailing}</> : null}
    </div>
  );
}
