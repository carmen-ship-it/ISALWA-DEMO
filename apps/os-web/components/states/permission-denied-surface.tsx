import Link from 'next/link';
import { Button, EmptyState, StatusPill } from '@isalwa/ui';

type PermissionDeniedSurfaceProps = {
  title: string;
  kicker?: string;
  explanation?: string;
  backHref?: string;
  backLabel?: string;
};

/**
 * Action-level denial (e.g. create client) — clear title, short human copy, safe return.
 * Does not expose provider/scope/permission-key terminology.
 */
export function PermissionDeniedSurface({
  title = 'No puede realizar esta acción',
  kicker = 'Acceso',
  explanation = 'Su acceso actual permite consultar, pero no realizar esta acción.',
  backHref = '/inicio',
  backLabel = 'Volver',
}: PermissionDeniedSurfaceProps) {
  return (
    <div role="status" className="w-full max-w-lg">
      <p className="isalwa-kicker">{kicker}</p>
      <EmptyState
        title={title}
        description={explanation}
        action={
          <div className="flex flex-col items-start gap-4">
            <StatusPill tone="info">Solo lectura</StatusPill>
            <Link href={backHref} className="inline-flex">
              <Button type="button" variant="primary">
                {backLabel}
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
