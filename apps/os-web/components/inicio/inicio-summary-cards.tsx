import Link from 'next/link';
import { Panel } from '@isalwa/ui';
import type { InicioSummaryCard } from '@/lib/inicio/summary-cards';
import { INICIO_SUMMARY_KICKER } from '@/lib/inicio/summary-cards';

type InicioSummaryCardsProps = {
  cards: InicioSummaryCard[];
};

function displayCount(count: number | null): string {
  if (count === null) return '—';
  return String(count);
}

export function InicioSummaryCards({ cards }: InicioSummaryCardsProps) {
  return (
    <section aria-label={INICIO_SUMMARY_KICKER} className="min-w-0 space-y-3">
      <p className="isalwa-kicker">{INICIO_SUMMARY_KICKER}</p>
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.id} href={card.href} className="min-w-0">
            <Panel interactive className="h-full p-4 md:p-5">
              <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                {card.label}
              </p>
              <p className="isalwa-metric mt-2 text-[clamp(22px,2vw,28px)] text-[var(--isalwa-kiln)]">
                {displayCount(card.count)}
              </p>
            </Panel>
          </Link>
        ))}
      </div>
    </section>
  );
}
