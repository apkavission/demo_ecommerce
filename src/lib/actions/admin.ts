"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { parseMoney } from "@/lib/money";
import type { OrderRow } from "@/types/database";

/**
 * Everything the panel can change.
 *
 * ---------------------------------------------------------------------------
 * **Every action checks the session again, and that is not belt-and-braces.**
 *
 * A server action is an HTTP endpoint. The page that renders the button is not
 * what protects it — somebody can call the action without ever loading the
 * page, and "the button was not on their screen" is not access control.
 *
 * The database checks a second time, through the policies, and that is the
 * boundary that actually holds. What these checks buy is a sentence instead of
 * a silent empty result: `is_manager()` refusing an update returns zero rows,
 * which the client reports as success with nothing changed.
 *
 * ---------------------------------------------------------------------------
 * **Three tiers, and the middle one is why this file is longer than the other
 * demos'.**
 *
 *   staff    — move an order along, read everything, change no price
 *   manager  — the catalogue, the coupons, the content
 *   super    — which shops exist, and who has been sent a link to which
 */

async function requireStaff(): Promise<FormState | null> {
  const session = await getAdminSession();
  if (!session) return { status: "error", message: "Sign in again." };
  return null;
}

/**
 * Manager or better.
 *
 * Read from the database rather than inferred from the role label, because the
 * function in the schema is the one the policies use and two answers to one
 * question is how they drift.
 */
async function requireManager(): Promise<FormState | null> {
  const session = await getAdminSession();
  if (!session) return { status: "error", message: "Sign in again." };

  const supabase = await createClient();
  const { data } = await supabase.rpc("is_manager");

  if (!data) {
    return {
      status: "error",
      message: "That is a manager's change, and this account is not one.",
    };
  }

  return null;
}

async function requireSuper(): Promise<FormState | null> {
  const session = await getAdminSession();
  if (!session?.isSuperAdmin) {
    return { status: "error", message: "Only a super admin can do that." };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Signing in                                                                  */
/* -------------------------------------------------------------------------- */

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Both fields are needed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    /*
      One message for a wrong address and a wrong password, on purpose. Telling
      them apart tells somebody probing which addresses have accounts.
    */
    return { status: "error", message: "That email and password do not match an account." };
  }

  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* -------------------------------------------------------------------------- */
/* Orders — the staff tier                                                     */
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

const orderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATES).optional(),
  payment: z.enum(PAYMENT_STATES).optional(),
  staff_note: z.string().trim().max(600).optional(),
});

export async function updateOrder(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireStaff();
  if (refused) return refused;

  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "That could not be saved." };

  const { id, status, payment, staff_note } = parsed.data;

  const supabase = await createClient();

  /* Typed rather than `Record<string, string>`: an untyped bag would let a
     misspelled column through to PostgREST, which answers with a 400 the page
     turns into "that could not be saved" and nobody can debug. */
  const patch: Partial<Pick<OrderRow, "status" | "payment" | "staff_note">> = {};
  if (status) patch.status = status;
  if (payment) patch.payment = payment;
  if (staff_note !== undefined) patch.staff_note = staff_note;

  if (Object.keys(patch).length === 0) return { status: "idle" };

  /* `select` after the update so a policy refusal is visible. Without it the
     client reports success on zero rows changed, which is the failure that
     looks exactly like working. */
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[admin] order update failed:", error.message);
    return { status: "error", message: "That could not be saved." };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Nothing changed — this account may not do that." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return { status: "success", message: "Saved." };
}

/* -------------------------------------------------------------------------- */
/* The catalogue — the manager tier                                            */
/* -------------------------------------------------------------------------- */

const productSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  collection_id: z.string().uuid().or(z.literal("")).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Lower case, numbers and hyphens.")
    .max(80),
  name: z.string().trim().min(2, "Give it a name.").max(160),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(4000).optional(),
  sku: z.string().trim().max(60).optional(),
  price: z.string().trim().min(1, "What does it cost?"),
  compare_at: z.string().trim().optional(),
  stock: z.string().trim().optional(),
  meta_label: z.string().trim().max(120).optional(),
  status: z.enum(["draft", "published"]).default("published"),
  is_featured: z.coerce.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveProduct(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireManager();
  if (refused) return refused;

  const parsed = productSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const input = parsed.data;

  const price = parseMoney(input.price);
  if (price === null) {
    return {
      status: "error",
      message: "That price could not be read.",
      fieldErrors: { price: "A number, like 1299 or 1299.50." },
    };
  }

  const compareAt = input.compare_at ? parseMoney(input.compare_at) : null;

  if (input.compare_at && compareAt === null) {
    return {
      status: "error",
      message: "That struck-through price could not be read.",
      fieldErrors: { compare_at: "A number, or leave it empty." },
    };
  }

  /* The database refuses this too, and says so in Postgres. Catching it here
     turns a constraint violation into a sentence under the right input. */
  if (compareAt !== null && compareAt <= price) {
    return {
      status: "error",
      message: "That is not a discount.",
      fieldErrors: { compare_at: "The old price has to be higher than the new one." },
    };
  }

  /* An empty stock box means "we do not count this" — a made-to-order cake.
     Zero means counted and none left. They are different answers and the box
     has to be able to say both. */
  const stock =
    input.stock === undefined || input.stock === "" ? null : Number(input.stock);

  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
    return {
      status: "error",
      message: "That stock count could not be read.",
      fieldErrors: { stock: "A whole number, or leave it empty for uncounted." },
    };
  }

  const supabase = await createClient();

  const row = {
    variant_id: input.variant_id,
    collection_id: input.collection_id || null,
    slug: input.slug,
    name: input.name,
    summary: input.summary || null,
    description: input.description || null,
    sku: input.sku || null,
    price_paise: price,
    compare_at_paise: compareAt,
    stock,
    meta_label: input.meta_label || null,
    status: input.status,
    is_featured: input.is_featured,
    sort_order: input.sort_order,
  };

  const { data, error } = input.id
    ? await supabase.from("products").update(row).eq("id", input.id).select("id")
    : await supabase.from("products").insert(row).select("id");

  if (error) {
    console.error("[admin] product save failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "That address is already used in this shop.",
        fieldErrors: { slug: "Another product already has this one." },
      };
    }

    return { status: "error", message: "That could not be saved." };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Nothing changed — this account may not do that." };
  }

  revalidatePath("/admin/catalogue");
  revalidatePath("/", "layout");
  return { status: "success", message: "Saved." };
}

const stockSchema = z.object({
  id: z.string().uuid(),
  stock: z.string().trim(),
});

/** The one edit somebody makes forty times a day, on its own. */
export async function setStock(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireManager();
  if (refused) return refused;

  const parsed = stockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "That could not be saved." };

  const stock = parsed.data.stock === "" ? null : Number(parsed.data.stock);

  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
    return { status: "error", message: "A whole number, or empty for uncounted." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .update({ stock })
    .eq("id", parsed.data.id)
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "That could not be saved." };
  }

  revalidatePath("/admin/catalogue");
  revalidatePath("/", "layout");
  return { status: "success", message: "Stock updated." };
}

const publishSchema = z.object({
  table: z.enum(["products", "collections", "team", "testimonials", "faqs"]),
  id: z.string().uuid(),
  status: z.enum(["draft", "published"]),
});

export async function setPublished(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireManager();
  if (refused) return refused;

  const parsed = publishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "That could not be changed." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from(parsed.data.table)
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "That could not be changed." };
  }

  revalidatePath("/admin/catalogue");
  revalidatePath("/admin/content");
  revalidatePath("/", "layout");
  return { status: "success" };
}

/* -------------------------------------------------------------------------- */
/* Coupons — the manager tier                                                  */
/* -------------------------------------------------------------------------- */

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Capitals, numbers and hyphens.")
    .max(40),
  description: z.string().trim().max(200).optional(),
  kind: z.enum(["percent", "amount"]),
  amount: z.string().trim().min(1, "How much off?"),
  min_order: z.string().trim().optional(),
  max_uses: z.string().trim().optional(),
  ends_at: z.string().trim().optional(),
  is_active: z.coerce.boolean().default(true),
});

export async function saveCoupon(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireManager();
  if (refused) return refused;

  const parsed = couponSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const input = parsed.data;

  /* A percentage is a plain number; an amount is money. Reading both with the
     money parser would turn "10% off" into ten paise. */
  const amount =
    input.kind === "percent" ? Number(input.amount) : parseMoney(input.amount);

  if (amount === null || !Number.isFinite(amount) || amount <= 0) {
    return {
      status: "error",
      message: "That discount could not be read.",
      fieldErrors: { amount: input.kind === "percent" ? "1 to 100." : "An amount, like 500." },
    };
  }

  if (input.kind === "percent" && (amount > 100 || !Number.isInteger(amount))) {
    return {
      status: "error",
      message: "A percentage over a hundred pays people to shop here.",
      fieldErrors: { amount: "1 to 100." },
    };
  }

  const supabase = await createClient();

  const row = {
    variant_id: input.variant_id,
    code: input.code,
    description: input.description || null,
    kind: input.kind,
    amount,
    min_order_paise: input.min_order ? (parseMoney(input.min_order) ?? 0) : 0,
    max_uses: input.max_uses ? Number(input.max_uses) : null,
    ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null,
    is_active: input.is_active,
  };

  const { data, error } = input.id
    ? await supabase.from("coupons").update(row).eq("id", input.id).select("id")
    : await supabase.from("coupons").insert(row).select("id");

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "That code already exists in this shop.",
        fieldErrors: { code: "Pick another." },
      };
    }

    console.error("[admin] coupon save failed:", error.message);
    return { status: "error", message: "That could not be saved." };
  }

  if (!data?.length) {
    return { status: "error", message: "Nothing changed — this account may not do that." };
  }

  revalidatePath("/admin/coupons");
  return { status: "success", message: "Saved." };
}

/* -------------------------------------------------------------------------- */
/* Content — the manager tier                                                  */
/* -------------------------------------------------------------------------- */

const faqSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  question: z.string().trim().min(4, "What is the question?").max(300),
  answer: z.string().trim().min(4, "And the answer?").max(2000),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveFaq(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireManager();
  if (refused) return refused;

  const parsed = faqSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const { id, ...row } = parsed.data;
  const supabase = await createClient();

  const { data, error } = id
    ? await supabase.from("faqs").update(row).eq("id", id).select("id")
    : await supabase.from("faqs").insert(row).select("id");

  if (error || !data?.length) {
    return { status: "error", message: "That could not be saved." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/", "layout");
  return { status: "success", message: "Saved." };
}

/* -------------------------------------------------------------------------- */
/* Which shops exist — the super admin tier                                    */
/* -------------------------------------------------------------------------- */

const visibilitySchema = z.object({
  id: z.string().uuid(),
  visibility: z.enum(["public", "link_only"]),
});

export async function setVisibility(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireSuper();
  if (refused) return refused;

  const parsed = visibilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "That could not be changed." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("variants")
    .update({ visibility: parsed.data.visibility })
    .eq("id", parsed.data.id)
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "That could not be changed." };
  }

  revalidatePath("/admin/variants");
  revalidatePath("/", "layout");
  return { status: "success", message: "Saved." };
}

const cloneSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]*$/, "Lower case, starting with a letter.")
    .max(60),
  name: z.string().trim().min(2, "What is it called?").max(120),
});

/**
 * Copy a whole shop.
 *
 * **This was the missing button.** Adding a fourth business meant writing SQL,
 * because a copy has to walk every table in dependency order and remap the ids —
 * a product points at a collection, an option points at a product, and copying
 * them in the wrong order gives you rows pointing at another shop's rows.
 *
 * The walk lives in the database, in `clone_variant`, for the reason it always
 * does: it is one transaction. Half a cloned shop — a variant row with no
 * products, or products with no options — is worse than none, and doing it from
 * here would make a half-clone the normal outcome of a dropped connection.
 *
 * What it does **not** copy: orders, baskets, messages and share links. Those
 * belong to the shop that received them, and a new business opening with
 * somebody else's orders in its panel would be alarming rather than convenient.
 */
export async function cloneVariant(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireSuper();
  if (refused) return refused;

  const parsed = cloneSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("clone_variant", {
    p_source: parsed.data.id,
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
  });

  if (error) {
    console.error("[admin] clone failed:", error.message);

    if (error.message.includes("already")) {
      return {
        status: "error",
        message: "That address is taken.",
        fieldErrors: { slug: "Another shop already uses it." },
      };
    }

    return { status: "error", message: "The copy did not happen." };
  }

  revalidatePath("/admin/variants");
  revalidatePath("/", "layout");

  return {
    status: "success",
    message: `Copied. The new shop is switched off and link-only until you change it.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Share links — the super admin tier                                          */
/* -------------------------------------------------------------------------- */

const linkSchema = z.object({
  variant_id: z.string().uuid(),
  label: z.string().trim().max(160).optional(),
  days: z.coerce.number().int().min(1).max(90).default(7),
  max_views: z.string().trim().optional(),
  note: z.string().trim().max(400).optional(),
});

export async function createShareLink(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireSuper();
  if (refused) return refused;

  const parsed = linkSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const session = await getAdminSession();
  const supabase = await createClient();

  const expires = new Date();
  expires.setDate(expires.getDate() + parsed.data.days);

  const { data, error } = await supabase
    .from("share_links")
    .insert({
      variant_id: parsed.data.variant_id,
      /* 32 random bytes. Long enough that guessing is not a strategy, and
         base64url so it survives being pasted into WhatsApp. */
      token: randomBytes(32).toString("base64url"),
      label: parsed.data.label || "",
      note: parsed.data.note || null,
      expires_at: expires.toISOString(),
      max_views: parsed.data.max_views ? Number(parsed.data.max_views) : null,
      created_by: session?.id ?? null,
    })
    .select("id");

  if (error || !data?.length) {
    console.error("[admin] share link failed:", error?.message);
    return { status: "error", message: "The link could not be made." };
  }

  revalidatePath("/admin/links");
  return { status: "success", message: "Link created." };
}

export async function revokeShareLink(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const refused = await requireSuper();
  if (refused) return refused;

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "That link could not be closed." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id.data)
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "That link could not be closed." };
  }

  revalidatePath("/admin/links");
  return { status: "success", message: "Closed. It stops working immediately." };
}
