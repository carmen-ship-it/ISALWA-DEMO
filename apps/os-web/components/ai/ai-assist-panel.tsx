'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button, Chip, InsightCard, PageSection, SearchField, SectionHeader } from '@isalwa/ui';
import { requestAiAssistAction } from '@/lib/ai/actions';
import type { AiAssistResponse } from '@/lib/ai/types';
import {
  AI_FREE_TEXT_MAX_CHARS,
  type AiAssistSurface,
  suggestedPromptsForSurface,
} from '@/lib/ai/suggested-prompts';
import { AiEvidenceCitations } from './ai-evidence-citations';

export type AiAssistPanelProps = {
  title: string;
  kicker?: string;
  feature: 'summarize_customer' | 'ask' | 'draft_follow_up' | 'summarize_commitments';
  subjectType: 'issue' | 'party';
  subjectId: string;
  surface: AiAssistSurface;
  aiEnabled: boolean;
  /** When false (mock pilot), footnotes omit live-model citation claim. */
  citationsLive?: boolean;
  suggestedPrompts?: readonly string[];
  promptLabel?: string;
};

export function AiAssistPanel({
  title,
  kicker = 'Asistencia',
  feature,
  subjectType,
  subjectId,
  surface,
  aiEnabled,
  citationsLive = false,
  suggestedPrompts,
  promptLabel = 'Preguntar',
}: AiAssistPanelProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AiAssistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const prompts = suggestedPrompts ?? suggestedPromptsForSurface(surface);

  if (!aiEnabled) {
    return null;
  }

  function runAssist(question?: string) {
    setError(null);
    startTransition(async () => {
      const response = await requestAiAssistAction({
        feature,
        subjectType,
        subjectId,
        ...(question ? { question } : {}),
      });
      if (!response.ok) {
        setResult(null);
        setError(response.message);
        return;
      }
      setResult(response.data);
    });
  }

  function onSuggested(prompt: string) {
    setActivePrompt(prompt);
    setDraft(prompt);
    runAssist(prompt);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) {
      setError('Escriba una pregunta acotada o elija una sugerencia.');
      return;
    }
    setActivePrompt(null);
    runAssist(question);
  }

  return (
    <PageSection card aria-label={title}>
      <div className="space-y-4 p-5 md:p-6">
        <SectionHeader kicker={kicker} title={title} />
        <InsightCard>
          La IA solo resume evidencia autorizada. No aprueba, no envía y no cambia registros. El texto
          libre solo cambia la pregunta, no el alcance de datos.
        </InsightCard>
        <div className="space-y-4">
          <div>
            <h3 className="isalwa-section-label">Sugerencias</h3>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Preguntas sugeridas">
              {prompts.map((prompt) => (
                <Chip
                  key={prompt}
                  active={activePrompt === prompt}
                  disabled={pending}
                  onClick={() => onSuggested(prompt)}
                >
                  {prompt}
                </Chip>
              ))}
            </div>
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block space-y-2">
              <span className="isalwa-section-label">Pregunta acotada</span>
              <SearchField
                value={draft}
                maxLength={AI_FREE_TEXT_MAX_CHARS}
                disabled={pending}
                placeholder="Pregunte solo sobre esta evidencia autorizada…"
                aria-label="Pregunta acotada para asistencia"
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? 'Consultando…' : promptLabel}
            </Button>
          </form>
        </div>
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
            <AiEvidenceCitations
              refs={result.evidenceRefs}
              citationsLive={citationsLive && result.modelCalled}
            />
            <p className="text-xs text-[var(--isalwa-slate)]">
              {result.modelCalled && citationsLive
                ? 'Modelo consultado con evidencia autorizada.'
                : 'Modo piloto sin llamada al proveedor en vivo.'}
            </p>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}
