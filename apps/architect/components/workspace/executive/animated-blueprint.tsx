"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { useTranslations } from "@/lib/i18n";
import { departmentLabel, moduleLabel } from "@/lib/presentation";
import type { AnimatedBlueprintModel } from "@/lib/executive";

export function AnimatedBlueprint({
  model,
}: {
  model: AnimatedBlueprintModel;
}) {
  const { t } = useTranslations();
  if (model.modules.length === 0 && model.departments.length === 0) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-[var(--isalwa-slate)]/80">
          {t("animatedBlueprint.empty")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("animatedBlueprint.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {t("animatedBlueprint.title")}
        </h3>
      </div>

      {model.departments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {model.departments.map((dept, i) => (
            <motion.span
              key={dept}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 * i, duration: 0.4 }}
              className="rounded-full border border-[var(--isalwa-mist)] bg-white px-3.5 py-1.5 text-xs text-[var(--isalwa-slate)] shadow-sm"
              style={{
                boxShadow:
                  i % 2 === 0
                    ? "0 0 0 1px rgba(15,23,42,0.04), 0 0 24px rgba(15,23,42,0.06)"
                    : undefined,
              }}
            >
              {departmentLabel(dept)}
            </motion.span>
          ))}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]/80 bg-gradient-to-b from-[var(--isalwa-tint-gray)] to-white px-5 py-8">
        <div className="flex flex-wrap justify-center gap-3">
          {model.modules.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + i * 0.1,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="min-w-[140px] max-w-[180px] rounded-2xl border border-[var(--isalwa-mist)]/90 bg-white/95 px-4 py-3 shadow-[var(--isalwa-shadow-soft)]"
            >
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                {moduleLabel(mod.name)}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--isalwa-slate)]/60">
                {mod.purpose}
              </p>
            </motion.div>
          ))}
        </div>

        {model.connections.length > 0 ? (
          <ExecutiveDetail
            className="mt-8 border-t border-[var(--isalwa-mist)]/70 pt-6"
            labelExpand={t("animatedBlueprint.expandConnections")}
            labelCollapse={t("animatedBlueprint.collapseConnections")}
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
              {t("animatedBlueprint.connectionsLabel")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {model.connections.slice(0, 6).map((c, i) => (
                <motion.li
                  key={`${c.from}-${c.to}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: c.inferred ? 0.7 : 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
                  className={`flex items-center border-l-2 pl-2.5 text-sm text-[var(--isalwa-slate)] ${
                    c.inferred
                      ? "border-dashed border-[var(--isalwa-slate)]/35"
                      : "border-solid border-[var(--isalwa-info)]/60"
                  }`}
                >
                  <span className="text-[var(--isalwa-kiln)]">{moduleLabel(c.from)}</span>
                  <span
                    className={`mx-2 ${c.inferred ? "text-[var(--isalwa-slate)]/35" : "text-[var(--isalwa-slate)]/60"}`}
                    style={
                      c.inferred
                        ? {
                            borderBottom: "1px dashed currentColor",
                            display: "inline-block",
                            width: "1.1em",
                            height: "0.6em",
                          }
                        : undefined
                    }
                  >
                    {c.inferred ? "" : "→"}
                  </span>
                  <span className={c.inferred ? "text-[var(--isalwa-slate)]" : "text-[var(--isalwa-kiln)]"}>
                    {moduleLabel(c.to)}
                  </span>
                  {c.inferred ? (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.1em] text-[var(--isalwa-slate)]/45">
                      {t("provenance.tier.inferred")}
                    </span>
                  ) : null}
                </motion.li>
              ))}
            </ul>
            {model.connectionsAreInferred ? (
              <p className="mt-3 text-xs italic text-[var(--isalwa-slate)]/60">
                {t("animatedBlueprint.connectionsProvenance")}
              </p>
            ) : null}
          </ExecutiveDetail>
        ) : null}

        {model.productionRelationshipsLearning ? (
          <p className="mt-6 border-t border-[var(--isalwa-mist)]/70 pt-4 text-sm text-[var(--isalwa-slate)]/80">
            {t("animatedBlueprint.productionLearning")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
