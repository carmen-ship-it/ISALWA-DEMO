import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { WalkthroughHelpPanel } from '@/components/walkthrough/walkthrough-help-panel';
import { PageHeader } from '@/components/shell/page-header';
import { ayudaSections } from '@/lib/guidance/select';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

export default function AyudaPage() {
  const sections = ayudaSections();
  const standing = sections.find((section) => section.id === 'standing-rules');
  const workflows = sections.filter((section) => section.id !== 'standing-rules');

  return (
    <PageContainer label="Cómo trabajamos" data-tour={TOUR_TARGET.help}>
      <PageHeader
        kicker="Ayuda"
        title="Cómo trabajamos"
        description="Reglas ya vigentes en ISALWA. No sustituyen una autorización ni un dato que aún no existe."
      />

      <div className="space-y-8">
        <div
          className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_72%,white)] p-1 shadow-[var(--isalwa-shadow-soft)]"
          data-guide-replay="ayuda"
        >
          <div className="rounded-[calc(var(--isalwa-radius-panel)-2px)] bg-white/90 [&_[data-guide-replay]]:mb-0">
            <WalkthroughHelpPanel />
          </div>
        </div>

        <div className="space-y-6">
          {workflows.map((section) => (
            <PageSection
              key={section.id}
              card
              className="bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6"
              aria-labelledby={`guidance-${section.id}`}
            >
              <h2 id={`guidance-${section.id}`} className="isalwa-section-label">
                {section.title}
              </h2>
              <div className="mt-4">
                <GuidanceNotes notes={section.notes} />
              </div>
            </PageSection>
          ))}
        </div>

        {standing ? (
          <PageSection card className="p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6">
            <SectionHeader title={standing.title} />
            <div className="mt-4">
              <GuidanceNotes notes={standing.notes} />
            </div>
          </PageSection>
        ) : null}
      </div>
    </PageContainer>
  );
}
