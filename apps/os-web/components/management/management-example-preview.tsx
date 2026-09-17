'use client';

import { useState } from 'react';
import { Button, MetricCard, PageSection } from '@isalwa/ui';
import {
  EXAMPLE_WATERMARK,
  exampleOrgMetricsPreview,
  exampleTeamTablePreview,
} from '@/lib/management/example-preview';

type PreviewKind = 'org-metrics' | 'team-table';

type ManagementExamplePreviewTriggerProps = {
  kind: PreviewKind;
};

export function ManagementExamplePreviewTrigger({ kind }: ManagementExamplePreviewTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="tertiary" size="sm" onClick={() => setOpen(true)}>
        Ver ejemplo
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--isalwa-kiln)_55%,transparent)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista de ejemplo"
        >
          <PageSection
            card
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5 md:p-6"
          >
            <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--isalwa-warning)] uppercase">
              {EXAMPLE_WATERMARK}
            </p>
            {kind === 'org-metrics' ? <ExampleOrgMetricsBody /> : <ExampleTeamTableBody />}
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </PageSection>
        </div>
      ) : null}
    </>
  );
}

function ExampleOrgMetricsBody() {
  const sample = exampleOrgMetricsPreview();
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-[var(--isalwa-slate)]">
        Vista ilustrativa para evaluación. No altera conteos reales ni se guarda en el sistema.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sample.cards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </div>
    </div>
  );
}

function ExampleTeamTableBody() {
  const rows = exampleTeamTablePreview();
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--isalwa-mist)]">
            {[
              'Asesor',
              'Clientes',
              'Oportunidades',
              'Emitidas',
              'Convertidas',
              'Tasa',
              'Vencidos',
              'Incidencias',
            ].map((label) => (
              <th key={label} className="px-2 py-2 text-xs uppercase text-[var(--isalwa-slate)]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.advisor} className="border-b border-[var(--isalwa-mist)]">
              <td className="px-2 py-2">{row.advisor}</td>
              <td className="px-2 py-2">{row.clients}</td>
              <td className="px-2 py-2">{row.opportunities}</td>
              <td className="px-2 py-2">{row.issued}</td>
              <td className="px-2 py-2">{row.converted}</td>
              <td className="px-2 py-2">{row.rate}</td>
              <td className="px-2 py-2">{row.overdue}</td>
              <td className="px-2 py-2">{row.issues}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
