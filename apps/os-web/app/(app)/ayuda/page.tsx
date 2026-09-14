import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';

const RULES = [
  {
    title: 'Inicio',
    body: 'Inicio muestra lo que ya requiere su atención. No inventa urgencias ni plazos.',
  },
  {
    title: 'Buscar',
    body: 'Buscar encuentra clientes, oportunidades, cotizaciones y trabajo de su alcance. No crea registros.',
  },
  {
    title: 'Responsable',
    body: 'El responsable comercial es el miembro asignado. El cargo no asigna la cuenta ni autoriza convertir.',
  },
  {
    title: 'Aprobar',
    body: 'Aprobar registra la decisión. No crea un pedido.',
  },
  {
    title: 'Convertir',
    body: 'Convertir crea un pedido desde una cotización enviada. No emite factura ni nota de entrega.',
  },
  {
    title: 'Vista demo',
    body: 'Lo marcado Vista demo no está conectado. No es una cifra ni un pendiente de hoy. Se activará cuando exista la fuente real.',
  },
] as const;

export default function AyudaPage() {
  return (
    <PageContainer label="Cómo trabajamos">
      <PageHeader
        kicker="Ayuda"
        title="Cómo trabajamos"
        description="Reglas ya vigentes en ISALWA. No sustituyen una autorización ni un dato que aún no existe."
      />
      <PageSection>
        <SectionHeader title="Reglas" />
        <ul className="mt-4 divide-y divide-[var(--isalwa-mist)]">
          {RULES.map((rule) => (
            <li key={rule.title} className="py-4">
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{rule.title}</p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>
      </PageSection>
    </PageContainer>
  );
}
