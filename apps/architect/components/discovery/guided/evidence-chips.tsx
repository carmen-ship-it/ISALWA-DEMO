"use client";

import type { RetrievalPack } from "@/lib/ai/retrieval";

/**
 * "Basado en…" — light evidence transparency for the guided interview.
 *
 * Renders at most a handful of short Spanish labels for what the current
 * question already leans on (a past answer, a document, a related entity, an
 * open gap) — never the underlying `RetrievalPack` dump, and never the
 * internal consulting vocabulary (`lib/consulting-intelligence/visibility.ts`
 * keeps that notebook out of Client Mode entirely; this is a separate,
 * client-safe read of the same evidence sources).
 */
export function EvidenceChips({
  pack,
}: {
  pack: RetrievalPack | null | undefined;
}) {
  if (!pack || pack.items.length === 0) return null;

  const chips = pack.items.slice(0, 4);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/70">
        Basado en
      </span>
      {chips.map((item) => (
        <span
          key={item.id}
          title={item.statement}
          className="rounded-full bg-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]"
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
