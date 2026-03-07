"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({
  className,
  ...props
}: TextareaProps): React.JSX.Element {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
        "placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
