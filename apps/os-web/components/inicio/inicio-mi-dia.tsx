import Link from 'next/link';
import { Button, OperatingRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { MI_DIA_EMPTY, type MiDiaRow } from '@/lib/inicio/mi-dia';

type InicioMiDiaProps = {
  items: MiDiaRow[];
};

export function InicioMiDia({ items }: InicioMiDiaProps) {
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
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {MI_DIA_EMPTY}
        </p>
      ) : (
        <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Mi día">
          {items.map((item) => (
            <li key={item.id} className="list-none">
              <OperatingRow
                className="py-tight !py-2"
                href={item.href}
                subject={item.title}
                meta={[item.categoryLabel, item.meta].filter(Boolean).join(' · ')}
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
      )}
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
