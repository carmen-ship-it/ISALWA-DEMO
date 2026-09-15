import type { ReactNode } from 'react';
import { StatusPill, cx } from '@isalwa/ui';
import { FOCUS_RING_CLASS } from '@/lib/a11y/focus';
import {
  statusLabelForSemantic,
  statusToneForSemantic,
  type StatusSemantic,
} from '@/lib/a11y/status-vocabulary';

export type AppToastTone = Extract<StatusSemantic, 'info' | 'warn' | 'success' | 'blocked' | 'pending'>;

export type AppToastProps = {
  tone: AppToastTone;
  title: string;
  detail?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

/**
 * Transient feedback toast. Live region is polite except for blocked (assertive).
 * Prefer Spanish copy from i18n states.toast* — never surface stack traces or codes.
 */
export function AppToast({
  tone,
  title,
  detail,
  onDismiss,
  dismissLabel = 'Cerrar',
  className,
}: AppToastProps) {
  const assertive = tone === 'blocked';
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      data-toast-tone={tone}
      className={cx(
        'flex w-full max-w-sm items-start gap-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-4 py-3 shadow-[var(--isalwa-shadow-soft)]',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <StatusPill tone={statusToneForSemantic(tone)}>{statusLabelForSemantic(tone)}</StatusPill>
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{title}</p>
        {detail ? <p className="text-xs leading-relaxed text-[var(--isalwa-slate)]">{detail}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={cx(
            'isalwa-t-fast shrink-0 rounded-[var(--isalwa-radius-control)] px-2 py-1 text-xs font-medium text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-mist)] hover:text-[var(--isalwa-kiln)]',
            FOCUS_RING_CLASS,
          )}
        >
          {dismissLabel}
        </button>
      ) : null}
    </div>
  );
}

export type AppToastRegionProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

/** Fixed corner region for toasts — keep z-index below command palette / drawers. */
export function AppToastRegion({
  children,
  label = 'Notificaciones',
  className,
}: AppToastRegionProps) {
  return (
    <div
      aria-label={label}
      className={cx(
        'pointer-events-none fixed bottom-4 right-4 z-40 flex w-[min(100vw-2rem,24rem)] flex-col gap-2',
        'max-[389px]:left-4 max-[389px]:right-4 max-[389px]:w-auto',
        className,
      )}
    >
      <div className="pointer-events-auto flex flex-col gap-2">{children}</div>
    </div>
  );
}
