"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The parts of the page that need a browser: the menu, the theme switch and the
 * variant switcher.
 *
 * Kept in one file because they all live in the header and all need `"use
 * client"`. Splitting them into three files would mean three client bundles for
 * one strip of the page.
 */

export function ThemeToggle({ allowed }: { allowed: boolean }) {
  /*
    A variant can turn this off.

    Some businesses only look right in one mode — a dark restaurant site, a
    bright clinic — and a toggle that leads somewhere unflattering is worse than
    no toggle. When it is off the variant's own default is simply used.
  */
  if (!allowed) return null;

  return (
    <button
      type="button"
      aria-label="Switch between light and dark"
      onClick={() => {
        const root = document.documentElement;
        const now =
          root.getAttribute("data-theme") ??
          (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const next = now === "dark" ? "light" : "dark";

        root.setAttribute("data-theme", next);
        try {
          localStorage.setItem("demo-shop-theme", next);
        } catch {
          // A private window. The choice still applies to this page.
        }
      }}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      <Sun className="size-4 dark:hidden" aria-hidden />
      <Moon className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}

/**
 * "Viewing: Dental Clinic ▾" — the sales moment.
 *
 * Switching keeps you on the same page of the new business rather than sending
 * you home: somebody comparing the services page of two industries wants the
 * other services page, not the other front door.
 */
export function VariantSwitcher({
  current,
  variants,
}: {
  current: { slug: string; name: string; industryLabel: string };
  variants: { slug: string; name: string; industryLabel: string }[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (variants.length < 2) return null;

  const rest = pathname.split("/").slice(2).join("/");

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((was) => !was)}
        className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2"
      >
        <span className="text-muted">Viewing</span>
        {current.name}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <>
          {/* A click anywhere else closes it. Rendered before the menu so the
              menu sits above it. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-2)]"
          >
            {variants.map((variant) => (
              <li key={variant.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={variant.slug === current.slug}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/${variant.slug}${rest ? `/${rest}` : ""}`);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-2",
                    variant.slug === current.slug && "bg-accent-soft",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      variant.slug === current.slug ? "text-accent" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span>
                    <span className="block font-medium">{variant.name}</span>
                    <span className="block text-xs text-muted">{variant.industryLabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** The navigation, as a drawer on a phone and a row on everything else. */
export function SiteNav({
  base,
  items,
  cta,
}: {
  base: string;
  items: { label: string; href: string }[];
  cta: { label: string; href: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const link = (item: { label: string; href: string }) => {
    const href = `${base}${item.href}`;
    const active = pathname === href;

    return (
      <Link
        key={item.href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-lg px-3 py-2 text-sm transition-colors",
          active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
        )}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {items.map(link)}
      </nav>

      <Link
        href={`${base}${cta.href}`}
        className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 md:inline-flex"
      >
        {cta.label}
      </Link>

      <button
        type="button"
        aria-label={open ? "Close the menu" : "Open the menu"}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="inline-flex size-9 items-center justify-center rounded-full border border-border md:hidden"
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-surface p-4 shadow-[var(--shadow-2)] md:hidden">
          <nav aria-label="Main" className="flex flex-col gap-1">
            {items.map(link)}
            <Link
              href={`${base}${cta.href}`}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-fg"
            >
              {cta.label}
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
