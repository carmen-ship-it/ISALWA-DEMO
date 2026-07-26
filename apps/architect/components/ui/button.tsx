import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "isalwa-interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--isalwa-kiln)] text-white shadow-[var(--isalwa-shadow-resting)] hover:bg-[var(--isalwa-glaze-deep)] hover:shadow-[var(--isalwa-shadow-hover)]",
        secondary:
          "bg-white text-[var(--isalwa-kiln)] border border-[var(--isalwa-mist)] hover:border-[var(--isalwa-glaze)]/30 hover:bg-[var(--isalwa-porcelain)]",
        ghost: "bg-transparent text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-mist)]",
      },
      size: {
        default: "h-11 px-6",
        lg: "h-14 px-8 text-base",
        sm: "h-9 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
