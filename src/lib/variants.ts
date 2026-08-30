import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import type {
  CollectionRow,
  FaqRow,
  NavItemRow,
  PersonRow,
  ProductOptionRow,
  ProductRow,
  TestimonialRow,
  VariantContact,
  VariantFeatures,
  VariantRow,
  VariantTheme,
} from "@/types/database";

/**
 * Loading a variant, which is loading a whole shop.
 *
 * Every public page starts here: the variant decides the name in the header,
 * the colours, the navigation, the delivery charge, the phone number in the
 * footer and every row of stock on the page. Get the variant and everything
 * else follows; fail to get it and there is no page to draw.
 *
 * **Wrapped in `cache()`** so the layout and the page inside it share one query
 * per request. Without it every segment of a route asks the database for the
 * same row, which is three round trips to render one screen — and it is
 * invisible in development, where the database is fast and nobody is watching.
 */

export interface Variant {
  id: string;
  slug: string;
  name: string;
  industryLabel: string;
  businessName: string;
  tagline: string | null;
  description: string | null;
  theme: VariantTheme;
  contact: VariantContact;
  features: VariantFeatures;
  shippingPaise: number;
  freeShippingAbove: number | null;
  currencySymbol: string;
  defaultMode: "light" | "dark";
  allowModeToggle: boolean;
  visibility: "public" | "link_only";
}

function shape(row: VariantRow): Variant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    industryLabel: row.industry_label,
    businessName: row.business_name,
    tagline: row.tagline,
    description: row.description,
    theme: readTheme(row.theme),
    contact: (row.contact ?? {}) as VariantContact,
    features: (row.features ?? {}) as VariantFeatures,
    shippingPaise: row.shipping_paise,
    freeShippingAbove: row.free_shipping_above,
    currencySymbol: row.currency_symbol || "₹",
    defaultMode: row.default_mode === "dark" ? "dark" : "light",
    allowModeToggle: row.allow_mode_toggle,
    visibility: row.visibility === "link_only" ? "link_only" : "public",
  };
}

/** Every shop that is switched on, in the order the switcher shows them. */
export const listVariants = cache(async (): Promise<Variant[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("[variants] list failed:", error.message);
    return [];
  }

  return (data ?? []).map(shape);
});

export const getVariant = cache(async (slug: string): Promise<Variant | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[variants] one failed:", error.message);
    return null;
  }

  return data ? shape(data) : null;
});

export const getDefaultVariant = cache(async (): Promise<Variant | null> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("variants")
    .select("*")
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle();

  if (data) return shape(data);

  // No default set. The first active one is better than a broken address, and
  // the admin says so where it can be fixed.
  const [first] = await listVariants();
  return first ?? null;
});

/* -------------------------------------------------------------------------- */
/* The content of one shop                                                     */
/* -------------------------------------------------------------------------- */

export const getNav = cache(async (variantId: string): Promise<NavItemRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nav_items")
    .select("*")
    .eq("variant_id", variantId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) console.error("[variants] nav failed:", error.message);
  return data ?? [];
});

export const getCollections = cache(async (variantId: string): Promise<CollectionRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) console.error("[variants] collections failed:", error.message);
  return data ?? [];
});

/**
 * The catalogue.
 *
 * **No `status` filter, and that is deliberate rather than an omission.** The
 * policy on this table returns published rows to the public and everything to
 * somebody signed into the panel. A filter here would be a second answer to the
 * same question — and the second answer is the one that gets forgotten when a
 * new screen is written.
 */
export const getProducts = cache(async (variantId: string): Promise<ProductRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) console.error("[variants] products failed:", error.message);
  return data ?? [];
});

export const getProduct = cache(
  async (variantId: string, slug: string): Promise<ProductRow | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("variant_id", variantId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) console.error("[variants] product failed:", error.message);
    return data ?? null;
  },
);

export const getOptions = cache(async (productId: string): Promise<ProductOptionRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_options")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");

  if (error) console.error("[variants] options failed:", error.message);
  return data ?? [];
});

/**
 * Every option for a list of products, in one query.
 *
 * The catalogue page needs to know which products have sizes so it can say
 * "4 sizes" on the card. Asking per product is one round trip per row, which is
 * eighteen on a page showing eighteen products — the shape of slowness that
 * never appears in development.
 */
export const getOptionsFor = cache(
  async (productIds: string[]): Promise<Map<string, ProductOptionRow[]>> => {
    const grouped = new Map<string, ProductOptionRow[]>();
    if (productIds.length === 0) return grouped;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order");

    if (error) {
      console.error("[variants] options batch failed:", error.message);
      return grouped;
    }

    for (const option of data ?? []) {
      const list = grouped.get(option.product_id) ?? [];
      list.push(option);
      grouped.set(option.product_id, list);
    }

    return grouped;
  },
);

export const getPeople = cache(async (variantId: string): Promise<PersonRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team")
    .select("*")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) console.error("[variants] people failed:", error.message);
  return data ?? [];
});

export const getTestimonials = cache(async (variantId: string): Promise<TestimonialRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) console.error("[variants] testimonials failed:", error.message);
  return data ?? [];
});

export const getFaqs = cache(async (variantId: string): Promise<FaqRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) console.error("[variants] faqs failed:", error.message);
  return data ?? [];
});
