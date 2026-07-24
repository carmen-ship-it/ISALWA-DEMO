import Link from 'next/link';
import { Panel } from '@isalwa/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 md:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.14em] text-[var(--isalwa-glaze)] uppercase">
            ISALWA OS
          </p>
          <h1
            className="mt-3 text-[var(--isalwa-text-3xl)] leading-tight text-[var(--isalwa-kiln)]"
            style={{ fontFamily: 'var(--isalwa-font-display)' }}
          >
            El sistema operativo comercial de ISALWA
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--isalwa-slate)]">
            Ocho minutos para entender el negocio: pulso, riesgo, clientes vivos, mapa, WhatsApp y precios con
            memoria — todo desde el mismo modelo de datos.
          </p>
        </div>

        <Panel className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[var(--isalwa-text-lg)] font-semibold">Comenzar el recorrido</h2>
              <p className="mt-1 text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
                Minute 1 del Demo Journey: Pulso.
              </p>
            </div>
            <Link
              href="/pulso"
              className="inline-flex items-center justify-center rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-4 py-2 text-[var(--isalwa-text-md)] font-medium text-[var(--isalwa-white)] transition-colors hover:bg-[var(--isalwa-glaze-deep)]"
            >
              Abrir Pulso
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  );
}
