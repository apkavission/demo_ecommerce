import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/admin-content";

/**
 * Pages a business wrote for itself.
 *
 * ---------------------------------------------------------------------------
 * **The addresses this demo already uses.** Next resolves a static segment
 * before a dynamic one, so a page saved as one of these would be written,
 * published, listed in the panel — and never rendered, because a file answers
 * first. The panel refuses those slugs, and this is the list it refuses from.
 *
 * Read off the route folders when this file was generated rather than typed
 * out, so a demo that gains a route does not quietly start shadowing somebody's
 * page.
 */
export { RESERVED_SLUGS } from "@/lib/reserved-slugs";

export interface PageSection {
  id: string;
  heading: string | null;
  body: string | null;
  layout: "text" | "image_right" | "image_left" | "banner";
  image: { url: string; alt: string } | null;
}

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
  sections: PageSection[];
}

/**
 * A page as the panel needs it.
 *
 * ---------------------------------------------------------------------------
 * **`inMenu` is a separate shape rather than an optional field**, because the
 * site's query genuinely cannot answer it and `inMenu: false` there would be a
 * lie that reads as an answer. A page nobody links to is the commonest way a
 * page-builder disappoints — written, published, and findable only by somebody
 * who already knows the address — so the panel offers one press to fix it, and
 * this is what tells it whether to offer.
 */
export interface AdminPageRow extends PageRow {
  inMenu: boolean;
}

/* -------------------------------------------------------------------------- */

const SECTION_SELECT =
  "id, heading, body, layout, sort_order, image:media(storage_key, alt)";

type SectionRecord = {
  id: string;
  heading: string | null;
  body: string | null;
  layout: string;
  sort_order: number;
  image: { storage_key: string; alt: string } | null;
};

function toSection(row: SectionRecord): PageSection {
  const url = mediaUrl(row.image?.storage_key);

  return {
    id: row.id,
    heading: row.heading,
    body: row.body,
    /* Anything the renderer has no branch for falls back rather than rendering
       an empty stripe. The column has a check constraint, so this is belt and
       braces — but the fallback costs a line and a blank band costs a demo. */
    layout:
      row.layout === "image_right" || row.layout === "image_left" || row.layout === "banner"
        ? row.layout
        : "text",
    image: url ? { url, alt: row.image?.alt ?? "" } : null,
  };
}

/** One page, for the site. Published only — row security says the same. */
export async function getPage(variantId: string, slug: string): Promise<PageRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, title, summary, status, meta_title, meta_description, sort_order")
    .eq("variant_id", variantId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;

  const { data: sections } = await supabase
    .from("page_sections")
    .select(SECTION_SELECT)
    .eq("page_id", data.id)
    .order("sort_order");

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    status: data.status,
    metaTitle: data.meta_title,
    metaDescription: data.meta_description,
    sortOrder: data.sort_order,
    sections: ((sections ?? []) as unknown as SectionRecord[]).map(toSection),
  };
}

/** Every page of a business, drafts included. For the panel. */
export async function getPagesForAdmin(variantId: string): Promise<AdminPageRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, title, summary, status, meta_title, meta_description, sort_order")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) {
    console.error("[panel] pages:", error.message);
    return [];
  }

  const ids = (data ?? []).map((row) => row.id);

  /* What the menu already points at, so the screen can offer to add what it
     does not. One query for the whole list rather than one per page. */
  const { data: nav } = await supabase
    .from("nav_items")
    .select("href")
    .eq("variant_id", variantId);

  const linked = new Set((nav ?? []).map((row) => row.href));

  const { data: sections } = ids.length
    ? await supabase.from("page_sections").select(SECTION_SELECT + ", page_id").in("page_id", ids).order("sort_order")
    : { data: [] };

  const byPage = new Map<string, PageSection[]>();

  for (const row of (sections ?? []) as unknown as (SectionRecord & { page_id: string })[]) {
    if (!byPage.has(row.page_id)) byPage.set(row.page_id, []);
    byPage.get(row.page_id)?.push(toSection(row));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    sortOrder: row.sort_order,
    sections: byPage.get(row.id) ?? [],
    inMenu: linked.has("/" + row.slug),
  }));
}

/** Just enough to link to them, for a menu or a footer. */
export async function listPages(variantId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("variant_id", variantId)
    .eq("status", "published")
    .order("sort_order");

  return data ?? [];
}
