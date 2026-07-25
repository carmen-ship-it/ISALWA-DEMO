import type { ReactElement, ReactNode, SVGProps } from 'react';
import { cx } from '../lib/cx';

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
};

function IconBase({
  size = 16,
  className,
  title,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      className={cx('shrink-0', className)}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Map pin — field visit */
export function IconVisit(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 14s4.5-3.4 4.5-7A4.5 4.5 0 0 0 8 2.5 4.5 4.5 0 0 0 3.5 7c0 3.6 4.5 7 4.5 7Z" {...stroke} />
      <circle cx="8" cy="7" r="1.4" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Document — invoice */
export function IconInvoice(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 2.5h5.2L12.5 5.3V13.5H4.5V2.5Z" {...stroke} />
      <path d="M9.5 2.5V5.5H12.5" {...stroke} />
      <path d="M6.5 8.5h3.5M6.5 11h2.5" {...stroke} />
    </IconBase>
  );
}

/** Folded brief — quote */
export function IconQuote(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 4.5h7.5v9H3.5z" {...stroke} />
      <path d="M11 4.5 13.5 7v6.5H11" {...stroke} />
      <path d="M5.5 7.5h3.5M5.5 10h2.5" {...stroke} />
    </IconBase>
  );
}

/** Check in circle — payment */
export function IconPayment(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="5.5" {...stroke} />
      <path d="M5.5 8.2 7.2 9.9 10.5 6.3" {...stroke} />
    </IconBase>
  );
}

/** Package — order */
export function IconOrder(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 5.5 8 2.5l5.5 3v7L8 13.5l-5.5-3v-5Z" {...stroke} />
      <path d="M8 2.5v11M2.5 5.5 8 8.5l5.5-3" {...stroke} />
    </IconBase>
  );
}

/** Chat bubble — message / WhatsApp */
export function IconMessage(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M3.5 3.5h9a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H7l-2.5 2.5V10.5h-1a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z"
        {...stroke}
      />
    </IconBase>
  );
}

/** Neutral dot — fallback */
export function IconEventDefault(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="2.25" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Four-point spark — prediction / insight accent */
export function IconSpark(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 2.5 9.1 6.9 13.5 8 9.1 9.1 8 13.5 6.9 9.1 2.5 8l4.4-1.1L8 2.5Z" {...stroke} />
    </IconBase>
  );
}

export type CommercialEventIconKind =
  | 'visit'
  | 'invoice'
  | 'quote'
  | 'payment'
  | 'order'
  | 'message'
  | 'whatsapp'
  | 'default';

const KIND_MAP: Record<CommercialEventIconKind, (p: IconProps) => ReactElement> = {
  visit: IconVisit,
  invoice: IconInvoice,
  quote: IconQuote,
  payment: IconPayment,
  order: IconOrder,
  message: IconMessage,
  whatsapp: IconMessage,
  default: IconEventDefault,
};

/** Resolve a commercial event type prefix to a crisp stroke icon. */
export function CommercialEventIcon({
  kind,
  ...props
}: IconProps & { kind: CommercialEventIconKind }) {
  const Cmp = KIND_MAP[kind] ?? IconEventDefault;
  return <Cmp {...props} />;
}

export function resolveCommercialEventIconKind(type: string): CommercialEventIconKind {
  const t = type.toLowerCase();
  if (t.startsWith('visit')) return 'visit';
  if (t.startsWith('invoice')) return 'invoice';
  if (t.startsWith('quote')) return 'quote';
  if (t.startsWith('payment')) return 'payment';
  if (t.startsWith('order')) return 'order';
  if (t.startsWith('whatsapp') || t.startsWith('message')) return 'message';
  return 'default';
}
