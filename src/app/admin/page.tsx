import Link from "next/link";
import { IndianRupee, Package, MessageSquare, ShoppingCart } from "lucide-react";
import { isManager, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

/**
 * The first screen, and it differs by role.
 *
 * ---------------------------------------------------------------------------
 * **What each tier sees is what each tier can act on.**
 *
 * Somebody packing orders opens this to find out what to pack. A manager opens
 * it to find out how the week went. Showing both people both things means each
 * of them scrolls past half a screen to reach their half, every time.
 *
 * So the money is a manager's, and the queue is everybody's — and the money is
 * **absent** for staff rather than hidden behind a lock. A blurred figure with a
 * padlock on it is an invitation to ask what the number is.
 *
 * ---------------------------------------------------------------------------
 * **Every number here is counted, not stored.**
 *
 * Revenue is summed from the order lines through `order_totals`, a view. There
 * is no `total` column to go stale, no nightly job to fail quietly, and no
 * second copy of the truth to disagree with the first.
 */
export default async function Dashboard() {
  const session = await requireAdmin();
  const manager = await isManager();

  const supabase = await createClient();

  const [orders, unread, lowStock, baskets] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(8),
    supabase
      .from("messages")
      .select("id, name, body, created_at")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("id, name, stock, slug")
      .not("stock", "is", null)
      .lte("stock", 3)
      .order("stock")
      .limit(6),
    supabase.from("cart_totals").select("cart_id, item_count").gt("item_count", 0),
  ]);

  const recent = orders.data ?? [];
  const open = recent.filter((order) =>
    ["placed", "packed", "shipped"].includes(order.status),
  );

  /* Money is only fetched for somebody who may see it. Fetching it and then not
     rendering it would put it in the page's data anyway, which is the version
     of this mistake that actually leaks. */
  let takings = 0;
  let takingsCount = 0;

  if (manager) {
    const { data } = await supabase
      .from("order_totals")
      .select("grand_total_paise, order_id");

    const paid = new Set(
      recent.filter((order) => order.status !== "cancelled").map((order) => order.id),
    );

    for (const row of data ?? []) {
      if (row.order_id && paid.has(row.order_id)) {
        takings += row.grand_total_paise ?? 0;
        takingsCount += 1;
      }
    }
  }

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Hello, {session.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-muted">
          {manager
            ? "Everything that has happened, and everything waiting."
            : "What is waiting to be packed and sent."}
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Package className="size-4" aria-hidden />}
          label="Waiting"
          value={String(open.length)}
          hint="placed, packed or on the way"
        />
        <Stat
          icon={<ShoppingCart className="size-4" aria-hidden />}
          label="Baskets left open"
          value={String((baskets.data ?? []).length)}
          hint="somebody added something and stopped"
        />
        <Stat
          icon={<MessageSquare className="size-4" aria-hidden />}
          label="Unread messages"
          value={String((unread.data ?? []).length)}
          hint="from the contact page"
        />
        {manager && (
          <Stat
            icon={<IndianRupee className="size-4" aria-hidden />}
            label="Last 8 orders"
            value={formatMoney(takings)}
            hint={`${takingsCount} counted, cancellations excluded`}
          />
        )}
      </ul>

      {/* ---------------------------------------------------------------- */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">Latest orders</h2>
          <Link href="/admin/orders" className="text-sm text-accent hover:underline">
            All of them
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-sm text-muted">
            Nothing ordered yet. Place one from the shop and it appears here a
            second later — that is the part worth showing somebody.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {recent.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-4 py-4">
                <Link
                  href={`/admin/orders#${order.code}`}
                  className="min-w-0 flex-1 font-mono text-sm hover:underline"
                >
                  {order.code}
                </Link>

                <span className="min-w-0 flex-1 truncate text-sm">
                  {order.customer_name}
                  <span className="ml-2 text-xs text-muted">{order.city}</span>
                </span>

                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs capitalize">
                  {order.status}
                </span>

                <span className="text-xs text-muted">{formatDate(order.placed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {manager && (lowStock.data ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Running out</h2>
          <p className="mt-1 text-sm text-muted">
            Three or fewer left. A zero here means the product is showing as sold
            out on the site right now.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(lowStock.data ?? []).map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              >
                <span className="truncate">{product.name}</span>
                <span
                  className={
                    product.stock === 0
                      ? "font-semibold text-red-600 dark:text-red-400"
                      : "font-semibold text-accent"
                  }
                >
                  {product.stock}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {(unread.data ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Unread messages</h2>

          <ul className="mt-5 space-y-3">
            {(unread.data ?? []).map((message) => (
              <li
                key={message.id}
                className="card p-5"
              >
                <p className="text-sm font-medium">{message.name}</p>
                <p className="measure mt-1.5 text-sm text-muted">{message.body}</p>
                <p className="mt-2 text-xs text-muted">{formatDate(message.created_at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <li className="card p-5">
      <p className="flex items-center gap-2 text-xs text-muted">
        <span className="text-accent">{icon}</span>
        {label}
      </p>
      <p className="font-display mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </li>
  );
}
