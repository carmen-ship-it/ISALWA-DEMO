import Link from 'next/link';
import { Panel, SectionHeader, StatusPill } from '@isalwa/ui';
import type { WhoHasTheBallView } from '@/lib/work/who-has-the-ball';
import { WHO_HAS_THE_BALL_COPY } from '@/lib/work/who-has-the-ball';

const linkClass =
  'isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline';

type WhoHasTheBallCardProps = {
  view: WhoHasTheBallView;
  /** When waiting on approval / external response — amber surface cue. */
  waiting?: boolean;
  /** When overdue — red surface cue (caller decides; never invent). */
  overdue?: boolean;
  className?: string;
  'data-tour'?: string;
};

/**
 * Responsibility / “quién tiene la pelota” — same Panel language as WhoToAskCard.
 * Renders only lines supplied by whoHasTheBallView; does not invent owners.
 */
export function WhoHasTheBallCard({
  view,
  waiting = false,
  overdue = false,
  className,
  'data-tour': dataTour = 'who-has-the-ball',
}: WhoHasTheBallCardProps) {
  const tone = overdue ? 'danger' : waiting ? 'warning' : 'neutral';
  const toneLabel = overdue ? 'Vencido' : waiting ? 'En espera' : 'Activo';

  return (
    <Panel padded className={className} data-tour={dataTour}>
      <SectionHeader
        kicker="Responsabilidad"
        title="Quién tiene la pelota"
        action={<StatusPill tone={tone}>{toneLabel}</StatusPill>}
        className="mb-3"
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
            Responsable
          </dt>
          <dd className="mt-1 text-sm text-[var(--isalwa-kiln)]">{view.principalLine}</dd>
        </div>
        {view.temporarySupportLine ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
              Apoyo
            </dt>
            <dd className="mt-1 text-sm text-[var(--isalwa-kiln)]">{view.temporarySupportLine}</dd>
          </div>
        ) : null}
        {view.waitingLine ? (
          <div
            className={
              waiting || overdue
                ? 'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-tint-amber-border)] bg-[var(--isalwa-tint-amber)] p-3 sm:col-span-2'
                : undefined
            }
          >
            <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
              {WHO_HAS_THE_BALL_COPY.waiting}
            </dt>
            <dd className="mt-1 text-sm text-[var(--isalwa-kiln)]">{view.waitingLine}</dd>
            {view.waitingOnLine ? (
              <dd className="mt-1 text-sm text-[var(--isalwa-slate)]">{view.waitingOnLine}</dd>
            ) : null}
          </div>
        ) : null}
        {view.nextSafeLine ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
              {WHO_HAS_THE_BALL_COPY.nextSafe}
            </dt>
            <dd className="mt-1 text-sm text-[var(--isalwa-kiln)]">{view.nextSafeLine}</dd>
          </div>
        ) : null}
      </dl>
      {view.requestHref && view.requestLabel ? (
        <p className="mt-3">
          <Link href={view.requestHref} className={linkClass}>
            {view.requestLabel}
          </Link>
        </p>
      ) : null}
    </Panel>
  );
}
