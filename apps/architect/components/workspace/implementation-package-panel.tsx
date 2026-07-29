"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  evaluateImplementationGate,
  generateImplementationPackage,
  IMPLEMENTATION_PACKAGE_THRESHOLD,
  readImplementationPackageState,
  sectionSourceEngineLabel,
} from "@/lib/implementation-package";
import { useTranslations } from "@/lib/i18n";
import { deriveReadinessVerdict } from "@/lib/readiness";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

/**
 * Thin Mission 18 UI — Ready / Not ready + section list when threshold met.
 * Architecture references only; no code generation.
 *
 * Leads with the canonical Readiness Verdict's headline and named critical
 * blockers (`lib/readiness/verdict.ts`) instead of the raw "78% vs 72%"
 * comparison — the same Missing Information language the rest of the app
 * already uses, so this panel never contradicts the Dashboard/Discovery
 * verdict for the same evidence. The numeric threshold line is preserved,
 * demoted below, for consultants who still want the exact figure.
 */
export function ImplementationPackagePanel({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const { t } = useTranslations();
  const [busy, setBusy] = useState(false);
  const live = useMemo(
    () => readImplementationPackageState(workspace),
    [workspace],
  );
  const gate = workspace.implementationPackage?.gate ?? live.gate;
  const pack = workspace.implementationPackage ?? live.pack;
  const verdict = useMemo(() => deriveReadinessVerdict(workspace), [workspace]);
  const namedBlockers = verdict.criticalTopics.map((topic) => topic.headline);

  const refresh = async () => {
    setBusy(true);
    try {
      await generateImplementationPackage(workspace.id);
      const refreshed = await getClientCompanyMemoryStore().workspaces.get(
        workspace.id,
      );
      if (refreshed) onUpdated(refreshed);
      else {
        const nextPack = assembleLocal(workspace);
        onUpdated({
          ...workspace,
          implementationPackage: nextPack,
          updatedAt: nextPack?.generatedAt ?? workspace.updatedAt,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("implementationPackagePanel.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {gate.ready
            ? t("implementationPackagePanel.ready")
            : t("implementationPackagePanel.notReady")}
        </h3>
        <p className="mt-3 text-[var(--isalwa-slate)]">{verdict.clientHeadline}</p>
        {!gate.ready && namedBlockers.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {namedBlockers.map((headline) => (
              <li key={headline} className="text-sm text-[var(--isalwa-slate)]">
                {headline}
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="mt-4 space-y-2">
          {gate.notes.map((note) => (
            <li key={note} className="text-sm text-[var(--isalwa-slate)]">
              {note}
            </li>
          ))}
        </ul>
        {gate.missingPrerequisites.length > 0 ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]/80">
            {t("implementationPackagePanel.missing", {
              items: gate.missingPrerequisites.join(" · "),
            })}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-[var(--isalwa-slate)]/60">
          {t("implementationPackagePanel.thresholdLine", {
            threshold: IMPLEMENTATION_PACKAGE_THRESHOLD,
            current: gate.businessUnderstanding,
          })}
          {gate.thresholdMet
            ? t("implementationPackagePanel.thresholdMet")
            : t("implementationPackagePanel.thresholdPending")}
        </p>
        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {busy
              ? t("implementationPackagePanel.updating")
              : t("implementationPackagePanel.updatePackage")}
          </Button>
        </div>
      </Card>

      {pack ? (
        <Card className="px-5 py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
            {t("implementationPackagePanel.sectionsHeader", {
              when: formatRelativeActivity(pack.generatedAt),
            })}
          </p>
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{pack.summary}</p>
          <ol className="mt-6 space-y-4">
            {pack.sections.map((section) => (
              <li
                key={section.id}
                className="rounded-2xl border border-[var(--isalwa-mist)]/70 bg-white/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                      {section.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                      {section.summary}
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                      {sectionSourceEngineLabel(section.sourceEngine)}
                      {section.artifacts[0]
                        ? t("implementationPackagePanel.referencesCount", {
                            count: section.artifacts.length,
                          })
                        : ""}
                    </p>
                  </div>
                  <span
                    className={
                      section.available
                        ? "shrink-0 rounded-full bg-[var(--isalwa-tint-green)] px-2.5 py-1 text-[11px] font-medium text-[var(--isalwa-tint-green-ink)]"
                        : "shrink-0 rounded-full bg-[var(--isalwa-mist)] px-2.5 py-1 text-[11px] font-medium text-[var(--isalwa-slate)]/80"
                    }
                  >
                    {section.available
                      ? t("implementationPackagePanel.available")
                      : t("implementationPackagePanel.pending")}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="px-5 py-5">
          <p className="text-sm text-[var(--isalwa-slate)]">
            {t("implementationPackagePanel.emptyState", {
              threshold: IMPLEMENTATION_PACKAGE_THRESHOLD,
            })}
          </p>
          <p className="mt-3 text-xs text-[var(--isalwa-slate)]/60">
            {t("implementationPackagePanel.currentStatus", {
              status:
                evaluateImplementationGate(workspace).status === "ready"
                  ? t("implementationPackagePanel.ready")
                  : t("implementationPackagePanel.notReady"),
            })}
          </p>
        </Card>
      )}
    </div>
  );
}

function assembleLocal(workspace: CompanyWorkspace) {
  return readImplementationPackageState(workspace).pack;
}
