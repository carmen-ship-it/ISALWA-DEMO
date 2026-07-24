import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';

export default function MemoriaPage() {
  return (
    <AppShell active="/memoria">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Memoria"
          title="Historias detrás de los números"
          subtitle="Memoria completa llega después de Auth. Hoy, cada dossier ya cuenta su propia historia."
        />
        <Panel className="p-6">
          <EmptyState
            title="Las historias viven en el cliente"
            description="Abra un dossier — la línea de tiempo, el briefing y la evidencia son Memoria en acción."
            action={
              <div className="flex flex-wrap gap-3">
                <Link href="/personas" className="text-[var(--isalwa-glaze)] hover:underline">
                  Ir a Personas
                </Link>
                <Link href="/pulso" className="text-[var(--isalwa-slate)] hover:underline">
                  Volver a Pulso
                </Link>
              </div>
            }
          />
        </Panel>
      </main>
    </AppShell>
  );
}
