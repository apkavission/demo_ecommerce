"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The panel's menu, with the current screen marked.
 *
 * **The current item is coloured, not underlined.** Asked for on 2026-08-30
 * after the underline-only version turned out to be genuinely hard to see —
 * particularly in dark mode, where a one-pixel line under grey text on a
 * near-black surface is close to invisible.
 *
 * `aria-current="page"` carries the same information to a screen reader, which
 * colour alone does not. Both, always: somebody who cannot distinguish the
 * accent from the muted colour still needs to know where they are.
 *
 * **A child route counts as its parent being current.** `/admin/orders/x` should
 * light up Orders. The exception is `/admin` itself, which would otherwise match
 * every screen in the panel and light up permanently.
 */
export function AdminNav({
  items,
  className,
}: {
  items: { href: string; label: string }[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel" className={cn("flex items-center gap-1", className)}>
      {items.map((item) => {
        const current =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              current
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
