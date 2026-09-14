import { staffUnknownLoadMessage, type QuerySurfaceError } from '@/lib/work/query-errors';
import {
  AccessDeniedState,
  ServiceUnavailableState,
  SessionExpiredState,
} from '@/components/states/app-states';

type QuerySurfaceStateProps = {
  error: QuerySurfaceError;
};

export function QuerySurfaceState({ error }: QuerySurfaceStateProps) {
  switch (error.kind) {
    case 'unauthorized':
      return <SessionExpiredState />;
    case 'forbidden':
      return <AccessDeniedState />;
    case 'unavailable':
      return <ServiceUnavailableState />;
    default:
      return (
        <div
          className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] p-6"
          role="alert"
        >
          <p className="text-sm text-[var(--isalwa-kiln)]">{staffUnknownLoadMessage(error.message)}</p>
        </div>
      );
  }
}
