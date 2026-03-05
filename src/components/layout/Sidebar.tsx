"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/create", icon: "＋", label: "새로 만들기" },
  { href: "/projects", icon: "☰", label: "작업목록" },
  { href: "/", icon: "◇", label: "카드뉴스" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-14 flex-col items-center border-r border-border bg-background py-4 gap-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-accent text-background"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
            title={item.label}
          >
            {item.icon}
          </Link>
        );
      })}
    </aside>
  );
}
