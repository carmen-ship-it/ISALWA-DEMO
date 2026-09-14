export const TOUR_RUN_STATES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED'] as const;

export type TourRunState = (typeof TOUR_RUN_STATES)[number];

export const TOUR_STATE_LABELS = [
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
] as const;

export type TourStateLabel = (typeof TOUR_STATE_LABELS)[number];

/** Content contract. Chapter files own the copy. The runner only reads this shape. */
export type TourStep = {
  stepId: string;
  target?: string;
  title: string;
  body: string;
  stateLabel: TourStateLabel;
  /** Path to open before this step is shown. Absent stays on the current page. */
  nextRoute?: string;
};

export type TourChapter = {
  chapterId: string;
  title: string;
  routePrefix?: string;
  routePrefixes?: readonly string[];
  /**
   * Optional access keys. Absent means visible. Hide from replay only when a
   * caller passes an access set that includes none of these keys.
   */
  roleVisibility?: readonly string[];
  steps: readonly TourStep[];
};

export type TourWelcome = {
  title: string;
  body: string;
  kicker?: string;
};

export const WALKTHROUGH_RECORD_VERSION = 2;

export type WalkthroughRecord = {
  /** Record shape version. The localStorage key stays v1; this field is independent. */
  version: typeof WALKTHROUGH_RECORD_VERSION;
  /** Active session only. Other chapters live in chapterStates. */
  runState: TourRunState;
  chapterId: string | null;
  /** The one chapter this session is running. Never the full catalog. */
  scopeChapterId: string | null;
  stepId: string | null;
  learningMode: boolean;
  dismissedPageKeys: string[];
  offeredPageKeys: string[];
  completedChapterIds: string[];
  welcomeClosed: boolean;
  chapterStates: Record<string, TourRunState>;
};

export type WalkthroughEvent =
  | { type: 'START'; chapterId: string | null; stepId: string | null; scopeChapterId: string | null }
  | { type: 'ADVANCE'; chapterId: string | null; stepId: string | null }
  | { type: 'BACK'; chapterId: string | null; stepId: string }
  | { type: 'PAUSE' }
  | { type: 'CLOSE' }
  | { type: 'DISMISS'; chapterId?: string }
  | { type: 'COMPLETE'; chapterId: string | null }
  | { type: 'REPLAY'; chapterId: string | null; stepId: string | null; scopeChapterId: string | null }
  | { type: 'DISMISS_PAGE'; pageKey: string; chapterId?: string }
  | { type: 'MARK_PAGE_OFFERED'; pageKey: string }
  | { type: 'SET_LEARNING_MODE'; enabled: boolean }
  | { type: 'MARK_WELCOME_CLOSED' };
