import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import type { SystemControls } from '@/lib/roles/homes';

type SystemControlsHomeProps = {
  controls: SystemControls;
};

/** Kept off the business home. No integration health on this surface. */
export function SystemControlsHome({ controls }: SystemControlsHomeProps) {
  return (
    <PageSection card className="min-w-0 p-5 md:p-6" aria-label={controls.label}>
      <p className="isalwa-kicker">Sistema</p>
      <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
        {controls.label}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Separado de la lectura de negocio.
      </p>
      <p className="mt-4">
        <Link href={controls.href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
          Abrir controles
        </Link>
      </p>
    </PageSection>
  );
}
