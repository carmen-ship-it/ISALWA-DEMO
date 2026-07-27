import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--isalwa-mist)]/70",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      // Premium Visual Quality pass — soft glaze-to-kiln gradient fill and
      // the shared law easing instead of a flat single-color bar snapping
      // to its new width.
      className="h-full w-full flex-1 rounded-full bg-[linear-gradient(90deg,var(--isalwa-glaze)_0%,var(--isalwa-kiln)_100%)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;
