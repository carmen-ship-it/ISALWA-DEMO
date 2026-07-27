import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /** Soft lift on hover — use for clickable / focusable cards only. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        // Premium Visual Quality pass — a richer multi-layer shadow + inset
        // top highlight replaces the single flat drop-shadow every card
        // used before, and the border softens to the shared
        // `--isalwa-border-subtle` law token instead of a fixed opacity so
        // cards separate from the porcelain wash without a hard outline.
        // Kept as a `shadow-[...]` Tailwind arbitrary value (not a bespoke
        // unlayered class) so existing `shadow-none` overrides at call
        // sites still win via tailwind-merge.
        "isalwa-t-base rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-border-subtle)]/70 bg-white shadow-[var(--isalwa-shadow-card-resting)]",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--isalwa-glaze)]/25 hover:shadow-[var(--isalwa-shadow-card-hover)]",
        className,
      )}
      {...props}
    />
  );
}
