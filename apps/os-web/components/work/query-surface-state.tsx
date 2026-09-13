import type { QuerySurfaceError } from '@/lib/work/query-errors';
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
          className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-6"
          role="alert"
        >
          <p className="font-medium text-[var(--isalwa-kiln)]">No se pudo cargar la información</p>
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{error.message}</p>
        </div>
      );
  }
}
