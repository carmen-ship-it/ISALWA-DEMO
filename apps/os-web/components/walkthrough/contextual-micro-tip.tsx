'use client';

import { Button, Panel } from '@isalwa/ui';
import type { ContextualMicroTip } from '@/lib/walkthrough/micro-tips';

type ContextualMicroTipProps = {
  tip: ContextualMicroTip;
  onDismiss: () => void;
};

export function ContextualMicroTipCoach({ tip, onDismiss }: ContextualMicroTipProps) {
  return (
    <Panel className="border-[var(--isalwa-glaze)]/30 bg-[var(--isalwa-porcelain)]">
      <p className="isalwa-section-label">{tip.title}</p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{tip.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tip.primary.href ? (
          <a
            href={tip.primary.href}
            className="inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-porcelain)] px-3 text-sm font-medium text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-mist)]"
          >
            {tip.primary.label}
          </a>
        ) : (
          <Button type="button" size="sm" variant="secondary">
            {tip.primary.label}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          {tip.secondary.dismissLabel ?? tip.secondary.label}
        </Button>
      </div>
    </Panel>
  );
}
