import { Panel, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type {
  FieldSource,
  PresentedField,
  ProductSheet,
} from '../../../../packages/os-catalog/src/presentation';
import { formatSource } from '@/lib/catalog/catalog-view';
import { CATALOG_COPY } from '@/lib/catalog/copy';

export function ProductSheetView({ sheet }: { sheet: ProductSheet }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="warning">{CATALOG_COPY.pdfPending}</StatusPill>
        {sheet.pendingFieldCount > 0 ? (
          <StatusPill tone="pending">{CATALOG_COPY.pendingFields(sheet.pendingFieldCount)}</StatusPill>
        ) : null}
        <StatusPill tone="muted">{sheet.category.value}</StatusPill>
      </div>

      {sheet.approvedImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- approved image URLs are not known at build time
        <img
          src={sheet.approvedImage.src}
          alt={sheet.approvedImage.alt}
          className="max-h-80 w-full rounded-[var(--isalwa-radius-panel)] object-contain"
        />
      ) : null}

      {sheet.description ? (
        <PageSection card className="p-4 md:p-5">
          <SectionHeader title={CATALOG_COPY.descriptionHeading} />
          <p className="m-0 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-kiln)]">
            {sheet.description.value}
          </p>
          <SourceList sources={sheet.description.sources} />
        </PageSection>
      ) : null}

      <FieldSection title={CATALOG_COPY.measuresHeading} fields={sheet.measures} empty={CATALOG_COPY.noMeasures} />
      {sheet.compatibility.length > 0 ? (
        <FieldSection title={CATALOG_COPY.compatibilityHeading} fields={sheet.compatibility} />
      ) : null}
      {sheet.otherAttributes.length > 0 ? (
        <FieldSection title={CATALOG_COPY.otherHeading} fields={sheet.otherAttributes} />
      ) : null}

      <PageSection card className="p-4 md:p-5">
        <SectionHeader title={CATALOG_COPY.conditionHeading} />
        <p className="m-0 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{sheet.condition.label}</p>
      </PageSection>

      <PageSection card className="p-4 md:p-5">
        <SectionHeader title={CATALOG_COPY.sourcesHeading} />
        <SourceList sources={sheet.name.sources} />
        <p className="mt-3 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{sheet.pdfCheck.reason}</p>
      </PageSection>

      <PageSection card className="p-4 md:p-5">
        <SectionHeader title={CATALOG_COPY.reviewHeading} />
        <dl className="m-0 grid grid-cols-1 gap-2 text-[var(--isalwa-text-sm)] sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-medium text-[var(--isalwa-kiln)]">{CATALOG_COPY.reviewedOn}</dt>
          <dd className="m-0 text-[var(--isalwa-slate)]">{sheet.reviewedOn}</dd>
          <dt className="font-medium text-[var(--isalwa-kiln)]">{CATALOG_COPY.historicalKeys}</dt>
          <dd className="m-0 break-words text-[var(--isalwa-slate)]">
            {sheet.historicalKeys.length > 0 ? sheet.historicalKeys.join(', ') : '—'}
          </dd>
        </dl>
        {sheet.reviewNotes.length > 0 ? (
          <ul className="mt-3 mb-0 list-disc space-y-1 pl-5 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
            {sheet.reviewNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </PageSection>
    </div>
  );
}

function FieldSection({
  title,
  fields,
  empty,
}: {
  title: string;
  fields: PresentedField[];
  empty?: string;
}) {
  return (
    <PageSection card className="p-4 md:p-5">
      <SectionHeader title={title} />
      {fields.length === 0 ? (
        <p className="m-0 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{empty}</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {fields.map((field) => (
            <li key={field.key}>
              <Panel padded className="space-y-1">
                <p className="m-0 text-[var(--isalwa-text-xs)] font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">
                  {field.label}
                </p>
                {field.status === 'pending_review' ? (
                  <>
                    <StatusPill tone="pending">{field.display}</StatusPill>
                    <p className="m-0 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{field.pendingReason}</p>
                  </>
                ) : (
                  <p className="m-0 break-words text-[var(--isalwa-text-md)] text-[var(--isalwa-kiln)]">{field.display}</p>
                )}
                <SourceList sources={field.sources} />
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

function SourceList({ sources }: { sources: FieldSource[] }) {
  return (
    <ul className="mt-2 mb-0 list-none space-y-0.5 p-0" aria-label={CATALOG_COPY.sourceLabel}>
      {sources.map((source) => (
        <li
          key={`${source.document}-${source.page}-${source.section}`}
          className="break-words text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]"
        >
          {CATALOG_COPY.sourceLabel}: {formatSource(source)}
        </li>
      ))}
    </ul>
  );
}
