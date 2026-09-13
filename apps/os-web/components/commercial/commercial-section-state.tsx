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
  children: (data: T) => ReactNode;
};

export function CommercialSectionState<T>({
  outcome,
  emptyTitle,
  emptyDescription,
  children,
}: CommercialSectionStateProps<T>) {
  switch (outcome.status) {
    case 'unavailable':
      return <ServiceUnavailableState />;
    case 'forbidden':
      return <AccessDeniedState />;
    case 'error':
      return (
        <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4" role="alert">
          <p className="text-sm text-[var(--isalwa-slate)]">{outcome.message}</p>
        </div>
      );
    case 'ok':
      if ('items' in (outcome.data as object)) {
        const list = outcome.data as { items: unknown[] };
        if (list.items.length === 0) {
          return <EmptyState title={emptyTitle} description={emptyDescription} />;
        }
      }
      return <>{children(outcome.data)}</>;
    default:
      return null;
  }
}
