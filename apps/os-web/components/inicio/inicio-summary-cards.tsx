import Link from 'next/link';
import { AttentionDot, Panel, cx } from '@isalwa/ui';
import type { InicioSummaryCard, InicioSummaryCardId } from '@/lib/inicio/summary-cards';
import { INICIO_SUMMARY_KICKER } from '@/lib/inicio/summary-cards';

type InicioSummaryCardsProps = {
  cards: InicioSummaryCard[];
};

function displayCount(count: number | null): string {
  if (count === null) return '—';
  return String(count);
}

function cardSurface(id: InicioSummaryCardId, count: number | null): {
  panel: string;
  value: string;
  dot: 'urgent' | 'attention' | 'active' | 'neutral';
  pulse: boolean;
  dotLabel: string;
} {
  const nonzero = typeof count === 'number' && count > 0;
  const base = 'border bg-white';
  switch (id) {
    case 'attention':
      return {
        panel: nonzero
          ? `${base} border-[color-mix(in_srgb,var(--isalwa-danger)_28%,var(--isalwa-mist))]`
          : `${base} border-[var(--isalwa-mist)]`,
        value: nonzero ? 'text-[var(--isalwa-danger)]' : 'text-[var(--isalwa-kiln)]',
        dot: nonzero ? 'urgent' : 'neutral',
        pulse: nonzero,
        dotLabel: 'Prioridad alta',
      };
    case 'today':
      return {
        panel: `${base} border-[color-mix(in_srgb,var(--isalwa-sky)_70%,var(--isalwa-mist))]`,
        value: 'text-[var(--isalwa-kiln)]',
        dot: 'active',
        pulse: false,
        dotLabel: 'Agenda de hoy',
      };
    case 'approvals':
      return {
        panel: nonzero
          ? `${base} border-[var(--isalwa-status-amber-2)]`
          : `${base} border-[var(--isalwa-mist)]`,
        value: 'text-[var(--isalwa-kiln)]',
        dot: nonzero ? 'attention' : 'neutral',
        pulse: false,
        dotLabel: 'Decisiones pendientes',
      };
    case 'issues':
      return {
        panel: nonzero
          ? `${base} border-[color-mix(in_srgb,var(--isalwa-danger)_28%,var(--isalwa-mist))]`
          : `${base} border-[var(--isalwa-mist)]`,
        value: nonzero ? 'text-[var(--isalwa-danger)]' : 'text-[var(--isalwa-kiln)]',
        dot: nonzero ? 'urgent' : 'neutral',
        pulse: nonzero,
        dotLabel: 'Incidencias abiertas',
      };
  }
}

export function InicioSummaryCards({ cards }: InicioSummaryCardsProps) {
  return (
    <section aria-label={INICIO_SUMMARY_KICKER} className="min-w-0 space-y-3">
      <p className="isalwa-kicker">{INICIO_SUMMARY_KICKER}</p>
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const surface = cardSurface(card.id, card.count);
          return (
            <Link key={card.id} href={card.href} className="min-w-0">
              <Panel
                interactive
                className={cx('h-full p-4 md:p-5', surface.panel)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                    {card.label}
                  </p>
                  <AttentionDot tone={surface.dot} pulse={surface.pulse} aria-label={surface.dotLabel} />
                </div>
                <p className={cx('isalwa-metric mt-2 text-[clamp(22px,2vw,28px)]', surface.value)}>
                  {displayCount(card.count)}
                </p>
              </Panel>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
