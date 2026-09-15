import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { readCopy } from "@/lib/copy";
import { readTheme } from "@/lib/theme";
import type { HomeCopy } from "@/lib/copy";
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

  /**
   * The mark, as the header needs it.
   *
   * Two files rather than one: a logo drawn for a white page disappears on a
   * dark one, and these sites have a theme toggle. Null on either falls back to
   * setting the name as type, which is always available and never broken.
   */
  logo: { light: string | null; dark: string | null };

  /**
   * Whether the mark already contains the name.
   *
   * A lockup with the name printed beside it again is the commonest way a site
   * with a perfectly good logo looks amateur.
   */
  logoShowsName: boolean;

  /**
   * The picture a messaging app shows when the link is pasted.
   *
   * A link with no card is a grey rectangle in a WhatsApp thread, and a demo
   * sent to a prospect is almost always pasted into one before it is opened.
   */
  ogImage: string | null;

  metaTitle: string | null;
  metaDescription: string | null;

  /**
   * The banner behind the first screen, if this business has one.
   *
   * Both may be absent, and that is an ordinary state rather than a missing
   * asset: the band falls back to a wash built from the palette, so a demo with
   * no pictures still has a hero. `video` wins when both are set — a still is
   * then the poster it shows before it plays and on a connection that will not
   * carry it.
   */
  hero: {
    image: string | null;
    imageAlt: string;
    video: string | null;
  };

  /**
   * The words on the site, which used to be in the code.
   *
   * Read through `readCopy()`, so every slot has a default and an empty column
   * renders a finished page rather than a blank one.
   */
  copy: HomeCopy;
}

/**
 * Where a stored file is served from.
 *
 * Composed rather than stored, so moving the bucket is one change in one place.
 */
const BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/demo-media`;

function fileUrl(key: string | null | undefined): string | null {
  return key ? `${BUCKET_URL}/${key}` : null;
}

/**
 * The hero's video, trimmed, or nothing at all.
 *
 * A blank field is treated as absent so a value somebody cleared does not
 * render a `<video>` with an empty source. The column is asked for as optional
 * because the generated types have not been refreshed since the migration —
 * which is a reason to be careful here, not a reason to assert it is there.
 */
function videoUrl(row: VariantRow): string | null {
  const url = (row as { hero_video_url?: string | null }).hero_video_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
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

    logo: {
      light: fileUrl((row as { light?: { storage_key: string } | null }).light?.storage_key),
      dark: fileUrl((row as { dark?: { storage_key: string } | null }).dark?.storage_key),
    },
    ogImage: fileUrl((row as { og?: { storage_key: string } | null }).og?.storage_key),
    logoShowsName: Boolean(row.logo_shows_name),
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,

    /*
      Cast, because these columns were added to the table after these types were
      generated and `npm run gen:types` has not been run since. The reader below
      accepts `unknown` and checks everything it uses, so the cast asserts only
      that the column exists — which the migration guarantees.
    */
    copy: readCopy((row as { copy?: unknown }).copy),

    hero: {
      image: fileUrl(
        (row as { hero?: { storage_key: string } | null }).hero?.storage_key,
      ),
      imageAlt:
        (row as { hero?: { alt: string } | null }).hero?.alt ||
        `${row.business_name}`,
      video: videoUrl(row),
    },
  };
}

/** Every shop that is switched on, in the order the switcher shows them. */
export const listVariants = cache(async (): Promise<Variant[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("variants")
    .select(`*, light:media!variants_logo_light_id_fkey(storage_key), dark:media!variants_logo_dark_id_fkey(storage_key), og:media!variants_og_image_id_fkey(storage_key), hero:media!variants_hero_image_id_fkey(storage_key, alt)`)
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
    .select(`*, light:media!variants_logo_light_id_fkey(storage_key), dark:media!variants_logo_dark_id_fkey(storage_key), og:media!variants_og_image_id_fkey(storage_key), hero:media!variants_hero_image_id_fkey(storage_key, alt)`)
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
    .select(`*, light:media!variants_logo_light_id_fkey(storage_key), dark:media!variants_logo_dark_id_fkey(storage_key), og:media!variants_og_image_id_fkey(storage_key), hero:media!variants_hero_image_id_fkey(storage_key, alt)`)
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
/*
  These select `*` and nothing else, and that is worth a note because for a
  week they did not.

  When the logo columns were added to `variants` on 2026-09-03, the three named
  joins that read them — `light:media!variants_logo_light_id_fkey` and its two
  siblings — were pasted onto every `.select()` in this file. Those foreign keys
  exist on `variants` alone, so PostgREST answered every one of these queries
  with

      Could not find a relationship between '<table>' and 'media'

  and each function fell back to its empty array. The result was a site with no
  content on it — rendering its empty states while the rows sat in the database.
  It was found by photographing the pages, which is the one thing no test does.
*/


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
