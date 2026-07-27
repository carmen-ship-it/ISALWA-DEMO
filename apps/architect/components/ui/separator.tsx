"use client";

import type { ComponentPropsWithoutRef } from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        // Premium Visual Quality pass — fades at both ends instead of a
        // hard edge-to-edge rule, matching `.isalwa-divider-fade`.
        "shrink-0",
        orientation === "horizontal"
          ? "h-px w-full bg-[linear-gradient(90deg,transparent_0%,var(--isalwa-mist)_18%,var(--isalwa-mist)_82%,transparent_100%)]"
          : "h-full w-px bg-[linear-gradient(180deg,transparent_0%,var(--isalwa-mist)_18%,var(--isalwa-mist)_82%,transparent_100%)]",
        className,
      )}
      {...props}
    />
  );
}
