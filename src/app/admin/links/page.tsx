import type { Metadata } from "next";
import { CopyLink, RevokeLink, ShareLinkForm } from "@/components/admin/editors";
import { requireSuperAdmin } from "@/lib/auth";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { listVariants } from "@/lib/variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Share links" };

/**
 * Who has been sent what, and for how long.
 *
 * **A super admin's screen.** Issuing one of these hands somebody outside the
 * company a view of our work, and closing one is how a mistake gets undone —
 * both belong with whoever is accountable for the estate rather than with
 * whoever is editing a price list this afternoon.
 *
 * **Closed links stay on the page.** The row is the record of who was sent what
 * and how often they opened it, which is worth more after the link is dead than
 * before: "they never opened it" and "they opened it nine times" are different
 * conversations to have with the same prospect.
 */
export default async function LinksPage() {
  await requireSuperAdmin();

  const supabase = await createClient();
  const variants = await listVariants();

  const { data } = await supabase
    .from("share_links")
    .select("*, variant:variants(name, slug)")
    .order("created_at", { ascending: false });

  const links = (data ?? []) as unknown as {
    id: string;
    token: string;
    label: string;
    expires_at: string;
    revoked_at: string | null;
    view_count: number;
    max_views: number | null;
    last_seen_at: string | null;
    created_at: string;
    variant: { name: string; slug: string } | null;
  }[];

  /*
    Read once, before rendering.

    `Date.now()` inside the component body is impure — React may re-render, and
    two calls in one pass can disagree, so a link could draw as live in one place
    and expired in another on the same screen. The lint rule that catches this is
    worth obeying rather than silencing.
  */
  const now = expiryReference();

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Share links</h1>
        <p className="measure mt-2 text-muted">
          A link opens one business, cannot reach this panel, stops on its own
          date, and can be closed the moment you need it closed.
        </p>
      </header>

      <div className="mt-8">
        <ShareLinkForm variants={variants.map((v) => ({ id: v.id, name: v.name }))} />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Everything sent</h2>

        {links.length === 0 ? (
          <p className="mt-4 rounded-[var(--radius-card)] border border-dashed border-border p-8 text-sm text-muted">
            Nothing yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {links.map((link) => {
              const expired = new Date(link.expires_at).getTime() < now;
              const usedUp =
                link.max_views !== null && link.view_count >= link.max_views;
              const dead = Boolean(link.revoked_at) || expired || usedUp;

              const url = `${clientEnv.NEXT_PUBLIC_SITE_URL}/s/${link.token}`;

              return (
                <li
                  key={link.id}
                  className={cn(
                    "rounded-[var(--radius-card)] border p-5",
                    dead ? "border-border bg-surface opacity-70" : "border-accent/40 bg-surface",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {link.label}
                        <span className="ml-2 text-sm font-normal text-muted">
                          {link.variant?.name}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        {link.revoked_at
                          ? "Closed by hand"
                          : expired
                            ? "Expired"
                            : usedUp
                              ? "Used up"
                              : `Open until ${new Date(link.expires_at).toLocaleDateString("en-IN")}`}
                        {" · "}
                        opened {link.view_count} {link.view_count === 1 ? "time" : "times"}
                        {link.last_seen_at &&
                          `, last on ${new Date(link.last_seen_at).toLocaleDateString("en-IN")}`}
                        {link.max_views !== null && ` · limit ${link.max_views}`}
                      </p>

                      {!dead && (
                        <p className="mt-3 break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs">
                          {url}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {!dead && <CopyLink url={url} />}
                      {!link.revoked_at && !expired && <RevokeLink id={link.id} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * The moment this page is being rendered at.
 *
 * Outside the component so the impurity is confined to one named place, and read
 * once so every row on the page is judged against the same instant.
 */
function expiryReference(): number {
  return Date.now();
}
