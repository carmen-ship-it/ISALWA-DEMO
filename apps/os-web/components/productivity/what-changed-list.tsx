import { SectionHeader } from '@isalwa/ui';
import type { WhatChangedItem } from '@/lib/productivity/what-changed';

type WhatChangedListProps = {
  customer: string;
  items: WhatChangedItem[];
  partial: boolean;
  onNavigate: (href: string) => void;
};

export function WhatChangedList({ customer, items, partial, onNavigate }: WhatChangedListProps) {
  return (
    <div className="px-3 py-3">
      <SectionHeader kicker="Qué cambió" title={customer} />
      <p className="mb-3 text-sm text-[var(--isalwa-slate)]">
        Hechos del historial autorizado. No infiere un compromiso cumplido ni un cambio que el evento no registra.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-slate)]">
          No hay cambios de cotización, aprobación, trabajo, responsable o pedido en el historial consultado.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--isalwa-mist)]">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full flex-col rounded-[var(--isalwa-radius-control)] px-1 py-2.5 text-left outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] hover:bg-[var(--isalwa-porcelain)]"
                onClick={() => onNavigate(item.href)}
              >
                <span className="text-sm font-medium text-[var(--isalwa-kiln)]">{item.label}</span>
                <span className="text-sm text-[var(--isalwa-slate)]">
                  {[item.when, item.detail].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {partial ? (
        <p className="mt-3 text-sm text-[var(--isalwa-slate)]">El historial continúa. Esto no es el registro completo.</p>
      ) : null}
    </div>
  );
}
