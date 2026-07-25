import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-neutral-200/80 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
