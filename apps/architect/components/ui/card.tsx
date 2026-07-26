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
        "isalwa-t-base rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]/80 bg-white shadow-[var(--isalwa-shadow-resting)]",
        interactive &&
          "hover:-translate-y-0.5 hover:border-[var(--isalwa-glaze)]/25 hover:shadow-[var(--isalwa-shadow-hover)]",
        className,
      )}
      {...props}
    />
  );
}
