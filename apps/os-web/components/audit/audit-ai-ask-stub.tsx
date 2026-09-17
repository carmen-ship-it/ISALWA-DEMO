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
    <InsightCard
      title="Preguntar sobre este registro"
      description={AUDIT_AI_ASK_STUB_COPY}
      meta={`Registro ${entryId.slice(0, 8)}…`}
    />
  );
}
