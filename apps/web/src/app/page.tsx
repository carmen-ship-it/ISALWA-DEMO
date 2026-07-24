import Link from 'next/link';
import { ExperienceHeader, Panel } from '@isalwa/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 md:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="isalwa-enter">
          <div className="flex items-center gap-2">
            <span className="isalwa-alive-dot inline-block h-2.5 w-2.5 rounded-full bg-[var(--isalwa-glaze)]" />
            <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.16em] text-[var(--isalwa-glaze)] uppercase">
              ISALWA OS
            </p>
          </div>
          <h1
            className="mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] text-[var(--isalwa-kiln)]"
            style={{ fontFamily: 'var(--isalwa-font-display)' }}
          >
            El cuartel digital donde ISALWA decide más rápido.
          </h1>
          <p className="mt-5 max-w-xl text-[var(--isalwa-text-lg)] leading-relaxed text-[var(--isalwa-slate)]">
            Ocho minutos. Un pulso. Un cliente. Un precio. Un mapa. Una conversación. Sin módulos — con
            claridad.
          </p>
        </div>

        <Panel className="isalwa-enter isalwa-enter-delay-2 overflow-hidden p-0">
          <div className="grid md:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 md:p-8">
              <ExperienceHeader
                className="mb-0"
                kicker="Demo Journey"
                title="Empezar por el Pulso"
                subtitle="Minute 1: saber si el negocio está sano en diez segundos."
              />
              <Link
                href="/pulso"
                className="mt-6 inline-flex rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-5 py-2.5 text-[var(--isalwa-text-md)] font-medium text-white transition-colors hover:bg-[var(--isalwa-glaze-deep)]"
              >
                Abrir Pulso
              </Link>
            </div>
            <div className="border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,white)] p-6 md:border-t-0 md:border-l md:p-8">
              <p className="text-[var(--isalwa-text-sm)] font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
                Atajos
              </p>
              <ul className="mt-3 space-y-2 text-[var(--isalwa-text-md)]">
                {[
                  ['/radar', 'Radar — quién necesita atención'],
                  ['/personas', 'Personas — cuentas vivas'],
                  ['/territorio', 'Territorio — mapa'],
                  ['/cierre', 'Cierre — cotizar con memoria'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-[var(--isalwa-glaze-deep)] hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                En cualquier pantalla: <kbd className="rounded border border-[var(--isalwa-mist)] bg-white px-1.5 py-0.5 text-[11px]">⌘K</kbd>
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
