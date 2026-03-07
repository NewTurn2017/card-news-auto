"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const BUTTON_VARIANTS = {
  default: "bg-accent text-white hover:bg-accent-hover shadow-sm",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-hover shadow-sm",
  outline:
    "border border-border bg-background/60 text-foreground hover:bg-surface hover:border-muted",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
} as const;

const BUTTON_SIZES = {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-11 px-5",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  type = "button",
  variant = "default",
  size = "default",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
