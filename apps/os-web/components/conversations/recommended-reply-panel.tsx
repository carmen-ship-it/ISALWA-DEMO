'use client';

import { useEffect, useState } from 'react';
import { Button, Panel, StatusPill } from '@isalwa/ui';
import { CertaintyBadge } from '@/components/certainty/certainty-badge';
import {
  RECOMMENDED_REPLY_COPY,
  buildRecommendedReplyView,
  type RecommendedReplyDraftInput,
} from '@/lib/conversations/smart-context';

type RecommendedReplyPanelProps = RecommendedReplyDraftInput & {
  onCopy?: (body: string) => void;
  onRecordSent?: (body: string) => void;
  className?: string;
};

export function RecommendedReplyPanel({
  body,
  badges,
  allowRecordSent,
  onCopy,
  onRecordSent,
  className,
}: RecommendedReplyPanelProps) {
  const view = buildRecommendedReplyView({ body, badges, allowRecordSent });
  const [draft, setDraft] = useState(view.body);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(view.body);
  }, [view.body]);

  async function handleCopy() {
    const text = draft.trim();
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Clipboard may be blocked; still notify parent with draft.
    }
    setCopied(true);
    onCopy?.(text);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Panel className={className} data-recommended-reply="panel" data-auto-send="never">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[var(--isalwa-text-2xs)] font-medium uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
          {view.title}
        </p>
        {view.badges.map((badge) => (
          <CertaintyBadge key={badge} state={badge} compact />
        ))}
      </div>

      <label className="mt-3 block">
        <span className="sr-only">{RECOMMENDED_REPLY_COPY.title}</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          data-recommended-reply="draft"
        />
      </label>

      <p className="mt-2 text-xs text-[var(--isalwa-slate)]">{view.neverAutoSend}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopy()}>
          {copied ? 'Copiada' : view.copyLabel}
        </Button>
        {view.recordSentLabel && onRecordSent ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRecordSent(draft.trim())}>
            {view.recordSentLabel}
          </Button>
        ) : null}
      </div>

      {view.recordSentLabel ? (
        <p className="mt-2 text-xs text-[var(--isalwa-slate)]">{RECOMMENDED_REPLY_COPY.recordSentHint}</p>
      ) : null}

      <StatusPill tone="neutral" className="mt-3">
        Sin envío automático
      </StatusPill>
    </Panel>
  );
}
