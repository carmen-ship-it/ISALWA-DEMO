'use client';

import { LEARNING_MODE_COPY } from '@/lib/walkthrough/copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useGuide } from './guide-provider';

/**
 * Learning Mode toggle switch for the Ayuda page.
 */
export function LearningModeToggle() {
  const api = useGuide();

  if (!api?.ready) return null;

  const isEnabled = api.record.learningModeEnabled;

  return (
    <div
      className="flex items-start gap-4"
      data-tour={TOUR_TARGET.helpLearningMode}
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
          {LEARNING_MODE_COPY.label}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {LEARNING_MODE_COPY.description}
        </p>
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
          {LEARNING_MODE_COPY.secondary}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        onClick={() => api.toggleLearningMode()}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-[var(--isalwa-motion-fast)] focus-visible:shadow-[var(--isalwa-shadow-focus)] ${
          isEnabled
            ? 'bg-[var(--isalwa-glaze)]'
            : 'bg-[var(--isalwa-mist)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-[var(--isalwa-motion-fast)] ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        <span className="sr-only">
          {isEnabled ? 'Desactivar modo aprendizaje' : 'Activar modo aprendizaje'}
        </span>
      </button>
    </div>
  );
}
