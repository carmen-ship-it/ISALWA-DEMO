'use client';

import { useState, useTransition } from 'react';
import { Button, InsightCard, PageSection, SectionHeader } from '@isalwa/ui';
import { requestAiAssistAction } from '@/lib/ai/actions';
import type { AiAssistResponse } from '@/lib/ai/types';
import { AI_UNAVAILABLE_COPY } from '@/lib/ai/limits';

export type AiAssistPanelProps = {
  title: string;
  kicker?: string;
  feature: 'summarize_customer' | 'ask' | 'draft_follow_up';
  subjectType: 'issue' | 'party';
  subjectId: string;
  aiEnabled: boolean;
  promptLabel?: string;
};

export function AiAssistPanel({
  title,
  kicker = 'Asistencia',
  feature,
  subjectType,
  subjectId,
  aiEnabled,
  promptLabel = 'Pedir ayuda con IA',
}: AiAssistPanelProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AiAssistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onAssist() {
    setError(null);
    startTransition(async () => {
      const response = await requestAiAssistAction({ feature, subjectType, subjectId });
      if (!response.ok) {
        setResult(null);
        setError(response.message);
        return;
      }
      setResult(response.data);
    });
  }

  return (
    <PageSection card aria-label={title}>
      <div className="space-y-4 p-5 md:p-6">
        <SectionHeader kicker={kicker} title={title} />
        <InsightCard>
          La IA solo resume evidencia autorizada. No aprueba, no envía y no cambia registros.
        </InsightCard>
        {!aiEnabled ? (
          <p className="text-sm text-[var(--isalwa-slate)]">{AI_UNAVAILABLE_COPY}</p>
        ) : (
          <Button type="button" variant="secondary" disabled={pending} onClick={onAssist}>
            {pending ? 'Consultando…' : promptLabel}
          </Button>
        )}
        {error ? (
          <p className="text-sm text-[var(--isalwa-slate)]" role="status">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="space-y-4">
            <div>
              <h3 className="isalwa-section-label">Resumen</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{result.summary}</p>
            </div>
            <div>
              <h3 className="isalwa-section-label">Sugerencia</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{result.suggestion}</p>
            </div>
            {result.facts.length > 0 ? (
              <div>
                <h3 className="isalwa-section-label">Hechos citados</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--isalwa-slate)]">
                  {result.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-xs text-[var(--isalwa-slate)]">
              {result.modelCalled
                ? 'Modelo consultado con evidencia autorizada.'
                : 'Modo piloto sin llamada al proveedor.'}
              {' · '}
              Referencias: {result.evidenceRefs.length}
            </p>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}
