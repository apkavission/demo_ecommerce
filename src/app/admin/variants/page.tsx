import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CloneVariant, VisibilityToggle } from "@/components/admin/editors";
import { requireSuperAdmin } from "@/lib/auth";
import { listVariants } from "@/lib/variants";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Shops" };

/**
 * Which shops this demo contains.
 *
 * **A super admin's screen**, because these are decisions about what every
 * future prospect sees rather than about this week's stock.
 *
 * Two controls, and both of them matter. Visibility decides whether a shop can
 * be found by anybody with the address or only through a link that was sent to
 * somebody — a demo built for one prospect and discovered by the next is the
 * failure that prevents. Copy makes a fourth shop without a database session,
 * which is what it took until now.
 *
 * The palettes are shown as they are — both modes, side by side — because the
 * commonest way a shop goes wrong is a colour that was only ever checked in one
 * of them.
 */
export default async function VariantsPage() {
  await requireSuperAdmin();

  const variants = await listVariants();

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Shops</h1>
        <p className="measure mt-2 text-muted">
          Each one is a complete, separate business sharing this codebase and
          nothing else — its own name, colours, stock, delivery charge and
          contact details.
        </p>
      </header>

      <ul className="mt-10 space-y-4">
        {variants.map((variant) => (
          <li
            key={variant.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">
                  {variant.businessName}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {variant.name} · /{variant.slug}
                </p>
                {variant.tagline && (
                  <p className="measure mt-2 text-sm">{variant.tagline}</p>
                )}
                <p className="mt-2 text-xs text-muted">
                  Delivery {formatMoney(variant.shippingPaise, variant.currencySymbol)}
                  {variant.freeShippingAbove !== null && (
                    <>
                      , free over{" "}
                      {formatMoney(variant.freeShippingAbove, variant.currencySymbol)}
                    </>
                  )}
                </p>
              </div>

              <Link
                href={`/${variant.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Open
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-6">
              <VisibilityToggle id={variant.id} visibility={variant.visibility} />

              <CloneVariant id={variant.id} name={variant.businessName} />

              {/* Both palettes, because a colour checked in one mode only is the
                  commonest way a shop ends up broken in the other. */}
              <div className="flex items-center gap-4 text-xs text-muted">
                {(["light", "dark"] as const).map((mode) => (
                  <span key={mode} className="flex items-center gap-1.5">
                    {mode}
                    <span className="flex gap-1">
                      {[
                        variant.theme[mode].bg,
                        variant.theme[mode].surface,
                        variant.theme[mode].accent,
                        variant.theme[mode].text,
                      ].map((colour) => (
                        <span
                          key={colour}
                          title={colour}
                          style={{ background: colour }}
                          className="size-4 rounded-full border border-border"
                        />
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="measure mt-10 text-sm text-muted">
        A copy arrives switched off and link-only, carrying the original&rsquo;s
        stock and prices until you change them — which is exactly when nobody
        should be able to find it. Orders, baskets, messages and share links stay
        with the shop that received them.
      </p>
    </div>
  );
}
