import type { Metadata } from "next";
import { OrderControls } from "@/components/admin/editors";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { OrderItemRow } from "@/types/database";

export const metadata: Metadata = { title: "Orders" };

/**
 * Every order, with what is in it.
 *
 * **The lines are shown open rather than behind a click.** Packing an order
 * means reading what is in it, and a list where every row has to be expanded to
 * be useful is a list that gets printed out instead.
 *
 * **The address is here and the panel is behind a sign-in.** That is the whole
 * protection, and it is the correct one — somebody has to be able to read where
 * to send it. What is *not* here is anything a shop does not need: no card
 * details are ever collected, so there are none to leak.
 */
export default async function OrdersPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [orders, items, totals] = await Promise.all([
    supabase.from("orders").select("*").order("placed_at", { ascending: false }).limit(100),
    supabase.from("order_items").select("*"),
    supabase.from("order_totals").select("*"),
  ]);

  const byOrder = new Map<string, OrderItemRow[]>();
  for (const item of items.data ?? []) {
    const list = byOrder.get(item.order_id) ?? [];
    list.push(item);
    byOrder.set(item.order_id, list);
  }

  const totalFor = new Map(
    (totals.data ?? []).map((row) => [row.order_id, row.grand_total_paise ?? 0]),
  );

  const rows = orders.data ?? [];

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="measure mt-2 text-muted">
          {rows.length === 0
            ? "Nothing yet."
            : `${rows.length} ${rows.length === 1 ? "order" : "orders"}, newest first. Nothing here is ever dispatched.`}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-[var(--radius-card)] border border-dashed border-border p-12 text-center text-sm text-muted">
          Place an order from the shop and it will be here.
        </p>
      ) : (
        <ul className="mt-10 space-y-5">
          {rows.map((order) => (
            <li
              key={order.id}
              id={order.code}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-6 scroll-mt-24"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">{order.code}</p>
                  <p className="mt-1 text-sm">
                    {order.customer_name} · {order.phone}
                  </p>
                  <p className="measure mt-1 text-sm text-muted">
                    {order.address_line}, {order.city} {order.pincode}
                  </p>
                  {order.note && (
                    <p className="measure mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                      {order.note}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {formatMoney(totalFor.get(order.id) ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDate(order.placed_at)}</p>
                  {order.coupon_code && (
                    <p className="mt-1 text-xs text-accent">{order.coupon_code}</p>
                  )}
                </div>
              </div>

              <ul className="mt-5 divide-y divide-border border-y border-border text-sm">
                {(byOrder.get(order.id) ?? []).map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 py-2.5">
                    <span className="min-w-0">
                      {item.product_name}
                      {item.option_label && (
                        <span className="ml-2 text-xs text-muted">{item.option_label}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {item.quantity} × {formatMoney(item.unit_price_paise)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                <OrderControls order={order} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
