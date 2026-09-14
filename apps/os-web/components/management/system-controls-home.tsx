import Link from 'next/link';
import { EmptyState, PageSection } from '@isalwa/ui';
import type { SystemControls, TechnicalControl } from '@/lib/roles/homes';

type SystemControlsHomeProps = {
  controls: SystemControls;
};

function ControlRow({ control }: { control: TechnicalControl }) {
  if (!control.href) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{control.label}</h3>
        <EmptyState className="mt-2" title="No disponible" description={control.unavailable ?? 'No disponible'} />
      </div>
    );
  }
  return (
    <p className="mt-4">
      <Link href={control.href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
        {control.label}
      </Link>
    </p>
  );
}

/** Separate from the business home. No live integration or health figure. */
export function SystemControlsHome({ controls }: SystemControlsHomeProps) {
  return (
    <PageSection card className="min-w-0 p-5 md:p-6" aria-label={controls.label}>
      <p className="isalwa-kicker">Sistema</p>
      <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
        {controls.label}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Separado de la lectura de negocio. Acceso, capacidades y lo que aún no tiene ruta.
      </p>
      <p className="mt-4">
        <Link href={controls.href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
          Abrir controles
        </Link>
      </p>
      {controls.controls.map((control) => (
        <ControlRow key={control.id} control={control} />
      ))}
    </PageSection>
  );
}
