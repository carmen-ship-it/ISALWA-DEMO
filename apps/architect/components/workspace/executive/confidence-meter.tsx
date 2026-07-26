"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import {
  strengthBand,
  understandingLevel,
  understandingSentence,
} from "@/lib/presentation";

export function ConfidenceMeter({
  value,
  label = "Qué tanto entendemos el negocio",
  evidence = [],
}: {
  value: number;
  label?: string;
  /** Short Spanish chips, e.g. "4 reuniones" */
  evidence?: string[];
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const level = understandingLevel(clamped);
  const band = strengthBand(clamped, "percent");
  const width = Math.max(8, clamped);

  const bandLabel =
    band === "High"
      ? "Alta confianza"
      : band === "Medium"
        ? "Confianza media"
        : band === "Low"
          ? "Confianza inicial"
          : "Aún formándose";

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {label}
        </p>
        <p className="architect-serif text-3xl text-[var(--isalwa-kiln)]">
          {level}
          <span className="ml-2 text-lg font-sans text-[var(--isalwa-slate)]/60">
            · {clamped}%
          </span>
        </p>
      </div>
      <div
        className="isalwa-risk-bar mt-4 !h-3 bg-[var(--isalwa-mist)]/80"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <motion.span
          className="!rounded-full bg-[var(--isalwa-glaze)]"
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-3 text-sm font-medium text-[var(--isalwa-slate)]">{bandLabel}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {understandingSentence(clamped)}
      </p>
      {evidence.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {evidence.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-mist)]/80"
            >
              <Check className="h-3 w-3 text-[var(--isalwa-success)]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
