import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: { className: "text-[10px] font-black", label: "CF" },
  sm: { className: "text-lg font-bold", label: "CardFlow" },
  md: { className: "text-xl font-bold", label: "CardFlow" },
  lg: { className: "text-3xl font-bold", label: "CardFlow" },
} as const;

export default function Logo({ href = "/dashboard", size = "md", className }: LogoProps) {
  const s = sizeMap[size];
  const content = (
    <span
      className={cn(
        s.className,
        "tracking-tight select-none",
        "bg-gradient-to-r from-slate-800 via-gray-700 to-slate-900 bg-clip-text text-transparent",
        "drop-shadow-[0_0_8px_rgba(30,41,59,0.15)]",
        className
      )}
    >
      {s.label}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-90" title="CardFlow">
        {content}
      </Link>
    );
  }

  return content;
}
