"use client";

import { motion } from "motion/react";
import type { JourneyStage } from "@/lib/executive";
import { t } from "@/lib/i18n";
import { understandingLevel } from "@/lib/presentation";

function humanizeJourneyDetail(detail: string): string {
  // Soften residual presentation strings that still carry scores/versions.
  // The regex patterns match legacy/engine fragments (Spanish and English);
  // the replacement copy itself is routed through i18n.
  let next = detail.replace(
    /(\d+)\s*%\s*de comprensión del negocio/i,
    (_m, n: string) =>
      t("discoveryJourney.businessUnderstanding", {
        level: understandingLevel(Number(n)).toLowerCase(),
      }),
  );
  next = next.replace(
    /(\d+)\s*%\s*(business understanding|understanding)/i,
    (_m, n: string) =>
      t("discoveryJourney.businessUnderstanding", {
        level: understandingLevel(Number(n)).toLowerCase(),
      }),
  );
  next = next.replace(/Blueprint\s*v\d+/gi, t("discoveryJourney.blueprintAvailable"));
  next = next.replace(/·\s*Blueprint[^·]*/gi, "");
  next = next.replace(/\b\d+\s*módulos\b/gi, (m) =>
    m.replace("módulos", t("discoveryJourney.capabilitiesWord")),
  );
  next = next.replace(/\bmodules\b/gi, t("discoveryJourney.capabilitiesWord"));
  return next.trim();
}

export function DiscoveryJourney({
  dayLabel,
  stages,
}: {
  dayLabel: string;
  stages: JourneyStage[];
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
        {dayLabel}
      </p>
      <ol className="mt-6 space-y-0">
        {stages.map((stage, index) => (
          <li key={stage.id}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="flex gap-4"
            >
              <div className="flex w-6 flex-col items-center">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                    stage.complete
                      ? "bg-[var(--isalwa-kiln)]"
                      : "border border-[var(--isalwa-mist)] bg-white"
                  }`}
                />
                {index < stages.length - 1 ? (
                  <span className="my-1 w-px flex-1 bg-[var(--isalwa-mist)]" />
                ) : null}
              </div>
              <div className={index < stages.length - 1 ? "pb-7" : ""}>
                <p
                  className={`text-base ${
                    stage.complete ? "text-[var(--isalwa-kiln)]" : "text-[var(--isalwa-slate)]/60"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                  {humanizeJourneyDetail(stage.detail)}
                </p>
                {index < stages.length - 1 ? (
                  <p className="mt-3 text-[var(--isalwa-slate)]/40">↓</p>
                ) : null}
              </div>
            </motion.div>
          </li>
        ))}
      </ol>
    </div>
  );
}
