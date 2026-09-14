export {
  calendarDayInLaPaz,
  isDueToday,
  isPastStoredInstant,
  parseStoredInstant,
} from '@/lib/work/aging/clock';
export {
  approvalPendingAgeLabel,
  DUE_TODAY_LABEL,
  elapsedDueFactLabel,
  quoteSubmittedAgeLabel,
} from '@/lib/work/aging/labels';
export type {
  AgingFact,
  AgingFactKind,
  ApprovalAgingSource,
  CommitmentAgingAdapter,
  CommitmentAgingRecord,
  WorkAgingInput,
} from '@/lib/work/aging/types';
export {
  deriveAgingFacts,
  deriveApprovalAgingFact,
  deriveCommitmentFact,
  deriveCommitmentFacts,
  deriveQuoteElapsedFact,
  deriveWorkDueFact,
  disappearedAgingKeys,
  sortAgingFacts,
  workAgingInput,
} from '@/lib/work/aging/derive';
export type { AgingSources } from '@/lib/work/aging/derive';
export {
  approvalAgeLabelForAttention,
  dueTodayLabelForAttention,
} from '@/lib/work/aging/attention';
export { supplementalAgingGroups } from '@/lib/work/aging/present';
export type { AgingFactGroup } from '@/lib/work/aging/present';
