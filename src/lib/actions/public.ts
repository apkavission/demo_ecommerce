"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { acknowledgeOrder } from "@/lib/email/acknowledge";
import { fieldErrors, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCartToken, forgetCart, openCart, readCartToken } from "@/lib/cart";

/**
 * Everything a visitor can do without signing in.
 *
 * **A demo that cannot be used is a picture.** The whole argument this makes to
 * a prospect is "your shop would work like this" — so the basket is a real row,
 * the stock really goes down, and the order appears in the panel a second later
 * where somebody can move it along. That moment is what sells the build.
 *
 * ---------------------------------------------------------------------------
 * **Nothing here trusts what the form says a thing costs, or which shop it
 * belongs to.**
 *
 * The slug is looked up on the server and its id is what gets written. Prices
 * are read from the catalogue, never posted. A hidden `variant_id` or a hidden
 * `price` would both be fields a browser can edit, and the fact that this
 * demo's data is invented is not a reason to build the habit.
 */

async function variantIdFor(slug: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("variants")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return data?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/* The basket                                                                  */
/* -------------------------------------------------------------------------- */

const addSchema = z.object({
  variant: z.string().trim().min(1),
  product: z.string().trim().uuid(),
  option: z.string().trim().uuid().or(z.literal("")).optional(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export async function addToCart(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "That could not be added.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const { variant, product, option, quantity } = parsed.data;

  const variantId = await variantIdFor(variant);
  if (!variantId) return { status: "error", message: "This shop is not open." };

  const db = createAdminClient();

  /* The product is re-read rather than trusted, for two reasons that are both
     real: it tells us whether it is published, and it tells us whether it
     belongs to this shop. A product id posted from another variant would
     otherwise land in this basket and be charged at that shop's price. */
  const { data: row } = await db
    .from("products")
    .select("id, name, stock, status, variant_id")
    .eq("id", product)
    .maybeSingle();

  if (!row || row.variant_id !== variantId || row.status !== "published") {
    return { status: "error", message: "That is not on sale here." };
  }

  let optionId: string | null = null;
  let stock: number | null = row.stock;

  if (option) {
    const { data: chosen } = await db
      .from("product_options")
      .select("id, stock, product_id")
      .eq("id", option)
      .maybeSingle();

    if (!chosen || chosen.product_id !== row.id) {
      return { status: "error", message: "Pick one of the options shown." };
    }

    optionId = chosen.id;
    if (chosen.stock !== null) stock = chosen.stock;
  }

  if (stock !== null && stock < 1) {
    return { status: "error", message: `${row.name} is sold out.` };
  }

  const token = await ensureCartToken();
  const cartId = await openCart(variantId, token);
  if (!cartId) return { status: "error", message: "The basket could not be opened." };

  /* Is this exact line already in the basket? "Exact" includes the option:
     the same shirt in two sizes is two lines, the same shirt in one size twice
     is one line with quantity two. `is null` and `eq` are different operators
     in PostgREST, so the two cases are written out rather than folded into one
     expression that would silently match nothing. */
  const search = db
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", row.id);

  const { data: line } = await (optionId === null
    ? search.is("option_id", null)
    : search.eq("option_id", optionId)
  ).maybeSingle();

  const wanted = (line?.quantity ?? 0) + quantity;

  /* Refuse here rather than at the checkout. Being told at the last screen that
     there were only two is the version of this that loses the order. */
  if (stock !== null && wanted > stock) {
    return {
      status: "error",
      message:
        line
          ? `Only ${stock} left, and you already have ${line.quantity} in the basket.`
          : `Only ${stock} left.`,
    };
  }

  const { error } = line
    ? await db.from("cart_items").update({ quantity: wanted }).eq("id", line.id)
    : await db
        .from("cart_items")
        .insert({ cart_id: cartId, product_id: row.id, option_id: optionId, quantity });

  if (error) {
    console.error("[cart] add failed:", error.message);
    return { status: "error", message: "That could not be added." };
  }

  revalidatePath(`/${variant}`, "layout");
  return { status: "success", message: `${row.name} is in the basket.` };
}

const quantitySchema = z.object({
  variant: z.string().trim().min(1),
  line: z.string().trim().uuid(),
  quantity: z.coerce.number().int().min(0).max(99),
});

/** Change how many, or remove the line by asking for none. */
export async function setQuantity(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = quantitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "That could not be changed." };

  const { variant, line, quantity } = parsed.data;

  const token = await readCartToken();
  if (!token) return { status: "error", message: "That basket has gone." };

  const db = createAdminClient();

  /* The line is checked against this browser's own basket before anything is
     written. Without it, a line id from anywhere would edit anybody's basket —
     the token is what makes this row ours.

     Two queries rather than one embedded filter, on purpose: a filter across an
     embed is the thing that broke four demo dashboards silently, and this one
     decides whether a stranger can empty somebody's basket. */
  const { data: cart } = await db
    .from("carts")
    .select("id")
    .eq("token", token)
    .maybeSingle();

  if (!cart) return { status: "error", message: "That basket has gone." };

  const { data: owned } = await db
    .from("cart_items")
    .select("id")
    .eq("id", line)
    .eq("cart_id", cart.id)
    .maybeSingle();

  if (!owned) return { status: "error", message: "That line is not in your basket." };

  const { error } =
    quantity === 0
      ? await db.from("cart_items").delete().eq("id", line)
      : await db.from("cart_items").update({ quantity }).eq("id", line);

  if (error) {
    console.error("[cart] quantity failed:", error.message);
    return { status: "error", message: "That could not be changed." };
  }

  revalidatePath(`/${variant}`, "layout");
  return { status: "success" };
}

const couponSchema = z.object({
  variant: z.string().trim().min(1),
  code: z.string().trim().max(40),
});

export async function applyCoupon(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter a code." };

  const { variant, code } = parsed.data;

  const variantId = await variantIdFor(variant);
  if (!variantId) return { status: "error", message: "This shop is not open." };

  const token = await readCartToken();
  if (!token) return { status: "error", message: "The basket is empty." };

  const db = createAdminClient();

  const { data: cart } = await db
    .from("carts")
    .select("id, variant_id")
    .eq("token", token)
    .maybeSingle();

  if (!cart || cart.variant_id !== variantId) {
    return { status: "error", message: "The basket is empty." };
  }

  /* Taking a code off is a blank box and a save, not a separate button. */
  if (code === "") {
    await db.from("carts").update({ coupon_id: null }).eq("id", cart.id);
    revalidatePath(`/${variant}`, "layout");
    return { status: "success", message: "Code removed." };
  }

  const { data: totals } = await db
    .from("cart_totals")
    .select("items_paise")
    .eq("cart_id", cart.id)
    .maybeSingle();

  /* The database answers, not this file. Four ways a coupon fails and four
     different sentences — "invalid code" when the real answer is "spend ₹200
     more" loses a sale for no reason at all. */
  const { data: verdict } = await db.rpc("check_coupon", {
    p_variant_id: variantId,
    p_code: code.toUpperCase(),
    p_items_paise: totals?.items_paise ?? 0,
  });

  const answer = verdict?.[0];

  if (!answer || answer.verdict !== "ok") {
    return {
      status: "error",
      message: answer?.message ?? "That code is not one of ours.",
      fieldErrors: { code: answer?.message ?? "That code is not one of ours." },
    };
  }

  const { data: coupon } = await db
    .from("coupons")
    .select("id")
    .eq("variant_id", variantId)
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (coupon) await db.from("carts").update({ coupon_id: coupon.id }).eq("id", cart.id);

  revalidatePath(`/${variant}`, "layout");
  return { status: "success", message: answer.message };
}

/* -------------------------------------------------------------------------- */
/* The checkout                                                                */
/* -------------------------------------------------------------------------- */

const checkoutSchema = z.object({
  variant: z.string().trim().min(1),
  name: z.string().trim().min(2, "What name should we put it under?").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "A number we can reach you on.")
    .max(20, "That does not look like a phone number."),
  email: z
    .string()
    .trim()
    .email("That does not look like an email address.")
    .or(z.literal("")),
  address_line: z.string().trim().min(6, "Where should it go?").max(400),
  city: z.string().trim().min(2, "Which town or city?").max(120),
  pincode: z.string().trim().regex(/^\d{6}$/, "Six digits."),
  note: z.string().trim().max(600).optional(),
});

export interface PlacedOrder extends FormState {
  orderCode?: string;
}

/**
 * Place the order.
 *
 * **Everything that decides the price happens inside one database function.**
 * Stock is checked and taken down, the coupon is re-checked, and each line's
 * price is copied at that instant, all in one transaction where they cannot
 * half-happen. Doing it from here would be four round trips with a gap between
 * each, and the gap is where two people buy the last one.
 */
export async function placeOrder(
  _previous: PlacedOrder,
  formData: FormData,
): Promise<PlacedOrder> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the details below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const { variant, name, phone, email, address_line, city, pincode, note } = parsed.data;

  const token = await readCartToken();
  if (!token) {
    return { status: "error", message: "The basket is empty." };
  }

  const db = createAdminClient();

  const { data, error } = await db.rpc("place_order", {
    p_cart_token: token,
    p_name: name,
    p_phone: phone,
    p_email: email || null,
    p_address_line: address_line,
    p_city: city,
    p_pincode: pincode,
    p_note: note || null,
  });

  if (error) {
    console.error("[checkout] place_order failed:", error.message);
    return { status: "error", message: "The order could not be placed. Try again." };
  }

  const result = data?.[0];

  /* A refusal from the function is a sentence written for the customer — "only
     two left", "that shop is not taking orders" — not an error code. It is
     shown as it arrives. */
  if (!result || result.problem) {
    return { status: "error", message: result?.problem ?? "The order could not be placed." };
  }

  /* The basket row is deleted inside the function; the cookie is dropped here so
     the next visit starts clean rather than pointing at nothing. */
  await forgetCart();

  /*
    The confirmation, after the order is already placed and the basket gone.

    It cannot undo any of that: `acknowledgeOrder` swallows every mail failure
    by design. A confirmation that does not arrive is a missing courtesy; an
    order that fails because of an email would be a lost sale.
  */
  await acknowledgeOrder({
    variantSlug: variant,
    to: email || null,
    name,
    orderCode: result.order_code ?? "",
    phone,
    addressLine: address_line,
    city,
    pincode,
    note,
  });

  revalidatePath(`/${variant}`, "layout");

  return {
    status: "success",
    message: "Order placed.",
    orderCode: result.order_code ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Writing in                                                                  */
/* -------------------------------------------------------------------------- */

const messageSchema = z.object({
  variant: z.string().trim().min(1),
  name: z.string().trim().min(2, "Who is writing?").max(160),
  email: z.string().trim().email("That does not look like an email address.").or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  body: z.string().trim().min(4, "What would you like to say?").max(2000),
});

export async function sendMessage(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const { variant, name, email, phone, body } = parsed.data;

  const variantId = await variantIdFor(variant);
  if (!variantId) return { status: "error", message: "This shop is not open." };

  const supabase = await createClient();

  const { error } = await supabase.from("messages").insert({
    variant_id: variantId,
    name,
    email: email || null,
    phone: phone || null,
    body,
  });

  if (error) {
    console.error("[message] failed:", error.message);
    return { status: "error", message: "That did not send. Try again." };
  }

  return { status: "success", message: "Thank you — we will reply." };
}
