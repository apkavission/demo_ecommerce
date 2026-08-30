import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getVariant } from "@/lib/variants";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ variant: string; code: string }> };

/**
 * The confirmation, reachable by its order number.
 *
 * ---------------------------------------------------------------------------
 * **The orders table is closed to the public, and this page still works.**
 *
 * It calls `order_summary`, a `security definer` function that answers about one
 * order and returns what was bought and what it cost — and deliberately no
 * phone number and no address. Somebody who has the code can see the money;
 * nobody can enumerate the customers.
 *
 * The code itself is short and readable aloud, which is the point of it: a uuid
 * is unquotable on the phone and nobody has ever read one out correctly.
 *
 * **It does not carry the address back.** A confirmation page that prints where
 * somebody lives, at a URL guessable by pattern, would be a privacy problem
 * created for the sake of reassurance nobody asked for.
 */
export default async function OrderPage({ params }: Props) {
  const { variant: slug, code } = await params;

  const variant = await getVariant(slug);
  if (!variant) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("order_summary", { p_code: code });

  const order = data?.[0];
  if (!order) notFound();

  const base = `/${variant.slug}`;

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>

        <h1 className="font-display mt-6 text-2xl font-semibold tracking-tight">
          Thank you, {order.customer_name.split(" ")[0]}
        </h1>

        <p className="mt-2 text-sm text-muted">
          Order <span className="font-mono font-semibold text-text">{order.code}</span>,
          placed {formatDate(order.placed_at)}.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-lg rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">
              {order.item_count} {order.item_count === 1 ? "thing" : "things"}
            </dt>
            <dd className="tabular-nums">
              {formatMoney(order.items_paise, variant.currencySymbol)}
            </dd>
          </div>

          {order.discount_paise > 0 && (
            <div className="flex justify-between gap-4 text-accent">
              <dt>Discount</dt>
              <dd className="tabular-nums">
                −{formatMoney(order.discount_paise, variant.currencySymbol)}
              </dd>
            </div>
          )}

          <div className="flex justify-between gap-4">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums">
              {order.shipping_paise === 0
                ? "Free"
                : formatMoney(order.shipping_paise, variant.currencySymbol)}
            </dd>
          </div>

          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
            <dt>Total, on delivery</dt>
            <dd className="tabular-nums">
              {formatMoney(order.grand_total_paise, variant.currencySymbol)}
            </dd>
          </div>
        </dl>

        <p className="mt-5 rounded-lg bg-surface-2 px-4 py-3 text-xs text-muted">
          Currently <span className="font-medium text-text">{order.status}</span>. In a
          real shop this moves as somebody packs it. Nothing here is dispatched
          and no money is taken — this is a demonstration.
        </p>
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href={`${base}/shop`} className="text-accent hover:underline">
          Back to the shop
        </Link>
      </p>
    </div>
  );
}
