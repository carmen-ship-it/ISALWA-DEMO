import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type StatusPillIcon = 'success' | 'attention' | 'pending' | 'progress' | 'rejected' | 'none';

export type StatusPillTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'manual'
  | 'demo'
  | 'draft'
  | 'neutral-sky'
  | 'open'
  | 'active'
  | 'soft-teal'
  | 'in_progress'
  | 'sky'
  | 'pending'
  | 'amber'
  | 'overdue'
  | 'rejected'
  | 'approved'
  | 'completed'
  | 'green'
  | 'cancelled'
  | 'muted';

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusPillTone;
  icon?: StatusPillIcon;
  children: ReactNode;
};

/**
 * Approved palette only (tokens.css):
 * neutral/info → sky / porcelain · active → soft teal · attention → amber
 * success → green · danger → red
 */
const tones: Record<StatusPillTone, string> = {
  neutral: 'bg-[var(--isalwa-mist)] text-[var(--isalwa-slate)]',
  success: 'bg-[color-mix(in_srgb,var(--isalwa-success)_12%,white)] text-[var(--isalwa-success)]',
  warning: 'bg-[color-mix(in_srgb,var(--isalwa-warning)_12%,white)] text-[var(--isalwa-warning)]',
  danger: 'bg-[color-mix(in_srgb,var(--isalwa-danger)_10%,white)] text-[var(--isalwa-danger)]',
  info: 'bg-[color-mix(in_srgb,var(--isalwa-info)_10%,white)] text-[var(--isalwa-info)]',
  /** User-reported fact. Beige, not a system confirmation. */
  manual:
    'bg-[color-mix(in_srgb,var(--isalwa-copper)_16%,white)] text-[color-mix(in_srgb,var(--isalwa-copper)_55%,var(--isalwa-kiln))]',
  /** Not connected. Muted and dashed so it cannot be read as live truth. */
  demo: 'border border-dashed border-[var(--isalwa-slate)] bg-transparent text-[var(--isalwa-slate)]',
  draft: 'bg-[var(--isalwa-sky)] text-[var(--isalwa-info)]',
  'neutral-sky': 'bg-[var(--isalwa-sky)] text-[var(--isalwa-slate)]',
  open: 'bg-[var(--isalwa-soft-teal)] text-[var(--isalwa-glaze-deep)]',
  active: 'bg-[var(--isalwa-soft-teal)] text-[var(--isalwa-glaze-deep)]',
  'soft-teal': 'bg-[var(--isalwa-soft-teal)] text-[var(--isalwa-glaze-deep)]',
  /** ACTIVE / IN PROGRESS — soft teal, never success green. */
  in_progress: 'bg-[var(--isalwa-soft-teal)] text-[var(--isalwa-glaze-deep)]',
  sky: 'bg-[var(--isalwa-sky)] text-[var(--isalwa-info)]',
  pending: 'bg-[var(--isalwa-status-amber-bg)] text-[var(--isalwa-warning)]',
  amber: 'bg-[var(--isalwa-status-amber-bg)] text-[var(--isalwa-warning)]',
  overdue: 'bg-[var(--isalwa-status-red-bg)] text-[var(--isalwa-danger)]',
  rejected: 'bg-[var(--isalwa-status-red-bg)] text-[var(--isalwa-danger)]',
  approved: 'bg-[var(--isalwa-status-green-bg)] text-[var(--isalwa-success)]',
  completed: 'bg-[var(--isalwa-status-green-bg)] text-[var(--isalwa-success)]',
  green: 'bg-[var(--isalwa-status-green-bg)] text-[var(--isalwa-success)]',
  cancelled: 'bg-[var(--isalwa-tint-gray)] text-[var(--isalwa-tint-gray-ink)]',
  muted: 'bg-[var(--isalwa-tint-gray)] text-[var(--isalwa-tint-gray-ink)]',
};

/**
 * Default glyphs by tone. Never use `progress` (plus/cross) for status —
 * it reads as a create/expand affordance (+ Abierta).
 */
const DEFAULT_ICON: Partial<Record<StatusPillTone, StatusPillIcon>> = {
  success: 'success',
  warning: 'attention',
  danger: 'rejected',
  draft: 'none',
  'neutral-sky': 'none',
  open: 'none',
  active: 'none',
  'soft-teal': 'none',
  in_progress: 'pending',
  sky: 'none',
  pending: 'pending',
  amber: 'pending',
  overdue: 'attention',
  rejected: 'rejected',
  approved: 'success',
  completed: 'success',
  green: 'success',
  cancelled: 'none',
  muted: 'none',
};

function StatusPillGlyph({ kind }: { kind: Exclude<StatusPillIcon, 'none'> }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 12 12',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
    className: 'shrink-0',
  };
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (kind) {
    case 'success':
      return (
        <svg {...common}>
          <path d="M2.5 6.2 4.8 8.5 9.5 3.8" {...stroke} />
        </svg>
      );
    case 'attention':
      return (
        <svg {...common}>
          <path d="M6 2.5v4.2M6 9h.01" {...stroke} />
        </svg>
      );
    case 'pending':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.2" {...stroke} />
          <path d="M6 3.8V6l1.6 1.6" {...stroke} />
        </svg>
      );
    case 'progress':
      // Plus/cross — reserved for genuine create/add UI, not status presentation.
      return (
        <svg {...common}>
          <path d="M2.5 6h5.2M6 2.8v6.4" {...stroke} />
        </svg>
      );
    case 'rejected':
      return (
        <svg {...common}>
          <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Human-visible Spanish labels → semantic StatusPill tones.
 * Families: neutral · active · attention · success · danger
 * Open/active ≠ success.
 */
const LABEL_TONE_MAP: Record<string, StatusPillTone> = {
  // NEUTRAL / INFORMATIONAL
  borrador: 'draft',
  'sin fecha': 'neutral-sky',
  'sin revisión abierta': 'neutral-sky',
  'registro interno': 'neutral-sky',
  'sin número': 'neutral-sky',
  'sin número oficial': 'neutral-sky',
  // ACTIVE / IN PROGRESS
  abierta: 'open',
  abierto: 'open',
  activa: 'active',
  activo: 'active',
  'en curso': 'in_progress',
  'en progreso': 'in_progress',
  registrado: 'open',
  registrada: 'open',
  enviada: 'in_progress',
  enviado: 'in_progress',
  // ATTENTION / WAITING
  pendiente: 'pending',
  'actualización solicitada': 'pending',
  'revisión de producción': 'pending',
  'revisión de almacén': 'pending',
  'revisión de abastecimiento': 'pending',
  'requiere revisión': 'pending',
  // SUCCESS / COMPLETE
  aceptada: 'approved',
  aceptado: 'approved',
  aprobada: 'approved',
  aprobado: 'approved',
  completado: 'completed',
  completada: 'completed',
  emitida: 'completed',
  emitido: 'completed',
  entregada: 'completed',
  entregado: 'completed',
  'salida registrada': 'completed',
  ganada: 'approved',
  // DANGER / PROBLEM
  vencido: 'overdue',
  vencida: 'overdue',
  rechazada: 'rejected',
  rechazado: 'rejected',
  perdida: 'rejected',
  perdido: 'rejected',
  cancelada: 'cancelled',
  cancelado: 'cancelled',
};

/** Map common Spanish workflow labels to semantic StatusPill tones. */
export function statusToneFromLabel(label: string): StatusPillTone {
  const key = label.trim().toLowerCase();
  return LABEL_TONE_MAP[key] ?? 'neutral';
}

/** Tones that must never default to the decorative progress (+) glyph. */
export const STATUS_TONES_WITHOUT_PLUS: readonly StatusPillTone[] = [
  'open',
  'active',
  'soft-teal',
  'in_progress',
  'sky',
  'draft',
  'neutral-sky',
  'pending',
  'amber',
  'neutral',
  'info',
  'manual',
  'demo',
  'cancelled',
  'muted',
];

function resolveIcon(tone: StatusPillTone, icon: StatusPillIcon | undefined): StatusPillIcon {
  if (icon !== undefined) return icon;
  return DEFAULT_ICON[tone] ?? 'none';
}

export function StatusPill({
  tone = 'neutral',
  icon,
  className,
  children,
  ...rest
}: StatusPillProps) {
  const resolvedIcon = resolveIcon(tone, icon);

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-[var(--isalwa-radius-control)] px-2.5 py-1',
        'text-[var(--isalwa-text-2xs)] font-medium tracking-[0.02em]',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {resolvedIcon !== 'none' ? <StatusPillGlyph kind={resolvedIcon} /> : null}
      {children}
    </span>
  );
}
