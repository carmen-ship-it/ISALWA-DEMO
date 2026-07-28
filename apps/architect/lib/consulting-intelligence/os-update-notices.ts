/**
 * Mission 30 — Living Versioning notices.
 *
 * When new evidence arrives, Architect does not silently regenerate.
 * It surfaces which OS outputs can be strengthened (fingerprint delta
 * already computed by Mission 26). Owner chooses Build New Version.
 */

import { livingDeliverableCopy } from "@/lib/deliverables/living";
import { buildLivingDeliverablesOverview } from "@/lib/deliverables/living/versioning";
import type { CompanyWorkspace, LivingDeliverableKind } from "@/types";

export interface OsUpdateNoticeItem {
  kind: LivingDeliverableKind;
  title: string;
  shortTitle: string;
  version: number;
  message: string;
}

export interface OsUpdateNotices {
  count: number;
  headline: string;
  detail: string;
  items: OsUpdateNoticeItem[];
}

export function buildOsUpdateNotices(
  workspace: CompanyWorkspace,
): OsUpdateNotices | null {
  const updates = buildLivingDeliverablesOverview(workspace).filter(
    (item) => item.updateAvailable && item.latest,
  );
  if (updates.length === 0) return null;

  const items: OsUpdateNoticeItem[] = updates.map((item) => {
    const copy = livingDeliverableCopy(item.kind, workspace.companyName);
    const version = item.latest!.version;
    return {
      kind: item.kind,
      title: copy.title,
      shortTitle: copy.shortTitle,
      version,
      message: `Tu ${copy.shortTitle} puede mejorarse — Architect encontró conocimiento nuevo desde la versión ${version}.`,
    };
  });

  const count = items.length;
  const headline =
    count === 1
      ? items[0]!.message
      : `${count} partes del sistema operativo tienen actualización disponible.`;

  const detail =
    count === 1
      ? "Usted decide cuándo construir la nueva versión — Architect nunca regenera en silencio."
      : `Incluye: ${items.map((i) => i.shortTitle).join(", ")}. Usted decide cuándo construir cada nueva versión.`;

  return { count, headline, detail, items };
}
