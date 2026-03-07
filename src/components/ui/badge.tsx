"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const BADGE_VARIANTS = {
  default: "border-accent/20 bg-accent/10 text-accent",
  secondary: "border-border bg-background text-foreground",
  outline: "border-border bg-transparent text-muted",
  destructive: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANTS;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
