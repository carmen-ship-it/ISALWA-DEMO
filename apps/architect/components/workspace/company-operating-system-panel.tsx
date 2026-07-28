"use client";

import { LivingDeliverablesCenter } from "@/components/workspace/living-deliverables-center";
import type { CompanyWorkspace, LivingDeliverableKind } from "@/types";

/**
 * Mission 25 + 27 — Company Operating System tab.
 *
 * Same living center as Documentos (one catalog). Deliverables are outputs;
 * this tab is the product surface for how the company operates.
 */
export function CompanyOperatingSystemPanel({
  workspace,
  onUpdated,
  onTeach,
  focusKind,
  onFocusConsumed,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
  onTeach?: () => void;
  focusKind?: LivingDeliverableKind | null;
  onFocusConsumed?: () => void;
  /** @deprecated Mission 27 builds in-place; kept for call-site compatibility. */
  onOpenDeliverables?: () => void;
  onFocusDeliverable?: (kind: LivingDeliverableKind) => void;
}) {
  return (
    <LivingDeliverablesCenter
      workspace={workspace}
      onUpdated={onUpdated}
      onTeach={onTeach}
      focusKind={focusKind}
      onFocusConsumed={onFocusConsumed}
    />
  );
}
