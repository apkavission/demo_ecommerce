import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CouponEditor } from "@/components/admin/editors";
import { isManager, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listVariants } from "@/lib/variants";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Discount codes" };

type Props = { searchParams: Promise<{ shop?: string }> };

/**
 * Discount codes.
 *
 * ---------------------------------------------------------------------------
 * **This list is never public, and the reason is not the codes.**
 *
 * A code is meant to be given out. The *list* of them is the shop's margin
 * written down — every discount the business has ever been willing to offer,
 * with its minimum basket beside it. So the table is closed to everybody but the
 * panel, and the checkout asks about one code at a time through a function that
 * says nothing about the others.
 *
 * **A used code cannot be un-used.** The count of how many times each has been
 * redeemed is shown and not editable: it is a record of what happened, and a
 * field that lets somebody set it back to zero is a field that gets used to
 * cover a mistake rather than fix one.
 */
export default async function CouponsPage({ searchParams }: Props) {
  await requireAdmin();

  if (!(await isManager())) notFound();

  const { shop } = await searchParams;

  const variants = await listVariants();
  const current = variants.find((entry) => entry.slug === shop) ?? variants[0];

  if (!current) notFound();

  const supabase = await createClient();

  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .eq("variant_id", current.id)
    .order("created_at", { ascending: false });

  const rows = coupons ?? [];

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Discount codes
        </h1>
        <p className="measure mt-2 text-muted">
          For {current.businessName}. The checkout tells a customer exactly why a
          code did not work — expired, used up, or the basket being too small —
          rather than saying &ldquo;invalid&rdquo; and losing the sale.
        </p>
      </header>

      {variants.length > 1 && (
        <nav aria-label="Shops" className="mt-8 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <a
              key={variant.id}
              href={`/admin/coupons?shop=${variant.slug}`}
              aria-current={variant.id === current.id ? "page" : undefined}
              className={
                variant.id === current.id
                  ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg"
                  : "rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
              }
            >
              {variant.businessName}
            </a>
          ))}
        </nav>
      )}

      <section className="mt-8 card p-6">
        <h2 className="font-display mb-4 text-lg font-semibold">A new code</h2>
        <CouponEditor variantId={current.id} symbol={current.currencySymbol} />
      </section>

      <ul className="mt-8 space-y-4">
        {rows.map((coupon) => (
          <li
            key={coupon.id}
            className="card p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-mono text-lg font-semibold">{coupon.code}</p>

              <p className="text-sm text-muted">
                {coupon.kind === "percent"
                  ? `${coupon.amount}% off`
                  : `${formatMoney(coupon.amount, current.currencySymbol)} off`}
                {coupon.min_order_paise > 0 && (
                  <> · over {formatMoney(coupon.min_order_paise, current.currencySymbol)}</>
                )}
              </p>
            </div>

            <p className="mt-2 text-xs text-muted">
              Used {coupon.used_count}
              {coupon.max_uses !== null && ` of ${coupon.max_uses}`} time
              {coupon.used_count === 1 ? "" : "s"}
              {coupon.ends_at && ` · stops ${formatDate(coupon.ends_at)}`}
              {!coupon.is_active && " · switched off"}
            </p>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-accent">Change it</summary>
              <div className="mt-4">
                <CouponEditor
                  variantId={current.id}
                  coupon={coupon}
                  symbol={current.currencySymbol}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">No codes in this shop.</p>
      )}
    </div>
  );
}
