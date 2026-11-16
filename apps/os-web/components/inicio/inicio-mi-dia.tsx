import Link from 'next/link';
import { Button, OperatingRow, PageSection, SectionHeader, StatusPill, cx } from '@isalwa/ui';
import { MI_DIA_EMPTY, type MiDiaRow } from '@/lib/inicio/mi-dia';
import { workDueRailClass } from '@/lib/work/due-visual';
import { SectionLoadFailed } from '@/components/states/section-load-failed';

type InicioMiDiaProps = {
  items: MiDiaRow[];
  /** At least one source failed to load: say so instead of showing a calm, empty day. */
  unavailable?: boolean;
};

export function InicioMiDia({ items, unavailable = false }: InicioMiDiaProps) {
  return (
    <PageSection card className="min-w-0 p-4 md:p-5" aria-label="Mi día">
      <SectionHeader
        kicker="Mi día"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
            Mi día
          </h2>
        }
        className="mb-2"
      />
      {items.length === 0 ? (
        unavailable ? null : (
          <p className="text-sm text-[var(--isalwa-slate)]" role="status">
            {MI_DIA_EMPTY}
          </p>
        )
      ) : (
        <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Mi día">
          {items.map((item) => (
            <li
              key={item.id}
              className={cx('list-none', item.overdue ? workDueRailClass('overdue') : undefined)}
            >
              <OperatingRow
                className="py-tight !py-2"
                href={item.href}
                subject={item.title}
                meta={[item.categoryLabel, item.meta].filter(Boolean).join(' · ')}
                status={
                  item.overdue ? (
                    <StatusPill tone="overdue" icon="attention" className="shrink-0">
                      Vencido
                    </StatusPill>
                  ) : item.bucket === 'due_today' ? (
                    <StatusPill tone="pending" icon="pending" className="shrink-0">
                      Hoy
                    </StatusPill>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
      {unavailable ? <SectionLoadFailed className="mt-3" /> : null}
      <div className="mt-3">
        <Link href="/trabajo" className="inline-flex">
          <Button type="button" variant="secondary" size="sm">
            Ver mi trabajo
          </Button>
        </Link>
      </div>
    </PageSection>
  );
}
