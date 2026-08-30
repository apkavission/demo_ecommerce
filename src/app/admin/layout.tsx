import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/nav";
import { getAdminSession, isManager, type AdminSession } from "@/lib/auth";
import { signOut } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s — Store panel" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The panel's shell.
 *
 * ---------------------------------------------------------------------------
 * **The menu is built from the role, and entries somebody may not use are
 * absent rather than disabled.**
 *
 * A greyed-out "Share links" tells a colleague that a feature exists which they
 * may not have, which is an invitation to ask why — and the honest answer is a
 * conversation about seniority nobody wanted to have over a menu item.
 *
 * **Three tiers here, where the other demos have two.** A shop has a job that
 * is neither owner nor administrator: the person who packs orders. They get
 * Orders and Messages, and no way to change a price — not because they are not
 * trusted, but because a pricing mistake made while packing is a mistake nobody
 * is looking for.
 *
 * The role is written in the header on purpose. Somebody wondering why they
 * cannot edit the catalogue should be able to see what they are signed in as
 * without asking anybody.
 *
 * **No shop branding anywhere.** This screen belongs to us. Dressing it in Kora
 * Label's sand and ink would be pretending an invented shop has staff.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  /* The sign-in page lives under this layout and must render without one. */
  if (!session) return <>{children}</>;

  const manager = await isManager();

  return (
    <Shell session={session} manager={manager}>
      {children}
    </Shell>
  );
}

function Shell({
  session,
  manager,
  children,
}: {
  session: AdminSession;
  manager: boolean;
  children: React.ReactNode;
}) {
  const items = [
    { href: "/admin", label: "Today" },
    { href: "/admin/orders", label: "Orders" },
    ...(manager
      ? [
          { href: "/admin/catalogue", label: "Catalogue" },
          { href: "/admin/coupons", label: "Codes" },
          { href: "/admin/content", label: "Content" },
        ]
      : []),
    ...(session.isSuperAdmin
      ? [
          { href: "/admin/variants", label: "Shops" },
          { href: "/admin/links", label: "Share links" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex h-16 items-center gap-6">
          <Link href="/admin" className="font-display font-semibold tracking-tight">
            Store demo
          </Link>

          <AdminNav items={items} className="hidden sm:flex" />

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm text-muted sm:flex">
              {session.name}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text">
                {session.isSuperAdmin && <ShieldCheck className="size-3" aria-hidden />}
                {session.roleLabel}
              </span>
            </span>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <AdminNav items={items} className="container-page flex-wrap pb-3 sm:hidden" />
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
