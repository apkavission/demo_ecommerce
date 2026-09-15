import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { CouponBox, LineQuantity } from "@/components/site/product";
import { getVariant } from "@/lib/variants";
import { PageBand } from "@/components/site/ui";
import { readCart } from "@/lib/cart";
import { awayFromFreeShipping, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Basket" };

type Props = { params: Promise<{ variant: string }> };

/**
 * The basket.
 *
 * ---------------------------------------------------------------------------
 * **Nothing on this page is remembered in the browser.**
 *
 * Every number is read from the database when the page renders, priced at
 * today's prices. That is why it survives a reload, a second tab, and a phone
 * going to sleep — the three things that actually happen to a shopping basket,
 * and none of which a React state object survives.
 *
 * ---------------------------------------------------------------------------
 * **The total is shown before the checkout, in full, with delivery in it.**
 *
 * A delivery charge that appears for the first time on the last screen is the
 * single most common reason a basket is abandoned, and it is a self-inflicted
 * one. The line saying how much more to spend for free delivery is the same
 * honesty pointed the other way.
 */
export default async function CartPage({ params }: Props) {
  const { variant: slug } = await params;

  const variant = await getVariant(slug);
  if (!variant) notFound();

  const cart = await readCart(variant.id);
  const base = `/${variant.slug}`;
  const away = awayFromFreeShipping(
    cart.itemsPaise - cart.discountPaise,
    variant.freeShippingAbove,
  );

  /*
    An empty basket is a page, not an error.

    It gets the same band as a full one — the same eyebrow, the same heading
    treatment — because it is a real state a customer reaches, usually by
    clicking the basket before adding anything, and a bare line of grey text
    there reads as a site that has broken rather than a basket that is empty.
  */
  if (cart.lines.length === 0) {
    return (
      <>
        <PageBand
          eyebrow={variant.industryLabel}
          heading="Nothing in the basket"
          intro="Add something from the shop and it will be here — including if you close this tab and come back tomorrow."
        >
          <Link href={`${base}/shop`} className="btn">
            See the shop
          </Link>
        </PageBand>

        <div className="container-page py-20 text-center">
          <span className="enter inline-flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
            <ShoppingBag className="size-5" aria-hidden />
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBand
        eyebrow={variant.industryLabel}
        heading="Basket"
        intro="Every line is what you pay: the delivery is shown from the first item, and nothing is added at the end."
        facts={[
          { label: "Lines", value: String(cart.lines.length) },
        ]}
      />

      <div className="container-page py-14">

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-border border-y border-border">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center gap-4 py-5">
              <div className="min-w-0 flex-1">
                <Link
                  href={`${base}/shop/${line.slug}`}
                  className="font-medium hover:underline"
                >
                  {line.name}
                </Link>

                {line.optionLabel && (
                  <p className="mt-0.5 text-sm text-muted">{line.optionLabel}</p>
                )}

                <p className="mt-1 text-xs text-muted">
                  {formatMoney(line.unitPaise, variant.currencySymbol)} each
                  {line.stock !== null && line.stock < line.quantity && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      only {line.stock} left
                    </span>
                  )}
                </p>
              </div>

              <LineQuantity
                variant={variant.slug}
                line={line.id}
                quantity={line.quantity}
                stock={line.stock}
              />

              <span className="w-24 shrink-0 text-right font-medium tabular-nums">
                {formatMoney(line.linePaise, variant.currencySymbol)}
              </span>
            </li>
          ))}
        </ul>

        {/* --------------------------------------------------------------- */}
        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">
                  {cart.itemCount} {cart.itemCount === 1 ? "thing" : "things"}
                </dt>
                <dd className="tabular-nums">
                  {formatMoney(cart.itemsPaise, variant.currencySymbol)}
                </dd>
              </div>

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

              <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatMoney(cart.grandTotalPaise, variant.currencySymbol)}
                </dd>
              </div>
            </dl>

            {away !== null && (
              <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
                {formatMoney(away, variant.currencySymbol)} more for free delivery.
              </p>
            )}

            <Link
              href={`${base}/checkout`}
              className="mt-6 block rounded-lg bg-accent px-6 py-3 text-center text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              Checkout
            </Link>

            <Link
              href={`${base}/shop`}
              className="mt-3 block text-center text-sm text-muted hover:text-text"
            >
              Keep looking
            </Link>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <CouponBox
              variant={variant.slug}
              applied={cart.couponCode}
              note={cart.couponMessage}
            />
          </div>
        </aside>
      </div>
      </div>
    </>
  );
}
