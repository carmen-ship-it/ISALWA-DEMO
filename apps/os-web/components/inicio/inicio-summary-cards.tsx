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

const CARD_SURFACE: Record<
  InicioSummaryCardId,
  { panel: string; dot: 'urgent' | 'attention' | 'active' | 'neutral'; dotLabel: string }
> = {
  attention: {
    panel:
      'border-[color-mix(in_srgb,var(--isalwa-danger)_18%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-status-red-bg)_55%,var(--isalwa-white))]',
    dot: 'urgent',
    dotLabel: 'Prioridad alta',
  },
  today: {
    panel:
      'border-[color-mix(in_srgb,var(--isalwa-info)_16%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-sky-100)_70%,var(--isalwa-white))]',
    dot: 'active',
    dotLabel: 'Agenda de hoy',
  },
  approvals: {
    panel:
      'border-[color-mix(in_srgb,var(--isalwa-warning)_20%,var(--isalwa-mist))] bg-[var(--isalwa-status-amber-bg)]',
    dot: 'attention',
    dotLabel: 'Decisiones pendientes',
  },
  issues: {
    panel:
      'border-[color-mix(in_srgb,var(--isalwa-danger)_22%,var(--isalwa-mist))] bg-[var(--isalwa-status-red-bg)]',
    dot: 'urgent',
    dotLabel: 'Incidencias abiertas',
  },
};

export function InicioSummaryCards({ cards }: InicioSummaryCardsProps) {
  return (
    <section aria-label={INICIO_SUMMARY_KICKER} className="min-w-0 space-y-3">
      <p className="isalwa-kicker">{INICIO_SUMMARY_KICKER}</p>
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const surface = CARD_SURFACE[card.id];
          return (
            <Link key={card.id} href={card.href} className="min-w-0">
              <Panel
                interactive
                className={cx('h-full border p-4 md:p-5', surface.panel)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                    {card.label}
                  </p>
                  <AttentionDot tone={surface.dot} pulse={card.id === 'attention' || card.id === 'issues'} aria-label={surface.dotLabel} />
                </div>
                <p className="isalwa-metric mt-2 text-[clamp(22px,2vw,28px)] text-[var(--isalwa-kiln)]">
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
