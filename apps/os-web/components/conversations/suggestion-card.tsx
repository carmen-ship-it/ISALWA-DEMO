import { Button, Panel, StatusPill } from '@isalwa/ui';
import {
  SUGGESTION_CARD_COPY,
  suggestionSignalCopy,
  suggestionTypeLabel,
  type ConversationSuggestion,
} from '@/lib/conversations/smart-context';

type SuggestionCardProps = {
  suggestion: ConversationSuggestion;
  onReview?: (suggestion: ConversationSuggestion) => void;
  onIgnore?: (suggestion: ConversationSuggestion) => void;
  /** Optional type-specific primary CTA (Crear oportunidad, etc.). Never auto-fires. */
  onPrimaryAction?: (suggestion: ConversationSuggestion) => void;
  className?: string;
};

export function SuggestionCard({
  suggestion,
  onReview,
  onIgnore,
  onPrimaryAction,
  className,
}: SuggestionCardProps) {
  return (
    <Panel
      className={className}
      data-suggestion-id={suggestion.id}
      data-suggestion-type={suggestion.type}
      data-suggestion-demo={suggestion.isDemo ? 'yes' : 'no'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[var(--isalwa-text-2xs)] font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
          {SUGGESTION_CARD_COPY.kicker}
        </p>
        {suggestion.isDemo ? <StatusPill tone="demo">{SUGGESTION_CARD_COPY.demoBadge}</StatusPill> : null}
      </div>

      <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">
        {suggestionTypeLabel(suggestion.type)}
      </p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{suggestion.explanation}</p>
      <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{suggestionSignalCopy(suggestion.signal)}</p>

      <blockquote className="mt-3 border-l-2 border-[var(--isalwa-mist)] pl-3 text-sm italic text-[var(--isalwa-kiln)]">
        {suggestion.snippet}
      </blockquote>

      {suggestion.relatedLabel ? (
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
          Relacionado: <span className="font-medium text-[var(--isalwa-kiln)]">{suggestion.relatedLabel}</span>
        </p>
      ) : null}

      {suggestion.detected.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-[var(--isalwa-slate)]">
          {suggestion.detected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {suggestion.isDemo ? (
        <p className="mt-2 text-xs text-[var(--isalwa-slate)]">{SUGGESTION_CARD_COPY.demoNote}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onPrimaryAction ? (
          <Button type="button" variant="contextual" size="sm" onClick={() => onPrimaryAction(suggestion)}>
            {suggestion.primaryActionLabel}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={() => onReview?.(suggestion)}>
          {SUGGESTION_CARD_COPY.review}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onIgnore?.(suggestion)}>
          {SUGGESTION_CARD_COPY.ignore}
        </Button>
      </div>
    </Panel>
  );
}
