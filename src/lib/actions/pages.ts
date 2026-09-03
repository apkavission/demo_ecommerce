"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RESERVED_SLUGS } from "@/lib/pages";
import { type FormState, fieldErrors } from "@/lib/form-state";

/**
 * Writing a page.
 *
 * ---------------------------------------------------------------------------
 * **The slug is checked against the demo's own routes.** `/contact` is a file;
 * a page saved under that slug would be stored, published, listed here and
 * never seen, because the router answers with the file. The database cannot
 * know that. This can, and refuses with a sentence that says which.
 */

const ok = (message: string): FormState => ({ status: "success", message });
const no = (message: string): FormState => ({ status: "error", message });

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/** A title, turned into something that can be an address. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  title: z.string().trim().min(2, "A page needs a name.").max(120),
  slug: z.string().trim().max(60).optional(),
  summary: z.string().trim().max(400).optional(),
  status: z.enum(["draft", "published"]),
  meta_title: z.string().trim().max(70).optional(),
  meta_description: z.string().trim().max(180).optional(),
});

export async function savePage(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = pageSchema.safeParse({
    id: formData.get("id") || undefined,
    variant_id: formData.get("variant_id"),
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    summary: formData.get("summary") || undefined,
    status: formData.get("status") || "draft",
    meta_title: formData.get("meta_title") || undefined,
    meta_description: formData.get("meta_description") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const slug = slugify(parsed.data.slug || parsed.data.title);

  if (!slug) return no("That name does not make an address. Try letters and numbers.");

  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return no(`This demo already has a /${slug} page of its own. Choose another address.`);
  }

  const supabase = await createClient();

  const row = {
    title: parsed.data.title,
    slug,
    summary: parsed.data.summary ?? null,
    status: parsed.data.status,
    meta_title: parsed.data.meta_title ?? null,
    meta_description: parsed.data.meta_description ?? null,
  };

  const { data, error } = parsed.data.id
    ? await supabase.from("pages").update(row).eq("id", parsed.data.id).select("id").single()
    : await supabase
        .from("pages")
        .insert({ ...row, variant_id: parsed.data.variant_id })
        .select("id")
        .single();

  if (error) {
    console.error("[panel] page save:", error.message);

    if (error.code === "23505") return no("There is already a page at that address.");

    return no("Could not save. Nothing was changed.");
  }

  refresh();

  return ok(parsed.data.id ? "Saved." : `Made. It is at /${slug}.` + (data ? "" : ""));
}

/**
 * A link to this page, in the site's menu.
 *
 * ---------------------------------------------------------------------------
 * **Why one press and not "we do it for you".** Adding every new page to the
 * menu automatically is how a site ends up with eleven items across the top and
 * nobody willing to be the one who deletes some. Not offering it at all is how
 * a page is written, published, and never seen. An offer that has to be
 * accepted is the honest middle.
 *
 * The page must be published first: a menu link to a draft is a link to a 404
 * for everybody except the person who made it.
 */
export async function addPageToMenu(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("variant_id, slug, title, status")
    .eq("id", id)
    .single();

  if (!page) return no("That page is gone.");

  if (page.status !== "published") {
    return no("Publish it first — a menu link to a draft is a link to nothing.");
  }

  const { data: last } = await supabase
    .from("nav_items")
    .select("sort_order")
    .eq("variant_id", page.variant_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("nav_items").insert({
    variant_id: page.variant_id,
    label: page.title,
    href: "/" + page.slug,
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    is_active: true,
  });

  if (error) {
    /* The menu will not carry two items with the same words, which is right —
       but here it means somebody already added it under that name. */
    if (error.code === "23505") return no("The menu already has an item with that name.");

    console.error("[panel] menu link:", error.message);
    return no("Could not add it to the menu.");
  }

  refresh();
  return ok("Added to the menu.");
}

export async function deletePage(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().eq("id", id);

  if (error) {
    console.error("[panel] page delete:", error.message);
    return no("Could not remove it.");
  }

  refresh();
  return ok("Removed.");
}

/* ---------------------------------------------------------------- bands -- */

const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  page_id: z.string().uuid(),
  heading: z.string().trim().max(160).optional(),
  body: z.string().trim().max(4000).optional(),
  layout: z.enum(["text", "image_right", "image_left", "banner"]),
  image_id: z.string().uuid().optional(),
});

export async function saveSection(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = sectionSchema.safeParse({
    id: formData.get("id") || undefined,
    page_id: formData.get("page_id"),
    heading: formData.get("heading") || undefined,
    body: formData.get("body") || undefined,
    layout: formData.get("layout") || "text",
    image_id: formData.get("image_id") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  if (!parsed.data.heading && !parsed.data.body && !parsed.data.image_id) {
    return no("A band with nothing in it would be a blank stripe on the page.");
  }

  const supabase = await createClient();

  const row = {
    heading: parsed.data.heading ?? null,
    body: parsed.data.body ?? null,
    layout: parsed.data.layout,
    image_id: parsed.data.image_id ?? null,
  };

  let error;

  if (parsed.data.id) {
    ({ error } = await supabase.from("page_sections").update(row).eq("id", parsed.data.id));
  } else {
    /* The end of the page. Read rather than counted — a page with a band
       removed from the middle has more positions than bands. */
    const { data: last } = await supabase
      .from("page_sections")
      .select("sort_order")
      .eq("page_id", parsed.data.page_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    ({ error } = await supabase.from("page_sections").insert({
      ...row,
      page_id: parsed.data.page_id,
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    }));
  }

  if (error) {
    console.error("[panel] section save:", error.message);
    return no("Could not save. Nothing was changed.");
  }

  refresh();
  return ok(parsed.data.id ? "Saved." : "Added.");
}

export async function deleteSection(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();
  const { error } = await supabase.from("page_sections").delete().eq("id", id);

  if (error) return no("Could not remove it.");

  refresh();
  return ok("Removed.");
}

export async function moveSection(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  if (!id || (direction !== "up" && direction !== "down")) {
    return no("That request did not make sense.");
  }

  const supabase = await createClient();

  const { data: band } = await supabase
    .from("page_sections")
    .select("id, page_id, sort_order")
    .eq("id", id)
    .single();

  if (!band) return no("That band is gone.");

  const { data: neighbour } = await supabase
    .from("page_sections")
    .select("id, sort_order")
    .eq("page_id", band.page_id)
    [direction === "up" ? "lt" : "gt"]("sort_order", band.sort_order)
    .order("sort_order", { ascending: direction !== "up" })
    .limit(1)
    .maybeSingle();

  if (!neighbour) return ok("It is already there.");

  const [first, second] = await Promise.all([
    supabase.from("page_sections").update({ sort_order: neighbour.sort_order }).eq("id", band.id),
    supabase.from("page_sections").update({ sort_order: band.sort_order }).eq("id", neighbour.id),
  ]);

  if (first.error ?? second.error) return no("Could not move it.");

  refresh();
  return ok("Moved.");
}
