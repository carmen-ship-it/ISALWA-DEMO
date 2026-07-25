import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { cx } from '../lib/cx';
import { Panel } from './panel';
import { EmptyState } from './experience';

export type MetricCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
  interactive?: boolean;
  footer?: ReactNode;
};

export function MetricCard({
  label,
  value,
  hint,
  accent,
  interactive,
  footer,
  className,
  children,
  ...rest
}: MetricCardProps) {
  return (
    <Panel interactive={interactive} className={cx('flex h-full flex-col overflow-hidden p-0', className)} {...rest}>
      {accent ? (
        <span aria-hidden className="block h-0.5 shrink-0" style={{ background: accent }} />
      ) : null}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="isalwa-section-label">{label}</p>
        <div className="isalwa-metric mt-3 text-[clamp(20px,1.9vw,26px)]">{value}</div>
        {footer}
        {children}
        {hint ? (
          <p className="mt-3 text-[var(--isalwa-text-xs)] leading-relaxed text-[var(--isalwa-slate)]">{hint}</p>
        ) : null}
      </div>
    </Panel>
  );
}

export type StatGroupItem = {
  label: string;
  value: ReactNode;
  tone?: string;
};

export type StatGroupProps = {
  items: StatGroupItem[];
  className?: string;
};

export function StatGroup({ items, className }: StatGroupProps) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)} role="group">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-[88px] rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-3 py-2 shadow-[var(--isalwa-shadow-soft)]"
        >
          <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
            {item.label}
          </p>
          <p
            className="isalwa-metric mt-1 text-[var(--isalwa-text-md)]"
            style={item.tone ? { color: item.tone } : undefined}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export type ListRowProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  railColor?: string;
  as?: 'div' | 'li';
};

/** Premium inbox / history row chrome. Wrap with Next `<Link>` when navigable. */
export function ListRow({
  children,
  className,
  railColor,
  as = 'div',
  ...rest
}: ListRowProps) {
  const Comp = as;
  return (
    <Comp
      className={cx(
        'border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] last:border-b-0',
        className,
      )}
      {...rest}
    >
      <div className="isalwa-inbox-row group flex items-stretch">
        {railColor ? (
          <span
            aria-hidden
            className="my-3 w-[3px] shrink-0 rounded-r-[2px]"
            style={{ background: railColor, opacity: 0.9 }}
          />
        ) : null}
        <div className="flex flex-1 items-center justify-between gap-4 px-4 py-4 md:px-5">{children}</div>
      </div>
    </Comp>
  );
}

export type InsightCardProps = {
  children: ReactNode;
  className?: string;
};

export function InsightCard({ children, className }: InsightCardProps) {
  return (
    <blockquote
      className={cx(
        'isalwa-whisper m-0 border-l-[3px] border-[var(--isalwa-glaze)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_4%,white)] py-5 pr-6 pl-6',
        'rounded-r-[var(--isalwa-radius-panel)] shadow-[var(--isalwa-shadow-soft)]',
        'font-[var(--isalwa-font-display)] text-[clamp(15px,1.25vw,17px)] leading-[1.65] text-[var(--isalwa-kiln)] italic',
        className,
      )}
    >
      {children}
    </blockquote>
  );
}

export type TimelineItem = {
  id: string;
  label: string;
  tone?: string;
  meta?: ReactNode;
  body?: ReactNode;
};

export type TimelineProps = {
  items: TimelineItem[];
  className?: string;
  placeholder?: boolean;
};

export function Timeline({ items, className, placeholder }: TimelineProps) {
  return (
    <ol className={cx('relative m-0 list-none space-y-0 p-0', className)}>
      {items.map((step, i) => (
        <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
          {i < items.length - 1 ? (
            <span
              aria-hidden
              className="absolute top-3 left-[7px] h-[calc(100%-8px)] w-px bg-[var(--isalwa-mist)]"
            />
          ) : null}
          <span
            aria-hidden
            className="relative z-[1] mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-[var(--isalwa-shadow-soft)]"
            style={{ background: step.tone ?? 'var(--isalwa-glaze)' }}
          />
          <div className="min-w-0 flex-1">
            {placeholder ? (
              <>
                <div className="h-3 w-24 rounded-[var(--isalwa-radius-pill)] bg-[color-mix(in_srgb,var(--isalwa-mist)_70%,white)]" />
                <div className="mt-3 rounded-[var(--isalwa-radius-control)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] px-3 py-3">
                  <p className="text-[var(--isalwa-text-2xs)] font-medium tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">
                    {step.label}
                  </p>
                  <div className="mt-2 h-2 max-w-[180px] rounded-full bg-[var(--isalwa-mist)] opacity-60" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[var(--isalwa-text-sm)] font-semibold text-[var(--isalwa-kiln)]">{step.label}</p>
                  {step.meta}
                </div>
                {step.body ? (
                  <div className="mt-2 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
                    {step.body}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type SearchFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchField({ className, ...rest }: SearchFieldProps) {
  return <input className={cx('isalwa-field', className)} type={rest.type ?? 'search'} {...rest} />;
}

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function Chip({ active, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx('isalwa-chip', active && 'is-active', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export type EmptyPanelProps = {
  title: string;
  description?: string;
  example?: ReactNode;
  walkthrough?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function EmptyPanel({
  title,
  description,
  example,
  walkthrough,
  action,
  className,
  compact,
}: EmptyPanelProps) {
  if (compact) {
    return (
      <div className={cx('px-5 py-10 text-center md:px-6', className)}>
        <p className="text-[var(--isalwa-text-base)] font-semibold text-[var(--isalwa-kiln)]">{title}</p>
        {description ? (
          <p className="mx-auto mt-2 max-w-md text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
            {description}
          </p>
        ) : null}
        {example ? (
          <p className="mx-auto mt-3 max-w-md text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
            <span className="font-semibold text-[var(--isalwa-glaze)]">Ejemplo · </span>
            {example}
          </p>
        ) : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
        {walkthrough ? <div className="mt-3 text-[var(--isalwa-text-xs)]">{walkthrough}</div> : null}
      </div>
    );
  }
  return (
    <EmptyState
      title={title}
      description={description}
      example={example}
      walkthrough={walkthrough}
      action={action}
      className={className}
    />
  );
}
