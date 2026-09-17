/**
 * Smart context barrel for CT3-C conversation context panel consumers.
 * Lane D owns helpers + presentational pieces; not the /conversaciones layout.
 */

export {
  SUGGESTION_CARD_COPY,
  SUGGESTION_SIGNAL_COPY,
  SUGGESTION_TYPE_LABEL,
  SUGGESTION_TYPES,
  isSuggestionType,
  suggestionSignalCopy,
  suggestionTypeLabel,
  type ConversationSuggestion,
  type SuggestionSignal,
  type SuggestionType,
} from './suggestion-types';

export {
  demoSuggestionRuleIds,
  matchDemoSuggestionRules,
  nextMondayIso,
  type DemoSuggestionMatchInput,
} from './demo-suggestion-rules';

export {
  OVERPROMISE_PATTERNS,
  PREFERRED_UNCERTAINTY,
  RECOMMENDED_REPLY_COPY,
  buildRecommendedReplyView,
  demoRecommendedReplyFor,
  draftContainsOverpromise,
  type RecommendedReplyDraftInput,
  type RecommendedReplyView,
} from './recommended-reply';
