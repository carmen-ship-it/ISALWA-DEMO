import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionTone =
  | "executive"
  | "health"
  | "risks"
  | "problems"
  | "blueprint"
  | "processes"
  | "deliverables"
  | "neutral";

/**
 * Section identity (Mission 9 — Premium Executive Design System). Each tone
 * maps to one soft, unsaturated hue from `@isalwa/ui`'s tint tokens so a tab
 * reads as "where am I" at a glance:
 *   executive → blue (Executive Summary)   health → teal (Business Understanding)
 *   risks     → red  (Critical Risks)      problems → amber (Recommendations)
 *   blueprint → violet (Roadmap)           processes → green (Implementation)
 *   deliverables → gray (Knowledge)        neutral → gray (fallback)
 */
const TONE_SURFACE: Record<SectionTone, string> = {
  executive: "isalwa-surface-blue",
  health: "isalwa-surface-teal",
  risks: "isalwa-surface-red",
  problems: "isalwa-surface-amber",
  blueprint: "isalwa-surface-violet",
  processes: "isalwa-surface-green",
  deliverables: "isalwa-surface-gray",
  neutral: "isalwa-surface-gray",
};

const TONE_INK: Record<SectionTone, string> = {
  executive: "isalwa-ink-blue",
  health: "isalwa-ink-teal",
  risks: "isalwa-ink-red",
  problems: "isalwa-ink-amber",
  blueprint: "isalwa-ink-violet",
  processes: "isalwa-ink-green",
  deliverables: "isalwa-ink-gray",
  neutral: "isalwa-ink-gray",
};

export function SectionShell({
  tone = "neutral",
  kicker,
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  tone?: SectionTone;
  kicker?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  const ink = TONE_INK[tone];

  return (
    <section
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border shadow-[var(--isalwa-shadow-resting)] px-5 py-6 sm:px-7 sm:py-8",
        TONE_SURFACE[tone],
        className,
      )}
    >
      {kicker || title || description ? (
        <header className="mb-6">
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className={cn("isalwa-icon-chip", ink)}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              {kicker ? (
                <p className={cn("isalwa-kicker", ink)}>{kicker}</p>
              ) : null}
              {title ? (
                <h2 className="architect-serif mt-2 text-3xl leading-tight text-[var(--isalwa-kiln)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--isalwa-slate)]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}
