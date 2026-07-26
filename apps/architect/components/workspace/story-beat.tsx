import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Mission 8 — Executive Storytelling.
 * Shared 7-beat McKinsey story spine: what happened → why it matters →
 * the evidence → business impact → recommended solution → expected
 * result → next step. Presentation only — renders existing engine output
 * in narrative order, never invents copy.
 *
 * Shared by `ExplainedRecommendationCard` (recommendation cards) and the
 * Executive Summary deliverable preview so every recommendation surface
 * in the app reads as one consistent story pattern, per the "extend
 * before replace" constitution — this replaces two near-duplicate local
 * `Beat` implementations with one.
 */
export function StoryBeats({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={cn("space-y-5", className)}>{children}</ol>;
}

export function Beat({
  step,
  title,
  lead,
  children,
}: {
  step: number;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--isalwa-mist)] text-[11px] font-medium text-[var(--isalwa-slate)]/80"
      >
        {step}
      </span>
      <div className="min-w-0 flex-1 border-b border-[var(--isalwa-mist)]/70 pb-5 last:border-b-0 last:pb-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
          {title}
        </p>
        {lead ? (
          <p className="mt-1.5 text-xs italic text-[var(--isalwa-slate)]/60">{lead}</p>
        ) : null}
        <div className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {children}
        </div>
      </div>
    </li>
  );
}

export function BeatSubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
      {children}
    </p>
  );
}

export function BeatList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return <BeatEmpty text="Aún no disponible." />;
  return (
    <ul className={className ?? "space-y-1.5"}>
      {items.map((item) => (
        <li key={item}>• {item}</li>
      ))}
    </ul>
  );
}

export function BeatEmpty({ text }: { text: string }) {
  return <p className="text-[var(--isalwa-slate)]/80">{text}</p>;
}
