"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DB_SCHEMA } from "@/lib/supabase/constants";
import { type FormState, fieldErrors } from "@/lib/form-state";

/**
 * The rest of what a business says about itself.
 *
 * ---------------------------------------------------------------------------
 * **The owner's instruction.**
 *
 *   > jo h menu demos me de rahe ho sahi se pura working ke saath dena … baki
 *   > sab kuch chaiye seo, marketing and content dynamic and pages banane
 *
 * The panel could edit two kinds of row — the people and the things sold — and
 * nothing else. Testimonials, questions, the menu across the top and the
 * enquiries coming in were all in the database, all rendered on the site, and
 * none of them reachable by the person whose site it is.
 *
 * ---------------------------------------------------------------------------
 * **Every write goes through the signed-in session.** Row security decides what
 * may be changed, and it decides the same way whether or not this file
 * remembered to ask. `requireAdmin()` is the same answer given earlier, for a
 * better message than a silent zero-row update.
 *
 * ---------------------------------------------------------------------------
 * **An id that is absent means a new row.** One action per kind rather than a
 * create and an update that drift apart — they validate the same fields, and
 * two schemas for one shape is how a field ends up optional in one place and
 * required in the other.
 */

const ok = (message: string): FormState => ({ status: "success", message });
const no = (message: string): FormState => ({ status: "error", message });

const SAVED = "Saved. The site shows it straight away.";

/** Everything a save touches, so nothing is left showing the old value. */
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/**
 * The next place in a list.
 *
 * Read rather than counted, because a list with a row deleted from the middle
 * has more positions than rows, and `count + 1` would collide with an existing
 * one — which sorts two rows arbitrarily and looks like a bug in the site.
 */
async function nextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "testimonials" | "faqs" | "nav_items",
  variantId: string,
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .eq("variant_id", variantId)
    .order("sort_order", { ascending: false })
    .limit(1);

  return (data?.[0]?.sort_order ?? 0) + 1;
}

/* ========================================================== testimonials == */

const testimonialSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  author: z.string().trim().min(2, "Whose words are these?").max(160),
  role_label: z.string().trim().max(160).optional(),
  quote: z.string().trim().min(10, "A little more than that.").max(1200),
  /* Coerced, because a select sends a string and an empty one means "not said"
     rather than zero — a nought-star review nobody wrote. */
  rating: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(["draft", "published"]),
});

export async function saveTestimonial(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = testimonialSchema.safeParse({
    id: formData.get("id") || undefined,
    variant_id: formData.get("variant_id"),
    author: formData.get("author"),
    role_label: formData.get("role_label") || undefined,
    quote: formData.get("quote"),
    rating: formData.get("rating") || undefined,
    status: formData.get("status") || "published",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const row = {
    author: parsed.data.author,
    role_label: parsed.data.role_label ?? null,
    quote: parsed.data.quote,
    rating: parsed.data.rating ?? null,
    status: parsed.data.status,
  };

  const { error } = parsed.data.id
    ? await supabase.from("testimonials").update(row).eq("id", parsed.data.id)
    : await supabase.from("testimonials").insert({
        ...row,
        variant_id: parsed.data.variant_id,
        sort_order: await nextPosition(supabase, "testimonials", parsed.data.variant_id),
      });

  if (error) {
    console.error("[panel] testimonial save:", error.message);
    return no("Could not save. Nothing was changed.");
  }

  refresh();
  return ok(parsed.data.id ? SAVED : "Added.");
}

/* ================================================================= faqs == */

const faqSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  question: z.string().trim().min(5, "A question, in full.").max(300),
  answer: z.string().trim().min(5, "And the answer.").max(2000),
  status: z.enum(["draft", "published"]),
});

export async function saveFaq(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = faqSchema.safeParse({
    id: formData.get("id") || undefined,
    variant_id: formData.get("variant_id"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    status: formData.get("status") || "published",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const row = {
    question: parsed.data.question,
    answer: parsed.data.answer,
    status: parsed.data.status,
  };

  const { error } = parsed.data.id
    ? await supabase.from("faqs").update(row).eq("id", parsed.data.id)
    : await supabase.from("faqs").insert({
        ...row,
        variant_id: parsed.data.variant_id,
        sort_order: await nextPosition(supabase, "faqs", parsed.data.variant_id),
      });

  if (error) {
    console.error("[panel] faq save:", error.message);
    return no("Could not save. Nothing was changed.");
  }

  refresh();
  return ok(parsed.data.id ? SAVED : "Added.");
}

/* =========================================================== the menu === */

const navSchema = z.object({
  id: z.string().uuid().optional(),
  variant_id: z.string().uuid(),
  label: z.string().trim().min(1, "What should it say?").max(60),
  /*
    A path within this site, or nothing else.

    An open href field on a menu is a stored redirect: somebody with panel
    access could point "Contact" at any address on the internet, and a visitor
    following it would have every reason to trust it. Everything these sites
    link to is their own, so the field is limited to that and the limit costs
    nothing.
  */
  href: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
      message: "A path on this site, beginning with /.",
    }),
  is_active: z.boolean(),
});

export async function saveNavItem(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = navSchema.safeParse({
    id: formData.get("id") || undefined,
    variant_id: formData.get("variant_id"),
    label: formData.get("label"),
    href: formData.get("href"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const row = {
    label: parsed.data.label,
    href: parsed.data.href,
    is_active: parsed.data.is_active,
  };

  const { error } = parsed.data.id
    ? await supabase.from("nav_items").update(row).eq("id", parsed.data.id)
    : await supabase.from("nav_items").insert({
        ...row,
        variant_id: parsed.data.variant_id,
        sort_order: await nextPosition(supabase, "nav_items", parsed.data.variant_id),
      });

  if (error) {
    console.error("[panel] nav save:", error.message);

    /*
      A menu with two entries called "About" is a menu somebody has to guess
      at, so the database refuses it. Said in words here, because "duplicate
      key value violates unique constraint nav_items_variant_id_label_key" is
      not a sentence anybody should have to read.
    */
    if (error.code === "23505") return no("There is already a link with that name.");

    return no("Could not save. Nothing was changed.");
  }

  refresh();
  return ok(parsed.data.id ? SAVED : "Added to the menu.");
}

/**
 * An enquiry, dealt with.
 *
 * Read is a one-way mark rather than a toggle: the question it answers is
 * "has anybody looked at this yet", and a list that can be silently un-answered
 * is a list where something falls through.
 */
export async function markRead(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();
  const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", id);

  if (error) {
    console.error("[panel] mark read:", error.message);
    return no("Could not mark it.");
  }

  refresh();
  return ok("Marked.");
}

/**
 * One place up or down.
 *
 * The two rows swap positions rather than everything below being renumbered.
 * A renumber is a write per row and a chance for two people reordering at once
 * to produce a list where nothing is where either of them put it.
 */
export async function moveNavItem(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  if (!id || (direction !== "up" && direction !== "down")) {
    return no("That request did not make sense.");
  }

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("nav_items")
    .select("id, variant_id, sort_order")
    .eq("id", id)
    .single();

  if (!item) return no("That menu item is gone.");

  const { data: neighbour } = await supabase
    .from("nav_items")
    .select("id, sort_order")
    .eq("variant_id", item.variant_id)
    [direction === "up" ? "lt" : "gt"]("sort_order", item.sort_order)
    .order("sort_order", { ascending: direction !== "up" })
    .limit(1)
    .maybeSingle();

  /* Already at the end. Not an error — the button simply had nothing to do. */
  if (!neighbour) return ok("It is already there.");

  /*
    Two updates rather than one upsert.

    An upsert of a partial row does not typecheck against a generated schema,
    and correctly so: the client cannot tell a patch from an insert missing
    three required columns. Two writes are safe here because nothing constrains
    `sort_order` to be unique — the pair may sit on the same number for the
    instant between them without the database objecting.
  */
  const [first, second] = await Promise.all([
    supabase.from("nav_items").update({ sort_order: neighbour.sort_order }).eq("id", item.id),
    supabase.from("nav_items").update({ sort_order: item.sort_order }).eq("id", neighbour.id),
  ]);

  const error = first.error ?? second.error;

  if (error) {
    console.error("[panel] nav move:", error.message);
    return no("Could not move it.");
  }

  refresh();
  return ok("Moved.");
}

/* ============================================================ removing === */

/**
 * Taking a row away.
 *
 * One action for three tables, with the table named in the form, because the
 * alternative is three identical functions — and three places for the
 * `requireAdmin()` to be forgotten in one of them.
 *
 * The name is checked against a list rather than trusted: a form field that
 * reaches a query unchecked is a form field that can name any table in the
 * schema.
 */
export async function deleteRow(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");

  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();

  const { error } =
    table === "testimonials"
      ? await supabase.from("testimonials").delete().eq("id", id)
      : table === "faqs"
        ? await supabase.from("faqs").delete().eq("id", id)
        : table === "nav_items"
          ? await supabase.from("nav_items").delete().eq("id", id)
          : { error: { message: "not a table this may touch" } };

  if (error) {
    console.error("[panel] delete:", error.message);
    return no("Could not remove it.");
  }

  refresh();
  return ok("Removed.");
}

/* =============================================================== media === */

const MEDIA_BUCKET = "demo-media";

/** Somewhere predictable, and unique enough that two uploads never collide. */
function keyFor(filename: string): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);

  return `${DB_SCHEMA}/library/${Date.now().toString(36)}-${safe || "image"}`;
}

/**
 * A picture added to the library.
 *
 * **Uploaded with the signed-in person's session.** The bucket's policy asks
 * `control.is_owner()`, so the database refuses an upload nobody should be
 * making. Using the service role here would move that decision into this file,
 * and a file is markup, not access control.
 *
 * **Nothing is resized or re-encoded.** What is uploaded is what is served —
 * every pipeline that helpfully converts a PNG flattens its transparency onto
 * white, which is invisible until the picture lands on a dark background.
 */
export async function uploadMedia(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) return no("Choose a file first.");

  const supabase = await createClient();
  const key = keyFor(file.name);

  const { error: upload } = await supabase.storage.from(MEDIA_BUCKET).upload(key, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (upload) {
    console.error("[panel] media upload:", upload.message);
    return no("That file could not be uploaded. It may be too large, or not an image.");
  }

  const { error } = await supabase.from("media").insert({
    storage_key: key,
    filename: file.name,
    alt,
    mime_type: file.type || null,
  });

  if (error) {
    console.error("[panel] media row:", error.message);
    return no("The file was uploaded but could not be recorded. Try again.");
  }

  refresh();
  return ok("Added to the library.");
}

/** The words a screen reader says, which are the picture for anybody using one. */
export async function describeMedia(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const id = String(formData.get("id") ?? "");
  const alt = String(formData.get("alt") ?? "").trim();

  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();
  const { error } = await supabase.from("media").update({ alt }).eq("id", id);

  if (error) return no(error.message);

  refresh();
  return ok("Saved.");
}

/**
 * A picture removed, from the table and from the bucket.
 *
 * **The row goes first.** If the object were deleted first and the row delete
 * then failed — because a logo still points at it — the library would list a
 * picture that 404s, which is worse than a picture nobody meant to keep.
 */
export async function deleteMedia(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const id = String(formData.get("id") ?? "");
  const key = String(formData.get("storage_key") ?? "");

  if (!id) return no("That request did not make sense.");

  const supabase = await createClient();

  const { error } = await supabase.from("media").delete().eq("id", id);

  if (error) {
    console.error("[panel] media delete:", error.message);
    return no("It is still being used somewhere. Take it off there first.");
  }

  if (key) await supabase.storage.from(MEDIA_BUCKET).remove([key]);

  refresh();
  return ok("Gone.");
}
