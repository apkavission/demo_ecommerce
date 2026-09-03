import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { getAdminSession, isManager } from "@/lib/auth";
import { signOut } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s — Store panel" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The panel's shell.
 *
 * A rail beside the work rather than a strip of links above it — the shape the
 * company admin uses, so the nine applications read as one company's work
 * rather than as products bought from different people. `AdminShell` holds the
 * markup and the reasoning; this file decides only who is asking and what they
 * may open.
 *
 * **Three tiers here, not two.** The other demos have staff and super admins; a
 * shop also has a manager, who runs the catalogue and the discount codes
 * without being able to hand out share links. Each tier's extra entries are
 * absent rather than disabled for anybody below it, and the role is written in
 * the header — somebody wondering why they cannot edit the catalogue can see
 * what they are signed in as without asking.
 *
 * **No shop branding anywhere.** This screen belongs to us. Dressing it in Kora
 * Label's sand and ink would be pretending an invented shop has staff.
 *
 * The sign-in page lives under this layout and must render without a session,
 * which is why the shell is not wrapped around everything unconditionally.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) return <>{children}</>;

  const manager = await isManager();

  const items = [
    { href: "/admin", label: "Today" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/enquiries", label: "Enquiries" },
    ...(manager
      ? [
          { href: "/admin/catalogue", label: "Catalogue" },
          { href: "/admin/coupons", label: "Codes" },
          { href: "/admin/content", label: "Content" },
          { href: "/admin/pages", label: "Pages" },
          { href: "/admin/menu", label: "Menu" },
        ]
      : []),
    ...(session.isSuperAdmin
      ? [
          { href: "/admin/media", label: "Pictures" },
          { href: "/admin/variants", label: "Shops" },
          { href: "/admin/branding", label: "Brand" },
          { href: "/admin/links", label: "Share links" },
        ]
      : []),
  ];

  return (
    <AdminShell
      brand="Store demo"
      items={items}
      name={session.name}
      roleLabel={session.roleLabel}
      isSuperAdmin={session.isSuperAdmin}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}
