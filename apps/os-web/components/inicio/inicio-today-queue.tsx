import Link from 'next/link';
import { OperatingRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import {
  TODAY_QUEUE_COPY,
  type TodayQueue,
} from '@/lib/inicio/today-queue';

type InicioTodayQueueProps = {
  queue: TodayQueue;
};

export function InicioTodayQueue({ queue }: InicioTodayQueueProps) {
  return (
    <PageSection
      card
      surface="attention"
      className="border-[color-mix(in_srgb,var(--isalwa-warning)_18%,var(--isalwa-mist))] p-3 shadow-[var(--isalwa-shadow-resting)] md:p-4"
      aria-label={TODAY_QUEUE_COPY.title}
    >
      <SectionHeader
        kicker={TODAY_QUEUE_COPY.kicker}
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
            {TODAY_QUEUE_COPY.title}
          </h2>
        }
        className="mb-2"
      />
      <p className="mb-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {TODAY_QUEUE_COPY.description}
      </p>

      {queue.nextAction ? (
        <div className="mb-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white/80 px-3 py-2">
          <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
            {TODAY_QUEUE_COPY.nextAction}
          </p>
          <Link
            href={queue.nextAction.href}
            className="mt-1 block text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
          >
            {queue.nextAction.title}
          </Link>
          {queue.nextAction.meta ? (
            <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]">{queue.nextAction.meta}</p>
          ) : null}
        </div>
      ) : null}

      {queue.empty ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {TODAY_QUEUE_COPY.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {queue.buckets.map((bucket) => (
            <div key={bucket.id}>
              <h3 className="mb-0.5 text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                {bucket.title}
              </h3>
              <ul className="min-w-0" aria-label={bucket.title}>
                {bucket.items.map((item) => (
                  <li key={item.id}>
                    <OperatingRow
                      className="py-tight !py-1"
                      href={item.href}
                      subject={item.title}
                      meta={item.meta}
                      status={
                        item.overdue ? (
                          <StatusPill tone="danger" className="shrink-0">
                            Vencido
                          </StatusPill>
                        ) : item.bucket === 'due_today' ? (
                          <StatusPill tone="warning" className="shrink-0">
                            Hoy
                          </StatusPill>
                        ) : null
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </PageSection>
  );
}
