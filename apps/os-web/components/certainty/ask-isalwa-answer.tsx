import { StatusPill } from '@isalwa/ui';
import {
  buildAskIsalwaAnswer,
  certaintyTone,
  type AskIsalwaAnswerInput,
  type CertaintyState,
} from '@/lib/certainty';

type AskIsalwaAnswerProps = {
  answer: AskIsalwaAnswerInput;
  className?: string;
};

function sectionPill(certainty: CertaintyState | undefined) {
  if (!certainty) return null;
  return <StatusPill tone={certaintyTone(certainty)}>{certainty === 'confirmed' ? 'Confirmado' : certainty === 'pending' ? 'Pendiente' : 'Sin registro'}</StatusPill>;
}

export function AskIsalwaAnswer({ answer, className }: AskIsalwaAnswerProps) {
  const sections = buildAskIsalwaAnswer(answer);
  if (sections.length === 0) return null;

  return (
    <div
      className={className ?? 'space-y-4'}
      data-ask-isalwa="answer"
    >
      {sections.map((section) => (
        <section key={section.id} data-ask-section={section.id}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[var(--isalwa-text-2xs)] font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
              {section.title}
            </h3>
            {sectionPill(section.certainty)}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {section.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          {section.links && section.links.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="font-medium text-[var(--isalwa-glaze)] hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
