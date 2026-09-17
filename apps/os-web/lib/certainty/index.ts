export {
  CERTAINTY_BADGE_LABEL,
  CERTAINTY_DEFINITION,
  CERTAINTY_LABEL,
  CERTAINTY_STATES,
  CERTAINTY_TONE,
  certaintyBadgeLabel,
  certaintyLabel,
  certaintyTone,
  isCertaintyState,
  looksLikeProbabilityLabel,
  type CertaintyState,
} from './model';

export {
  FRESHNESS_COPY,
  formatFreshnessWording,
  formatLastUpdateStamp,
  freshnessForbidsDesactualizado,
  mayRequireConfirmation,
  type FreshnessMayRequireReason,
  type FreshnessWordingInput,
} from './freshness';

export {
  WHO_TO_ASK_COPY,
  whoToAskView,
  type CanonicalResponsible,
  type WhoToAskInput,
  type WhoToAskView,
} from './who-to-ask';

export {
  ASK_ISALWA_SECTION,
  askCertaintyLabel,
  askSectionTitleForCertainty,
  buildAskIsalwaAnswer,
  type AskIsalwaAnswerInput,
  type AskIsalwaSectionView,
  type AskIsalwaSourceLink,
} from './ask-format';
