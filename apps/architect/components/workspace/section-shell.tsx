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
  size = "default",
  kicker,
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  tone?: SectionTone;
  /**
   * Mission 13 — Executive Dashboard Redesign. Opt-in `"hero"` size scales up
   * title/description/icon-chip for the single top-of-page "Today's Focus"
   * hero without touching the default size every other `SectionShell` caller
   * already relies on.
   */
  size?: "default" | "hero";
  kicker?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  const ink = TONE_INK[tone];
  const isHero = size === "hero";

  return (
    <section
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border shadow-[var(--isalwa-shadow-resting)] px-5 py-6 sm:px-7 sm:py-8",
        isHero && "sm:px-9 sm:py-10",
        TONE_SURFACE[tone],
        className,
      )}
    >
      {kicker || title || description ? (
        <header className={isHero ? "mb-7" : "mb-6"}>
          <div className="flex items-start gap-4">
            {Icon ? (
              <span
                className={cn(
                  "isalwa-icon-chip",
                  ink,
                  isHero && "!h-11 !w-11",
                )}
              >
                <Icon className={isHero ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              {kicker ? (
                <p className={cn("isalwa-kicker", ink)}>{kicker}</p>
              ) : null}
              {title ? (
                <h2
                  className={cn(
                    "architect-serif leading-tight text-[var(--isalwa-kiln)]",
                    isHero
                      ? "mt-3 text-4xl sm:text-5xl"
                      : "mt-2 text-3xl",
                  )}
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  className={cn(
                    "max-w-2xl leading-relaxed text-[var(--isalwa-slate)]",
                    isHero ? "mt-4 text-lg" : "mt-3 text-base",
                  )}
                >
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
