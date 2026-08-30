import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { availableStock, shippingFor } from "@/lib/money";
import type { CartItemRow, ProductOptionRow, ProductRow } from "@/types/database";

/**
 * The basket.
 *
 * ---------------------------------------------------------------------------
 * **It belongs to a browser, not to an account.**
 *
 * There are no customer accounts in this demo, and inventing them would be a
 * week of sign-up screens nobody asked to see. A basket is a row keyed by a
 * random token, and the token lives in an httpOnly cookie.
 *
 * The token is a **name, not a key**. What it opens is a list of product ids
 * and quantities — nothing anybody would want, and deliberately so. Copy
 * somebody's cookie and you get to see that they were thinking about a shirt.
 * Putting an address in here to save the customer typing it would turn that
 * into a real privacy problem for the sake of a demo.
 *
 * ---------------------------------------------------------------------------
 * **Every function here runs on the server with the service role, and that is
 * the only honest way to do it.**
 *
 * A row policy cannot see a cookie. Writing one that reads `true` and calling
 * it security would be a lie in a comment. So the basket tables are closed to
 * everybody signed in except for reading — the panel shows abandoned baskets —
 * and the writing happens here, where the token is checked against the row
 * before anything is changed.
 */

const CART_COOKIE = "demo-shop-basket";

/** Thirty days. Long enough to come back on Monday, short enough to expire. */
const CART_MAX_AGE = 60 * 60 * 24 * 30;

export interface CartLine {
  id: string;
  productId: string;
  optionId: string | null;
  quantity: number;
  name: string;
  slug: string;
  optionLabel: string | null;
  unitPaise: number;
  linePaise: number;
  /** What is left on the shelf for this exact line, or null if uncounted. */
  stock: number | null;
}

export interface CartView {
  token: string;
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  itemsPaise: number;
  discountPaise: number;
  couponCode: string | null;
  couponMessage: string | null;
  shippingPaise: number;
  grandTotalPaise: number;
}

export function emptyCart(token = ""): CartView {
  return {
    token,
    cartId: null,
    lines: [],
    itemCount: 0,
    itemsPaise: 0,
    discountPaise: 0,
    couponCode: null,
    couponMessage: null,
    shippingPaise: 0,
    grandTotalPaise: 0,
  };
}

/** The token this browser is carrying, without creating one. */
export async function readCartToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

/**
 * The token this browser is carrying, creating one if it has none.
 *
 * Only called from a server action — a cookie cannot be set while rendering a
 * page, and a `GET` that quietly issues an identifier to every visitor is
 * tracking whether or not anybody meant it that way.
 */
export async function ensureCartToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const token = randomBytes(24).toString("base64url");

  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_MAX_AGE,
  });

  return token;
}

export async function forgetCart(): Promise<void> {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}

/**
 * What is in the basket, priced at today's prices.
 *
 * Prices are read from the catalogue every time rather than stored on the line.
 * A basket left for a week and then checked out must be charged at the price on
 * the page it is looking at now, and the alternative — a price frozen at the
 * moment of adding — is a shop that quietly sells at last month's rate.
 *
 * The order flips at exactly one point, `place_order`, where the price becomes
 * a historical fact rather than a current one.
 */
export async function readCart(variantId: string): Promise<CartView> {
  const token = await readCartToken();
  if (!token) return emptyCart();

  const db = createAdminClient();

  const { data: cart } = await db
    .from("carts")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  /* A basket for another shop is not this shop's basket. Somebody switching
     from the grocery to the clothing demo starts empty rather than seeing
     three kilos of rice under a shirt. */
  if (!cart || cart.variant_id !== variantId) return emptyCart(token);

  const { data: items } = await db
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id)
    .order("added_at");

  const rows: CartItemRow[] = items ?? [];
  if (rows.length === 0) return { ...emptyCart(token), cartId: cart.id };

  const [{ data: products }, { data: options }] = await Promise.all([
    db.from("products").select("*").in("id", rows.map((r) => r.product_id)),
    db
      .from("product_options")
      .select("*")
      .in("id", rows.map((r) => r.option_id).filter((id): id is string => Boolean(id))),
  ]);

  const productById = new Map<string, ProductRow>(
    (products ?? []).map((p) => [p.id, p]),
  );
  const optionById = new Map<string, ProductOptionRow>(
    (options ?? []).map((o) => [o.id, o]),
  );

  const lines: CartLine[] = [];
  let itemsPaise = 0;
  let itemCount = 0;

  for (const row of rows) {
    const product = productById.get(row.product_id);
    if (!product) continue;

    const option = row.option_id ? optionById.get(row.option_id) : undefined;
    const unit = product.price_paise + (option?.price_delta_paise ?? 0);

    lines.push({
      id: row.id,
      productId: product.id,
      optionId: option?.id ?? null,
      quantity: row.quantity,
      name: product.name,
      slug: product.slug,
      optionLabel: option ? `${option.label}: ${option.value}` : null,
      unitPaise: unit,
      linePaise: unit * row.quantity,
      stock: availableStock(product.stock, option?.stock ?? null),
    });

    itemsPaise += unit * row.quantity;
    itemCount += row.quantity;
  }

  /* The coupon is re-checked here rather than trusted from the row. One applied
     on Friday and expired by Monday must stop showing a discount the moment the
     basket is opened, not at the checkout — otherwise the total changes on the
     last screen, which reads as a trick. */
  let discountPaise = 0;
  let couponCode: string | null = null;
  let couponMessage: string | null = null;

  if (cart.coupon_id) {
    const { data: coupon } = await db
      .from("coupons")
      .select("*")
      .eq("id", cart.coupon_id)
      .maybeSingle();

    if (coupon) {
      const { data: verdict } = await db.rpc("check_coupon", {
        p_variant_id: variantId,
        p_code: coupon.code,
        p_items_paise: itemsPaise,
      });

      const answer = verdict?.[0];
      couponCode = coupon.code;

      if (answer?.verdict === "ok") {
        discountPaise = answer.discount_paise;
        couponMessage = answer.message;
      } else {
        couponMessage = answer?.message ?? "That code cannot be used now.";
      }
    }
  }

  const { data: shop } = await db
    .from("variants")
    .select("shipping_paise, free_shipping_above")
    .eq("id", variantId)
    .maybeSingle();

  const shippingPaise = shippingFor(
    itemsPaise - discountPaise,
    shop?.shipping_paise ?? 0,
    shop?.free_shipping_above ?? null,
  );

  return {
    token,
    cartId: cart.id,
    lines,
    itemCount,
    itemsPaise,
    discountPaise,
    couponCode,
    couponMessage,
    shippingPaise,
    grandTotalPaise: itemsPaise - discountPaise + shippingPaise,
  };
}

/** How many things are in the basket, for the number on the header button. */
export async function cartCount(variantId: string): Promise<number> {
  const token = await readCartToken();
  if (!token) return 0;

  const db = createAdminClient();

  const { data: cart } = await db
    .from("carts")
    .select("id, variant_id")
    .eq("token", token)
    .maybeSingle();

  if (!cart || cart.variant_id !== variantId) return 0;

  const { data } = await db
    .from("cart_totals")
    .select("item_count")
    .eq("cart_id", cart.id)
    .maybeSingle();

  return data?.item_count ?? 0;
}

/**
 * The basket row for this browser and this shop, made if it is not there.
 *
 * A basket belonging to a different shop is replaced rather than migrated: the
 * products in it do not exist here, and carrying the row over would give the
 * clothing shop a basket full of foreign ids.
 */
export async function openCart(variantId: string, token: string): Promise<string | null> {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("carts")
    .select("id, variant_id")
    .eq("token", token)
    .maybeSingle();

  if (existing) {
    if (existing.variant_id === variantId) return existing.id;
    await db.from("carts").delete().eq("id", existing.id);
  }

  const { data, error } = await db
    .from("carts")
    .insert({ variant_id: variantId, token })
    .select("id")
    .single();

  if (error) {
    console.error("[cart] could not open a basket:", error.message);
    return null;
  }

  return data.id;
}
