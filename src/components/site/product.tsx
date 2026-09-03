"use client";

import { useActionState, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { addToCart, applyCoupon, setQuantity } from "@/lib/actions/public";
import { idleState, type FormState } from "@/lib/form-state";
import { discountPercent, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductOptionRow, ProductRow } from "@/types/database";
import { useBusyWhile } from "@/components/forms/use-busy-while";

/**
 * The bits of a shop a visitor actually touches.
 *
 * ---------------------------------------------------------------------------
 * **Every one of these is a form, and every form posts to a server action.**
 *
 * No fetch, no client-side cart, no state in a context that disappears on
 * reload. The basket is a row in Postgres and the page is a rendering of it,
 * which means it survives a refresh, a second tab, and a phone going to sleep
 * on the checkout page — the three things that actually happen to a shopping
 * basket and none of which a React state object survives.
 *
 * It also means every one of these works with JavaScript off, which is not a
 * principle so much as a consequence, but it is worth not throwing away.
 */

function Message({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "text-xs",
        state.status === "error" ? "text-red-600 dark:text-red-400" : "text-accent",
      )}
    >
      {state.message}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* One product, on a list                                                      */
/* -------------------------------------------------------------------------- */

export function ProductCard({
  product,
  base,
  symbol,
  optionCount,
}: {
  product: ProductRow;
  base: string;
  symbol: string;
  optionCount: number;
}) {
  const off = discountPercent(product.price_paise, product.compare_at_paise);
  const soldOut = product.stock !== null && product.stock <= 0;

  return (
    <li
      className={cn(
        "group relative flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-shadow",
        soldOut ? "opacity-70" : "hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold leading-snug">
          <Link href={`${base}/shop/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        {off !== null && !soldOut && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            {off}% off
          </span>
        )}
      </div>

      {product.summary && (
        <p className="mt-2 line-clamp-2 text-sm text-muted">{product.summary}</p>
      )}

      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-lg font-semibold">
          {formatMoney(product.price_paise, symbol)}
        </span>
        {product.compare_at_paise !== null && (
          <span className="text-sm text-muted line-through">
            {formatMoney(product.compare_at_paise, symbol)}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        {soldOut ? (
          <span className="font-medium text-red-600 dark:text-red-400">Sold out</span>
        ) : (
          <>
            {product.meta_label}
            {optionCount > 0 && (
              <>
                {product.meta_label ? " · " : ""}
                {optionCount} to choose from
              </>
            )}
            {/*
              A low-stock line only below five. "23 left" is not urgency, it is
              noise, and a shop that shouts about every number stops being
              believed about any of them.
            */}
            {product.stock !== null && product.stock > 0 && product.stock < 5 && (
              <span className="text-accent">
                {product.meta_label || optionCount > 0 ? " · " : ""}
                only {product.stock} left
              </span>
            )}
          </>
        )}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Adding one to the basket                                                    */
/* -------------------------------------------------------------------------- */

export function AddToCart({
  variant,
  product,
  options,
  symbol,
}: {
  variant: string;
  product: ProductRow;
  options: ProductOptionRow[];
  symbol: string;
}) {
  const [state, action, pending] = useActionState(addToCart, idleState);
  useBusyWhile(pending, "Adding to cart");
  const [chosen, setChosen] = useState(options[0]?.id ?? "");
  const [quantity, setLocalQuantity] = useState(1);

  const option = options.find((entry) => entry.id === chosen);
  const stock = option?.stock ?? product.stock;
  const soldOut = stock !== null && stock <= 0;
  const unit = product.price_paise + (option?.price_delta_paise ?? 0);

  /* Grouped by label, so a product with a size *and* a colour asks two
     questions rather than showing eight buttons in one row. */
  const groups = options.reduce<Map<string, ProductOptionRow[]>>((map, entry) => {
    const list = map.get(entry.label) ?? [];
    list.push(entry);
    map.set(entry.label, list);
    return map;
  }, new Map());

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="product" value={product.id} />
      <input type="hidden" name="option" value={chosen} />
      <input type="hidden" name="quantity" value={quantity} />

      {[...groups.entries()].map(([label, entries]) => (
        <fieldset key={label}>
          <legend className="text-sm font-medium">{label}</legend>

          <div className="mt-2 flex flex-wrap gap-2">
            {entries.map((entry) => {
              const out = entry.stock !== null && entry.stock <= 0;

              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={out}
                  onClick={() => setChosen(entry.id)}
                  aria-pressed={chosen === entry.id}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    out && "cursor-not-allowed text-muted line-through opacity-60",
                    chosen === entry.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border hover:bg-surface-2",
                  )}
                >
                  {entry.value}
                  {entry.price_delta_paise !== 0 && (
                    <span className="ml-1.5 text-xs text-muted">
                      {entry.price_delta_paise > 0 ? "+" : ""}
                      {formatMoney(entry.price_delta_paise, symbol)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setLocalQuantity((n) => Math.max(1, n - 1))}
            className="px-3 py-2 text-muted hover:text-text"
            aria-label="One fewer"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="min-w-8 text-center text-sm tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() =>
              setLocalQuantity((n) => Math.min(stock ?? 99, Math.min(99, n + 1)))
            }
            className="px-3 py-2 text-muted hover:text-text"
            aria-label="One more"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <button
          type="submit"
          disabled={pending || soldOut}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending && <BrandSpinner />}
          {soldOut ? "Sold out" : `Add · ${formatMoney(unit * quantity, symbol)}`}
        </button>
      </div>

      <Message state={state} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Changing a line in the basket                                               */
/* -------------------------------------------------------------------------- */

export function LineQuantity({
  variant,
  line,
  quantity,
  stock,
}: {
  variant: string;
  line: string;
  quantity: number;
  stock: number | null;
}) {
  const [state, action, pending] = useActionState(setQuantity, idleState);
  useBusyWhile(pending, "Saving quantity");

  /*
    Three separate submit buttons rather than one input and a save.

    A number field with a Save beside it means every change is two actions and a
    forgotten one silently does nothing — the basket says three, the order is
    for two, and nobody finds out until it arrives.
  */
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="line" value={line} />

      <button
        type="submit"
        name="quantity"
        value={quantity - 1}
        disabled={pending || quantity <= 1}
        className="rounded-md border border-border p-1.5 text-muted transition-colors hover:text-text disabled:opacity-40"
        aria-label="One fewer"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>

      <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
        {pending ? "…" : quantity}
      </span>

      <button
        type="submit"
        name="quantity"
        value={quantity + 1}
        disabled={pending || (stock !== null && quantity >= stock)}
        className="rounded-md border border-border p-1.5 text-muted transition-colors hover:text-text disabled:opacity-40"
        aria-label="One more"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>

      <button
        type="submit"
        name="quantity"
        value={0}
        disabled={pending}
        className="ml-2 rounded-md p-1.5 text-muted transition-colors hover:text-red-600 dark:hover:text-red-400"
        aria-label="Remove this line"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>

      {state.status === "error" && (
        <span role="alert" className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.message}
        </span>
      )}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Discount codes                                                              */
/* -------------------------------------------------------------------------- */

export function CouponBox({
  variant,
  applied,
  note,
}: {
  variant: string;
  applied: string | null;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(applyCoupon, idleState);
  useBusyWhile(pending, "Applying coupon");

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="variant" value={variant} />

      <label className="block text-sm font-medium" htmlFor="code">
        Discount code
      </label>

      <div className="flex gap-2">
        <input
          id="code"
          name="code"
          defaultValue={applied ?? ""}
          placeholder="Have one?"
          maxLength={40}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          {pending ? "…" : applied ? "Change" : "Apply"}
        </button>
      </div>

      {/* The database's own sentence, shown as it arrives. "Spend ₹200 more to
          use that code" is worth four times "invalid code". */}
      {state.status === "idle" && note && <p className="text-xs text-muted">{note}</p>}
      <Message state={state} />

      <p className="text-xs text-muted">Clear the box and apply to remove a code.</p>
    </form>
  );
}
