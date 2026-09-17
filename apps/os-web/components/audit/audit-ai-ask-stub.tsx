'use client';

import { InsightCard } from '@isalwa/ui';
import { AUDIT_AI_ASK_STUB_COPY, isAuditAiAskStubVisible } from '@/lib/audit/audit-ai-stub';

type AuditAiAskStubProps = {
  entryId: string;
};

/** Placeholder for future audit-scoped AI ask. Hidden unless explicitly enabled. */
export function AuditAiAskStub({ entryId }: AuditAiAskStubProps) {
  if (!isAuditAiAskStubVisible()) return null;

  return (
    <InsightCard>
      <span className="not-italic font-[family-name:var(--isalwa-font-sans)] text-xs uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
        Preguntar sobre este registro · {entryId.slice(0, 8)}…
      </span>
      <p className="mt-2 not-italic font-[family-name:var(--isalwa-font-sans)] text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {AUDIT_AI_ASK_STUB_COPY}
      </p>
    </InsightCard>
  );
}
