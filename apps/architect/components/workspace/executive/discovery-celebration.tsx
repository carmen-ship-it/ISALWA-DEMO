"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkle, X } from "lucide-react";

const MILESTONES = [25, 50, 75, 100] as const;

function storageKey(workspaceId: string): string {
  return `isalwa.architect.milestone.${workspaceId}`;
}

function messageFor(milestone: number, companyName: string): string {
  switch (milestone) {
    case 25:
      return `Primer hito de comprensión: ya tenemos una lectura inicial sólida de ${companyName}, respaldada por la evidencia reunida.`;
    case 50:
      return `Punto medio alcanzado: la mitad del negocio de ${companyName} ya está mapeada con evidencia.`;
    case 75:
      return `Comprensión avanzada: ${companyName} está casi completamente mapeada — quedan pocos vacíos por cerrar.`;
    default:
      return `Comprensión completa: tenemos una imagen integral de ${companyName}, respaldada por la evidencia del descubrimiento.`;
  }
}

/**
 * A calm, one-time acknowledgement when real understanding crosses a
 * threshold — never a fabricated score, never confetti. Dismiss state is
 * remembered per workspace + milestone so it only appears once.
 */
export function DiscoveryCelebration({
  workspaceId,
  companyName,
  understanding,
}: {
  workspaceId: string;
  companyName: string;
  understanding: number;
}) {
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pct = Math.round(understanding);
    const reached = [...MILESTONES].reverse().find((m) => pct >= m);
    if (!reached) return;

    let seen: number[] = [];
    try {
      seen = JSON.parse(window.localStorage.getItem(storageKey(workspaceId)) ?? "[]");
    } catch {
      seen = [];
    }
    if (seen.includes(reached)) return;
    setMilestone(reached);
  }, [understanding, workspaceId]);

  const dismiss = () => {
    if (milestone == null) return;
    if (typeof window !== "undefined") {
      try {
        const seen: number[] = JSON.parse(
          window.localStorage.getItem(storageKey(workspaceId)) ?? "[]",
        );
        window.localStorage.setItem(
          storageKey(workspaceId),
          JSON.stringify([...new Set([...seen, milestone])]),
        );
      } catch {
        // Non-critical — worst case the message reappears once more.
      }
    }
    setMilestone(null);
  };

  return (
    <AnimatePresence>
      {milestone != null ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-3 rounded-2xl border border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/70 px-4 py-3.5"
        >
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[var(--isalwa-tint-amber-ink)] shadow-sm ring-1 ring-[var(--isalwa-tint-amber-border)]/80">
            <Sparkle className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="flex-1 text-sm leading-relaxed text-[var(--isalwa-tint-amber-ink)]/90">
            {messageFor(milestone, companyName)}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded-full p-1 text-[var(--isalwa-tint-amber-ink)]/70 transition-colors hover:bg-[var(--isalwa-tint-amber-border)] hover:text-[var(--isalwa-tint-amber-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-warning)]/45"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
