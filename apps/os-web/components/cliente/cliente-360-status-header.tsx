import Link from 'next/link';
import { StatGroup } from '@isalwa/ui';
import type { Cliente360StatusField, Cliente360StatusHeaderModel } from '@/lib/cliente/status-header';

const linkClass =
  'text-[inherit] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type StatFill = 'attention' | 'danger' | 'neutral';

function fieldFill(field: Cliente360StatusField): StatFill | undefined {
  if (field.state === 'unavailable') return 'danger';
  if (field.state === 'absent') return 'neutral';
  if (field.overdue) return 'attention';
  if (typeof field.count === 'number' && field.count > 0) return 'danger';
  return undefined;
}

function fieldValue(field: Cliente360StatusField) {
  if (field.href && field.state !== 'unavailable') {
    return (
      <Link href={field.href} className={linkClass}>
        {field.text}
      </Link>
    );
  }
  return field.text;
}

type Cliente360StatusHeaderProps = {
  model: Cliente360StatusHeaderModel;
};

/**
 * Owner, last attention and open issues above the tabs.
 * Next step stays in ProximoPasoStrip (same sticky band).
 */
export function Cliente360StatusHeader({ model }: Cliente360StatusHeaderProps) {
  const items = [model.owner, model.lastAttention, model.openIssues].map((field) => ({
    label: field.label,
    value: fieldValue(field),
    fill: fieldFill(field),
    tone:
      field.state === 'unavailable'
        ? 'var(--isalwa-danger)'
        : field.state === 'absent'
          ? 'var(--isalwa-slate)'
          : undefined,
  }));

  return (
    <div data-tour="cliente360-status-header" aria-label="Estado del cliente">
      <StatGroup items={items} />
    </div>
  );
}
