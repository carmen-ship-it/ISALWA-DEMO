import Link from 'next/link';
import { Panel, StatusPill } from '@isalwa/ui';
import type { PulseResponse } from '@isalwa/contracts';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

export default async function PulsoPage() {
  let pulse: PulseResponse | null = null;
  let error: string | null = null;
  try {
    pulse = await apiGet<PulseResponse>('/pulse');
  } catch {
    error = 'No se pudo cargar Pulso. ¿API y base de datos en línea?';
  }

  return (
    <AppShell active="/pulso">
      <main className="px-5 py-8 md:px-8">
        <header className="mb-8 max-w-3xl">
          <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.12em] text-[var(--isalwa-glaze)] uppercase">
            Pulso
          </p>
          <h1
            className="mt-2 text-[var(--isalwa-text-2xl)] text-[var(--isalwa-kiln)]"
            style={{ fontFamily: 'var(--isalwa-font-display)' }}
          >
            {pulse?.sentence ?? error ?? 'Cargando el pulso del negocio…'}
          </h1>
        </header>

        {pulse ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pulse.vitals.map((v) => (
                <Panel key={v.key} className="p-4">
                  <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{v.label}</p>
                  <p
                    className="mt-3 text-[var(--isalwa-text-xl)] text-[var(--isalwa-kiln)]"
                    style={{ fontFamily: 'var(--isalwa-font-mono)' }}
                  >
                    {v.valueLabel}
                  </p>
                  <p className="mt-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{v.hint}</p>
                </Panel>
              ))}
            </div>

            <Panel className="mt-6 p-5">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-[var(--isalwa-text-lg)] font-semibold">Necesitan atención</h2>
                <StatusPill tone="info">Radar vivo</StatusPill>
              </div>
              <ul className="space-y-2">
                {pulse.focus.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={f.href}
                      className="flex items-center justify-between rounded-[var(--isalwa-radius-control)] px-3 py-3 hover:bg-[var(--isalwa-porcelain)]"
                    >
                      <div>
                        <p className="font-medium">{f.title}</p>
                        <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{f.reason}</p>
                      </div>
                      <span
                        className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)]"
                        style={{ fontFamily: 'var(--isalwa-font-mono)' }}
                      >
                        {f.score}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        ) : (
          <Panel className="p-5 text-[var(--isalwa-slate)]">{error}</Panel>
        )}
      </main>
    </AppShell>
  );
}
