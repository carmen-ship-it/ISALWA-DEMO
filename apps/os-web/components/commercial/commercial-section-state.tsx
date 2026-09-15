import type { ReactNode } from 'react';
import { EmptyState } from '@isalwa/ui';
import {
  AccessDeniedState,
  ServiceUnavailableState,
} from '@/components/states/app-states';
import type { FetchOutcome } from '@/lib/commercial/fetch-outcome';

type CommercialSectionStateProps<T> = {
  outcome: FetchOutcome<T>;
  emptyTitle: string;
  emptyDescription: string;
  /** Short honest example for real-pilot empty commercial nests (0 records). */
  emptyExample?: ReactNode;
  emptyAction?: ReactNode;
  children: (data: T) => ReactNode;
};

export function CommercialSectionState<T>({
  outcome,
  emptyTitle,
  emptyDescription,
  emptyExample,
  emptyAction,
  children,
}: CommercialSectionStateProps<T>) {
  switch (outcome.status) {
    case 'unavailable':
      return <ServiceUnavailableState />;
    case 'forbidden':
      return <AccessDeniedState />;
    case 'error':
      return (
        <div
          className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] p-4"
          role="alert"
        >
          <p className="text-sm text-[var(--isalwa-slate)]">{outcome.message}</p>
        </div>
      );
    case 'ok':
      if ('items' in (outcome.data as object)) {
        const list = outcome.data as { items: unknown[] };
        if (list.items.length === 0) {
          return (
            <EmptyState
              className="commercial-empty-nest"
              title={emptyTitle}
              description={emptyDescription}
              example={emptyExample}
              action={emptyAction}
            />
          );
        }
      }
      return <>{children(outcome.data)}</>;
    default:
      return null;
  }
}
