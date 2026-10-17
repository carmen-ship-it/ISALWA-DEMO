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
  suggestionRuleIds,
  matchSuggestionRules,
  nextMondayIso,
  type SuggestionMatchInput,
} from './suggestion-rules';

export {
  OVERPROMISE_PATTERNS,
  PREFERRED_UNCERTAINTY,
  RECOMMENDED_REPLY_COPY,
  buildRecommendedReplyView,
  recommendedReplyFor,
  draftContainsOverpromise,
  type RecommendedReplyDraftInput,
  type RecommendedReplyView,
} from './recommended-reply';
