import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/site/forms";
import { getVariant } from "@/lib/variants";
import { readCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Checkout" };

type Props = { params: Promise<{ variant: string }> };

/**
 * Where the order gets placed.
 *
 * **The basket is shown beside the form, not on the page before it.** Somebody
 * filling in an address is deciding whether to go through with it, and hiding
 * what they are about to pay behind a back button is the oldest way to make
 * that decision harder than it needs to be.
 *
 * **An empty basket redirects rather than rendering an empty checkout.** A form
 * that cannot succeed should not be shown; filling it in and being told the
 * basket is empty is the worst version of this screen.
 */
export default async function CheckoutPage({ params }: Props) {
  const { variant: slug } = await params;

  const variant = await getVariant(slug);
  if (!variant) notFound();

  const cart = await readCart(variant.id);
  const base = `/${variant.slug}`;

  if (cart.lines.length === 0) redirect(`${base}/cart`);

  return (
    <div className="container-page py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="measure mt-2 text-muted">
        Nothing here is dispatched and no payment is taken — this is a
        demonstration. The order will appear in the shop&rsquo;s panel exactly as
        a real one would.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="max-w-xl">
          <CheckoutForm variant={variant.slug} base={base} />
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="font-display text-base font-semibold">
              {cart.itemCount} {cart.itemCount === 1 ? "thing" : "things"}
            </h2>

            <ul className="mt-4 space-y-3 text-sm">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{line.name}</span>
                    <span className="text-xs text-muted">
                      {line.optionLabel ? `${line.optionLabel} · ` : ""}
                      {line.quantity} ×{" "}
                      {formatMoney(line.unitPaise, variant.currencySymbol)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatMoney(line.linePaise, variant.currencySymbol)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              {cart.discountPaise > 0 && (
                <div className="flex justify-between gap-4 text-accent">
                  <dt>{cart.couponCode}</dt>
                  <dd className="tabular-nums">
                    −{formatMoney(cart.discountPaise, variant.currencySymbol)}
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-4">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">
                  {cart.shippingPaise === 0
                    ? "Free"
                    : formatMoney(cart.shippingPaise, variant.currencySymbol)}
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatMoney(cart.grandTotalPaise, variant.currencySymbol)}
                </dd>
              </div>
            </dl>

            <Link
              href={`${base}/cart`}
              className="mt-5 block text-center text-sm text-muted hover:text-text"
            >
              Change the basket
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
