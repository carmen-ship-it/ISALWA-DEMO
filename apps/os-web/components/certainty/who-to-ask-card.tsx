import { Button, Panel } from '@isalwa/ui';
import { WHO_TO_ASK_COPY, whoToAskView, type WhoToAskInput } from '@/lib/certainty';

type WhoToAskCardProps = WhoToAskInput & {
  onAssign?: () => void;
  onRequestUpdate?: () => void;
  className?: string;
};

export function WhoToAskCard({
  responsible,
  canAssignResponsible,
  canRequestUpdate,
  onAssign,
  onRequestUpdate,
  className,
}: WhoToAskCardProps) {
  const view = whoToAskView({ responsible, canAssignResponsible, canRequestUpdate });

  if (view.kind === 'assigned') {
    return (
      <Panel className={className} data-who-to-ask="assigned">
        <p className="text-[var(--isalwa-text-2xs)] font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
          {view.kicker}
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">{view.name}</p>
        {view.teamLabel ? (
          <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]">{view.teamLabel}</p>
        ) : null}
        {view.requestUpdateLabel && onRequestUpdate ? (
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={onRequestUpdate}>
              {view.requestUpdateLabel}
            </Button>
          </div>
        ) : null}
      </Panel>
    );
  }

  return (
    <Panel className={className} data-who-to-ask="absent">
      <p className="text-sm text-[var(--isalwa-slate)]">{view.message}</p>
      {view.assignLabel && onAssign ? (
        <div className="mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={onAssign}>
            {WHO_TO_ASK_COPY.assign}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
