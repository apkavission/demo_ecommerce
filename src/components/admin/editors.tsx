"use client";

import { useActionState, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { Copy, CopyPlus, Link2Off } from "lucide-react";
import {
  cloneVariant,
  createShareLink,
  revokeShareLink,
  saveCoupon,
  saveFaq,
  saveProduct,
  setPublished,
  setStock,
  setVisibility,
  updateOrder,
} from "@/lib/actions/admin";
import { idleState, type FormState } from "@/lib/form-state";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import type {
  CollectionRow,
  CouponRow,
  FaqRow,
  OrderRow,
  ProductRow,
} from "@/types/database";

const FIELD =
  "block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

function Message({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "text-sm",
        state.status === "error" ? "text-red-600 dark:text-red-400" : "text-muted",
      )}
    >
      {state.message}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

const ORDER_STATES = [
  "placed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

const PAYMENT_STATES = ["pending", "paid", "refunded", "failed"] as const;

/**
 * Moving one order along.
 *
 * **Each state is a button, not an option in a dropdown.** Packing is done
 * standing up, often on a phone, and a select that needs two taps and a scroll
 * is the difference between the panel being used and a WhatsApp group being used
 * instead.
 *
 * The current state is shown as pressed rather than removed from the row, so
 * the sequence stays visible — somebody can see that shipped comes after packed
 * without having to know it.
 */
export function OrderControls({ order }: { order: OrderRow }) {
  const [state, action, pending] = useActionState(updateOrder, idleState);
  useBusyWhile(pending, "Saving order");

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="id" value={order.id} />

        {ORDER_STATES.map((next) => (
          <button
            key={next}
            type="submit"
            name="status"
            value={next}
            disabled={pending || next === order.status}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:cursor-default",
              next === order.status
                ? "bg-accent text-accent-fg"
                : "border border-border text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {next}
          </button>
        ))}
      </form>

      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={order.id} />
        <span className="text-xs text-muted">Payment</span>

        {PAYMENT_STATES.map((next) => (
          <button
            key={next}
            type="submit"
            name="payment"
            value={next}
            disabled={pending || next === order.payment}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs capitalize transition-colors disabled:cursor-default",
              next === order.payment
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:text-text",
            )}
          >
            {next}
          </button>
        ))}
      </form>

      <Message state={state} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The catalogue                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The stock box.
 *
 * **Its own tiny form, separate from the product editor**, because it is the
 * one field somebody changes forty times a day and opening a nine-field form to
 * change a number is how a panel stops being used.
 *
 * Empty means uncounted, and the hint says so. A zero left in a box somebody
 * meant to clear takes a product off sale.
 */
export function StockBox({ product }: { product: ProductRow }) {
  const [state, action, pending] = useActionState(setStock, idleState);
  useBusyWhile(pending, "Saving stock");

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={product.id} />

      <input
        name="stock"
        defaultValue={product.stock ?? ""}
        inputMode="numeric"
        placeholder="—"
        aria-label={`Stock for ${product.name}`}
        className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm tabular-nums focus:border-accent focus:outline-none"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        {pending ? "…" : "Save"}
      </button>

      {state.status === "error" && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.message}
        </span>
      )}
    </form>
  );
}

export function PublishToggle({
  table,
  id,
  status,
}: {
  table: "products" | "collections" | "team" | "testimonials" | "faqs";
  id: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(setPublished, idleState);
  useBusyWhile(pending, "Saving published");
  const next = status === "published" ? "draft" : "published";

  return (
    <form action={action}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
          status === "published"
            ? "bg-accent-soft text-accent"
            : "bg-surface-2 text-muted hover:text-text",
        )}
      >
        {pending ? "…" : status === "published" ? "On the site" : "Draft"}
      </button>

      {state.status === "error" && (
        <span role="alert" className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.message}
        </span>
      )}
    </form>
  );
}

/**
 * Adding or editing one product.
 *
 * Prices are typed in rupees and stored in paise. The box says rupees, the
 * database holds paise, and `parseMoney` is the only thing that crosses between
 * them — which is the arrangement that stops somebody typing 129900 because a
 * previous screen showed it that way.
 */
export function ProductEditor({
  variantId,
  collections,
  product,
  onDone,
}: {
  variantId: string;
  collections: CollectionRow[];
  product?: ProductRow;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveProduct, idleState);
  useBusyWhile(pending, "Saving product");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="variant_id" value={variantId} />
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Name</span>
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={product?.name}
            className={FIELD}
          />
          {state.fieldErrors?.name && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.name}
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-muted">Address</span>
          <input
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]*"
            maxLength={80}
            defaultValue={product?.slug}
            className={FIELD}
          />
          {state.fieldErrors?.slug && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.slug}
            </span>
          )}
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-muted">One line about it</span>
        <input
          name="summary"
          maxLength={300}
          defaultValue={product?.summary ?? ""}
          className={FIELD}
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">The longer description</span>
        <textarea
          name="description"
          rows={4}
          maxLength={4000}
          defaultValue={product?.description ?? ""}
          className={FIELD}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-muted">Price (₹)</span>
          <input
            name="price"
            required
            inputMode="decimal"
            defaultValue={product ? (product.price_paise / 100).toString() : ""}
            className={FIELD}
          />
          {state.fieldErrors?.price && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.price}
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-muted">Was (₹)</span>
          <input
            name="compare_at"
            inputMode="decimal"
            placeholder="Optional"
            defaultValue={
              product?.compare_at_paise ? (product.compare_at_paise / 100).toString() : ""
            }
            className={FIELD}
          />
          {state.fieldErrors?.compare_at && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.compare_at}
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-muted">Stock</span>
          <input
            name="stock"
            inputMode="numeric"
            placeholder="Empty = uncounted"
            defaultValue={product?.stock ?? ""}
            className={FIELD}
          />
          {state.fieldErrors?.stock && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.stock}
            </span>
          )}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-muted">Collection</span>
          <select
            name="collection_id"
            defaultValue={product?.collection_id ?? ""}
            className={FIELD}
          >
            <option value="">None</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">Code</span>
          <input
            name="sku"
            maxLength={60}
            defaultValue={product?.sku ?? ""}
            className={FIELD}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Specification line</span>
          <input
            name="meta_label"
            maxLength={120}
            defaultValue={product?.meta_label ?? ""}
            className={FIELD}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_featured"
            value="true"
            defaultChecked={product?.is_featured}
            className="size-4 rounded border-border"
          />
          Show on the front page
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">State</span>
          <select
            name="status"
            defaultValue={product?.status ?? "published"}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="published">On the site</option>
            <option value="draft">Draft</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Order</span>
          <input
            name="sort_order"
            inputMode="numeric"
            defaultValue={product?.sort_order ?? 0}
            className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {pending && <BrandSpinner />}
          {pending ? "Saving" : product ? "Save" : "Add it"}
        </button>

        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-muted hover:text-text"
          >
            Close
          </button>
        )}

        <Message state={state} />
      </div>
    </form>
  );
}

/** The add form, kept shut until it is wanted. */
export function AddProduct({
  variantId,
  collections,
}: {
  variantId: string;
  collections: CollectionRow[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
      >
        Add something
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <h3 className="font-display mb-4 text-lg font-semibold">Something new</h3>
      <ProductEditor
        variantId={variantId}
        collections={collections}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}

/** One row of the catalogue, which opens into the full form. */
export function ProductRowEditor({
  product,
  collections,
  symbol,
}: {
  product: ProductRow;
  collections: CollectionRow[];
  symbol: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-b border-border py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block font-medium">{product.name}</span>
          <span className="block text-xs text-muted">
            {formatMoney(product.price_paise, symbol)}
            {product.sku && ` · ${product.sku}`}
          </span>
        </button>

        <StockBox product={product} />

        <PublishToggle table="products" id={product.id} status={product.status} />
      </div>

      {open && (
        <div className="mt-5 rounded-lg bg-surface-2 p-5">
          <ProductEditor
            variantId={product.variant_id}
            collections={collections}
            product={product}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Discount codes                                                              */
/* -------------------------------------------------------------------------- */

export function CouponEditor({
  variantId,
  coupon,
  symbol,
}: {
  variantId: string;
  coupon?: CouponRow;
  symbol: string;
}) {
  const [state, action, pending] = useActionState(saveCoupon, idleState);
  useBusyWhile(pending, "Saving coupon");
  const [kind, setKind] = useState<"percent" | "amount">(coupon?.kind ?? "percent");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="variant_id" value={variantId} />
      {coupon && <input type="hidden" name="id" value={coupon.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Code</span>
          <input
            name="code"
            required
            maxLength={40}
            defaultValue={coupon?.code}
            className={cn(FIELD, "uppercase")}
          />
          {state.fieldErrors?.code && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.code}
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-muted">What it says at the checkout</span>
          <input
            name="description"
            maxLength={200}
            defaultValue={coupon?.description ?? ""}
            className={FIELD}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-muted">Kind</span>
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as "percent" | "amount")}
            className={FIELD}
          >
            <option value="percent">Percentage off</option>
            <option value="amount">Amount off</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">{kind === "percent" ? "Per cent" : `Off (${symbol})`}</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={
              coupon
                ? coupon.kind === "percent"
                  ? coupon.amount
                  : (coupon.amount / 100).toString()
                : ""
            }
            className={FIELD}
          />
          {state.fieldErrors?.amount && (
            <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.amount}
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-muted">Minimum basket ({symbol})</span>
          <input
            name="min_order"
            inputMode="decimal"
            placeholder="0"
            defaultValue={
              coupon?.min_order_paise ? (coupon.min_order_paise / 100).toString() : ""
            }
            className={FIELD}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-muted">Uses allowed</span>
          <input
            name="max_uses"
            inputMode="numeric"
            placeholder="Unlimited"
            defaultValue={coupon?.max_uses ?? ""}
            className={FIELD}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Stops on</span>
          <input
            name="ends_at"
            type="date"
            defaultValue={coupon?.ends_at ? coupon.ends_at.slice(0, 10) : ""}
            className={FIELD}
          />
        </label>

        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            value="true"
            defaultChecked={coupon?.is_active ?? true}
            className="size-4 rounded border-border"
          />
          In use
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {pending && <BrandSpinner />}
          {pending ? "Saving" : coupon ? "Save" : "Make it"}
        </button>

        <Message state={state} />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Questions                                                                   */
/* -------------------------------------------------------------------------- */

export function FaqEditor({ variantId, faq }: { variantId: string; faq?: FaqRow }) {
  const [state, action, pending] = useActionState(saveFaq, idleState);
  useBusyWhile(pending, "Saving faq");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="variant_id" value={variantId} />
      {faq && <input type="hidden" name="id" value={faq.id} />}

      <input
        name="question"
        required
        maxLength={300}
        placeholder="The question"
        defaultValue={faq?.question}
        className={FIELD}
      />

      <textarea
        name="answer"
        required
        rows={3}
        maxLength={2000}
        placeholder="The answer, as somebody would actually say it"
        defaultValue={faq?.answer}
        className={FIELD}
      />

      <div className="flex items-center gap-3">
        <input
          name="sort_order"
          inputMode="numeric"
          defaultValue={faq?.sort_order ?? 0}
          aria-label="Order"
          className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm tabular-nums"
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {pending ? "Saving" : faq ? "Save" : "Add"}
        </button>

        <Message state={state} />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Which shops exist                                                           */
/* -------------------------------------------------------------------------- */

export function VisibilityToggle({
  id,
  visibility,
}: {
  id: string;
  visibility: string;
}) {
  const [state, action, pending] = useActionState(setVisibility, idleState);
  useBusyWhile(pending, "Saving visibility");
  const next = visibility === "public" ? "link_only" : "public";

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="visibility" value={next} />

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
          visibility === "public"
            ? "bg-accent-soft text-accent hover:opacity-80"
            : "bg-surface-2 text-muted hover:text-text",
        )}
      >
        {pending ? "Saving" : visibility === "public" ? "Anybody can see it" : "Link only"}
      </button>

      <Message state={state} />
    </form>
  );
}

export function CloneVariant({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cloneVariant, idleState);
  useBusyWhile(pending, "Working");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2"
      >
        <CopyPlus className="size-3.5" aria-hidden />
        Copy this one
      </button>
    );
  }

  return (
    <form
      action={action}
      className="w-full space-y-3 rounded-lg border border-border bg-surface-2 p-4"
    >
      <input type="hidden" name="id" value={id} />

      <p className="text-xs text-muted">
        Copies everything {name} sells and says, including its codes, switched
        off. Orders, baskets, messages and links stay where they are.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="text-muted">Name</span>
          <input name="name" required maxLength={120} className={FIELD} />
          {state.fieldErrors?.name && (
            <span className="mt-1 block text-red-600 dark:text-red-400">
              {state.fieldErrors.name}
            </span>
          )}
        </label>

        <label className="block text-xs">
          <span className="text-muted">Address</span>
          <input
            name="slug"
            required
            pattern="[a-z][a-z0-9-]*"
            placeholder="new-shop"
            className={FIELD}
          />
          {state.fieldErrors?.slug && (
            <span className="mt-1 block text-red-600 dark:text-red-400">
              {state.fieldErrors.slug}
            </span>
          )}
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg disabled:opacity-60"
        >
          {pending && <BrandSpinner />}
          {pending ? "Copying" : "Copy"}
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-text"
        >
          Cancel
        </button>

        <Message state={state} />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Share links                                                                 */
/* -------------------------------------------------------------------------- */

export function ShareLinkForm({
  variants,
}: {
  variants: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createShareLink, idleState);
  useBusyWhile(pending, "Creating share link");

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="text-muted">Which shop</span>
        <select name="variant_id" required className={FIELD}>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-muted">Who it is for</span>
        <input
          name="label"
          maxLength={160}
          placeholder="A name you would recognise next week"
          className={FIELD}
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Days it works</span>
        <input
          name="days"
          type="number"
          min={1}
          max={90}
          defaultValue={7}
          className={FIELD}
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Opens allowed</span>
        <input
          name="max_views"
          inputMode="numeric"
          placeholder="Unlimited"
          className={FIELD}
        />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {pending && <BrandSpinner />}
          {pending ? "Making it" : "Make a link"}
        </button>

        <span className="ml-3">
          <Message state={state} />
        </span>
      </div>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* A browser that refuses the clipboard is not an error worth a
             dialog. The address is on the screen and can be selected. */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-surface-2"
    >
      <Copy className="size-3.5" aria-hidden />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function RevokeLink({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revokeShareLink, idleState);
  useBusyWhile(pending, "Working");

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-red-500/50 hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
      >
        <Link2Off className="size-3.5" aria-hidden />
        {pending ? "Closing" : "Close it"}
      </button>

      {state.status === "error" && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.message}
        </span>
      )}
    </form>
  );
}
