import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { WalkthroughHelpPanel } from '@/components/walkthrough/walkthrough-help-panel';
import { PageHeader } from '@/components/shell/page-header';
import { ayudaSections, employeeAdminHelpSection } from '@/lib/guidance/select';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

export default function AyudaPage() {
  const sections = ayudaSections();
  const standing = sections.find((section) => section.id === 'standing-rules');
  const access = sections.find((section) => section.id === 'access-explanation');
  const glossary = sections.find((section) => section.id === 'glossary-short');
  const workflows = sections.filter(
    (section) =>
      section.id !== 'standing-rules' &&
      section.id !== 'access-explanation' &&
      section.id !== 'glossary-short',
  );
  const adminHelp = employeeAdminHelpSection();

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
          data-tour={TOUR_TARGET.helpReplay}
        >
          <div className="rounded-[calc(var(--isalwa-radius-panel)-2px)] bg-white/90 [&_[data-guide-replay]]:mb-0">
            <WalkthroughHelpPanel />
          </div>
        </div>

        {access ? (
          <PageSection
            card
            className="bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6"
            data-tour={TOUR_TARGET.helpAccess}
            aria-labelledby="guidance-access-explanation"
          >
            <h2 id="guidance-access-explanation" className="isalwa-section-label">
              {access.title}
            </h2>
            <div className="mt-4">
              <GuidanceNotes notes={access.notes} />
            </div>
          </PageSection>
        ) : null}

        {glossary ? (
          <PageSection
            card
            className="bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6"
            data-tour={TOUR_TARGET.helpGlossary}
            aria-labelledby="guidance-glossary-short"
          >
            <h2 id="guidance-glossary-short" className="isalwa-section-label">
              {glossary.title}
            </h2>
            <div className="mt-4">
              <GuidanceNotes notes={glossary.notes} />
            </div>
          </PageSection>
        ) : null}

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

        <PageSection
          card
          className="bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6"
          aria-labelledby="guidance-employee-admin-help"
        >
          <h2 id="guidance-employee-admin-help" className="isalwa-section-label">
            {adminHelp.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
            Visible como referencia. Las acciones de administración solo están en Administración
            para quien tenga permiso.
          </p>
          <div className="mt-4">
            <GuidanceNotes notes={adminHelp.notes} />
          </div>
        </PageSection>

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
