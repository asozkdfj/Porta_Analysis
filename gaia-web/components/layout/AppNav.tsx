"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "GRR 분석" },
  { href: "/liw-linearity", label: "LIW 분석" },
  { href: "/temperature-tracking", label: "Temperature Tracking" },
  { href: "/tact-time", label: "Tact Time" },
  { href: "/error-analysis", label: "Error Analysis" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 mt-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
