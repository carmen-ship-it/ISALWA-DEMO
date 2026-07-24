import Link from 'next/link';
import { Panel } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';

export default function MemoriaPage() {
  return (
    <AppShell active="/memoria">
      <main className="px-5 py-8 md:px-8">
        <Panel className="max-w-2xl p-6">
          <h1 className="text-[var(--isalwa-text-xl)] font-semibold">Memoria</h1>
          <p className="mt-3 text-[var(--isalwa-slate)]">
            Las historias ejecutivas llegan en un milestone posterior. Mientras tanto, la memoria del cliente vive
            dentro de cada dossier (timeline + precios + visitas).
          </p>
          <Link href="/pulso" className="mt-4 inline-block text-[var(--isalwa-glaze)]">
            Volver a Pulso →
          </Link>
        </Panel>
      </main>
    </AppShell>
  );
}
