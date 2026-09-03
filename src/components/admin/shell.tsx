"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The panel's shell: a rail beside the work, not a strip above it.
 *
 * ---------------------------------------------------------------------------
 * **Why this changed.** Every demo panel was a horizontal bar of links under a
 * title. It worked, and it looked like a different product from the company
 * admin — which matters, because these panels are the thing a prospect is shown
 * when we say "this is what running your own site looks like". Nine
 * applications should feel like one company's work.
 *
 * So the shape is the company admin's, on purpose: a fixed rail on the left,
 * the signed-in person at the bottom of it, and a sticky header carrying the
 * things that are about you rather than about the page.
 *
 * ---------------------------------------------------------------------------
 * **The menu is built from the role, and the super-admin entries are absent
 * rather than disabled** for anybody else. A greyed-out "Share links" tells a
 * colleague a feature exists which they may not have, which is an invitation to
 * ask why — and the honest answer is a conversation about seniority nobody
 * wanted to have over a menu item.
 *
 * **The role is written in the header on purpose.** Somebody wondering why they
 * cannot issue a link should be able to see they are signed in as an admin
 * rather than a super admin without asking anybody.
 *
 * **No variant branding anywhere.** This screen belongs to us. Dressing it in
 * Smile Care's teal would be pretending an invented business has staff.
 */

export interface PanelItem {
  href: string;
  label: string;
}

export function AdminShell({
  brand,
  items,
  name,
  roleLabel,
  isSuperAdmin,
  signOutAction,
  children,
}: {
  /** What this panel is called. The one string that differs between demos. */
  brand: string;
  items: PanelItem[];
  name: string;
  roleLabel: string;
  isSuperAdmin: boolean;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
    Keyed on the path rather than a plain boolean.

    A drawer closed by an effect watching `pathname` reopens itself on the next
    render if the link was to the page you are already on. Storing which path it
    was opened from means "open" is a comparison, and arriving anywhere — even
    back where you started — closes it.
  */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // Optional chaining because `key` is absent on some composed events.
      if (event.key?.toLowerCase() === "escape") setOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-dvh">
      {/* The rail. Hidden below lg, where the drawer takes over. */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <Brand brand={brand} />
        <Nav items={items} pathname={pathname} />
        <UserPanel
          name={name}
          roleLabel={roleLabel}
          isSuperAdmin={isSuperAdmin}
          signOutAction={signOutAction}
        />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenedAt(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface">
            <Brand brand={brand} onClose={() => setOpenedAt(null)} />
            <Nav items={items} pathname={pathname} onNavigate={() => setOpenedAt(null)} />
            <UserPanel
              name={name}
              roleLabel={roleLabel}
              isSuperAdmin={isSuperAdmin}
              signOutAction={signOutAction}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpenedAt(pathname)}
            aria-label="Open menu"
            aria-expanded={open}
            className="-ml-1 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <span className="font-display font-semibold tracking-tight lg:hidden">{brand}</span>

          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text">
              {isSuperAdmin && <ShieldCheck className="size-3" aria-hidden />}
              {roleLabel}
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function Brand({ brand, onClose }: { brand: string; onClose?: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-5">
      <Link href="/admin" className="font-display text-base font-semibold tracking-tight">
        {brand}
      </Link>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="ml-auto grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function Nav({
  items,
  pathname,
  onNavigate,
}: {
  items: PanelItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Panel" className="min-h-0 flex-1 overflow-y-auto p-3">
      <ul className="space-y-0.5">
        {items.map((item) => {
          /* `/admin` would otherwise match every screen under it. */
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Who is signed in, and the way out.
 *
 * At the bottom of the rail rather than in the header, which is where the
 * company admin puts it. Sign-out is a form posting to a Server Action rather
 * than a link: it changes state, and a GET that ends a session can be triggered
 * by any image tag on any page the browser happens to load.
 */
function UserPanel({
  name,
  roleLabel,
  isSuperAdmin,
  signOutAction,
}: {
  name: string;
  roleLabel: string;
  isSuperAdmin: boolean;
  signOutAction: () => Promise<void>;
}) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-medium text-accent"
        >
          {(name.trim().charAt(0) || "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-text-subtle">
            {isSuperAdmin && <ShieldCheck className="size-3 shrink-0" aria-hidden />}
            {roleLabel}
          </p>
        </div>
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}
