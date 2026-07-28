/**
 * Mission 29 — Improve This Document (capability output).
 *
 * Builds a Teach brief from a living kind's `missingInformation` only —
 * no new questionnaire engine. "Mejorar" strengthens the OS capability;
 * the handbook (etc.) is the output that gets stronger.
 */

import { livingDeliverableCopy } from "@/lib/deliverables/living";
import { latestLivingDeliverable } from "@/lib/deliverables/living/versioning";
import { buildCompanyOperatingSystem } from "@/lib/consulting-intelligence/company-operating-system";
import type { CompanyWorkspace, LivingDeliverableKind } from "@/types";

export interface ImproveDeliverableBrief {
  kind: LivingDeliverableKind;
  title: string;
  capabilitySystem: string;
  missing: string[];
  /** Primary Spanish prompt shown above Teach upload. */
  prompt: string;
  teachHint: string;
}

export function buildImproveDeliverableBrief(
  workspace: CompanyWorkspace,
  kind: LivingDeliverableKind,
): ImproveDeliverableBrief {
  const copy = livingDeliverableCopy(kind, workspace.companyName);
  const latest = latestLivingDeliverable(workspace.livingDeliverables, kind);
  const osArtifact = buildCompanyOperatingSystem(workspace).artifacts.find(
    (a) => a.kind === kind,
  );
  const missing = (
    latest?.missingInformation?.length
      ? latest.missingInformation
      : osArtifact?.missingInformation ?? []
  ).filter(Boolean);

  const top = missing.slice(0, 3);
  const prompt =
    top.length === 0
      ? `Para fortalecer ${copy.shortTitle.toLowerCase()} de ${workspace.companyName}, enséñele a Architect un documento o nota que cierre lagunas del ${osArtifact?.capabilitySystem ?? "sistema operativo"}.`
      : top.length === 1
        ? `Para mejorar ${copy.title}, todavía necesito entender: ${top[0]}.`
        : `Para mejorar ${copy.title}, todavía necesito entender:\n${top.map((m) => `• ${m}`).join("\n")}`;

  return {
    kind,
    title: copy.title,
    capabilitySystem: osArtifact?.capabilitySystem ?? copy.kicker,
    missing: top,
    prompt,
    teachHint:
      "No es otro cuestionario: enseñe solo lo que falta para esta parte del sistema operativo.",
  };
}
