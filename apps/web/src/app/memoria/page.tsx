import Link from 'next/link';
import { EmptyState, ExperienceHeader, PageContainer, Panel, Timeline } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';

const PREVIEWS = [
  {
    title: 'Briefing del asesor',
    body: 'Un párrafo que explica el momento del cliente — escrito como si un colega te lo contara.',
  },
  {
    title: 'Línea de tiempo',
    body: 'Visitas, cotizaciones, mensajes y pagos en un solo hilo. La historia, no el log.',
  },
  {
    title: 'Evidencia comercial',
    body: 'Precios recordados, facturas abiertas y la última promesa — listos para el siguiente paso.',
  },
] as const;

const TIMELINE = [
  { id: 'v', label: 'Visita', tone: 'var(--isalwa-glaze)' },
  { id: 'c', label: 'Cotización', tone: 'var(--isalwa-copper)' },
  { id: 'w', label: 'WhatsApp', tone: 'var(--isalwa-info)' },
  { id: 'p', label: 'Pago', tone: 'var(--isalwa-success)' },
] as const;

export default function MemoriaPage() {
  return (
    <AppShell active="/memoria">
      <PageContainer label="Memoria">
        <ExperienceHeader
          kicker="Memoria"
          title="Historias detrás de los números"
          subtitle="Memoria completa llega después de Auth. Hoy, cada dossier ya cuenta su propia historia."
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel className="overflow-hidden p-0">
            <div className="border-b border-[var(--isalwa-mist)] px-5 py-5 md:px-6 md:py-6">
              <p className="isalwa-section-label">Cómo se siente</p>
              <h2
                className="mt-2 text-[clamp(1.25rem,2vw,1.6rem)] leading-snug text-[var(--isalwa-kiln)]"
                style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', fontWeight: 400 }}
              >
                Una memoria viva, no un archivo muerto.
              </h2>
              <p className="mt-3 max-w-xl text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
                Abra un cliente en Personas. El dossier ya concentra briefing, timeline y evidencia — Memoria en
                acción.
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-3 md:p-6">
              {PREVIEWS.map((card, idx) => (
                <div
                  key={card.title}
                  className={`isalwa-enter isalwa-enter-delay-${idx + 1} rounded-[var(--isalwa-radius-control)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_65%,white)] p-4`}
                >
                  <p className="text-[var(--isalwa-text-sm)] font-semibold text-[var(--isalwa-kiln)]">{card.title}</p>
                  <p className="mt-2 text-[var(--isalwa-text-xs)] leading-relaxed text-[var(--isalwa-slate)]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--isalwa-mist)] px-5 py-5 md:px-6">
              <EmptyState
                className="border-0 bg-transparent p-0"
                title="Las historias viven en el cliente"
                description="No inventamos datos aquí. Continúe en Personas — ahí la memoria ya late: briefing, timeline y evidencia en un solo hilo."
                example="Visita → cotización → WhatsApp → pago, narrado como un colega, no como un log."
                walkthrough={
                  <span>Cuando Auth llegue, Memoria tendrá su propia vista global. Hoy el dossier es la memoria.</span>
                }
                action={
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href="/personas"
                      className="rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-4 py-2.5 text-[var(--isalwa-text-sm)] font-medium text-white transition-[background-color,transform] duration-[var(--isalwa-motion-fast)] hover:bg-[var(--isalwa-glaze-deep)] active:scale-[0.98]"
                    >
                      Ir a Personas →
                    </Link>
                    <Link
                      href="/pulso"
                      className="px-2 py-2.5 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
                    >
                      Volver a Pulso
                    </Link>
                  </div>
                }
              />
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <p className="isalwa-section-label">Vista previa</p>
            <p className="mt-2 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
              Así se leerá una línea de tiempo cuando Memoria tenga su propio hogar.
            </p>
            <Timeline className="mt-8" items={[...TIMELINE]} placeholder />
          </Panel>
        </div>
      </PageContainer>
    </AppShell>
  );
}
