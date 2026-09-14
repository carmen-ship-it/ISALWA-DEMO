import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { PageHeader } from '@/components/shell/page-header';
import { ayudaSections } from '@/lib/guidance/select';

export default function AyudaPage() {
  const sections = ayudaSections();
  const standing = sections.find((section) => section.id === 'standing-rules');
  const workflows = sections.filter((section) => section.id !== 'standing-rules');

  return (
    <PageContainer label="Cómo trabajamos">
      <PageHeader
        kicker="Ayuda"
        title="Cómo trabajamos"
        description="Reglas ya vigentes en ISALWA. No sustituyen una autorización ni un dato que aún no existe."
      />
      <div className="mb-8 space-y-8">
        {workflows.map((section) => (
          <section key={section.id} aria-labelledby={`guidance-${section.id}`}>
            <h2 id={`guidance-${section.id}`} className="isalwa-section-label">
              {section.title}
            </h2>
            <div className="mt-3">
              <GuidanceNotes notes={section.notes} />
            </div>
          </section>
        ))}
      </div>
      {standing ? (
        <PageSection>
          <SectionHeader title={standing.title} />
          <div className="mt-4">
            <GuidanceNotes notes={standing.notes} />
          </div>
        </PageSection>
      ) : null}
    </PageContainer>
  );
}
