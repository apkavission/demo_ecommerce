"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DB_SCHEMA } from "@/lib/supabase/constants";
import { type FormState } from "@/lib/form-state";

/**
 * A business's own mark, and its own words in a search result.
 *
 * ---------------------------------------------------------------------------
 * **The upload is done with the signed-in person's session, on purpose.**
 *
 * The bucket's policy asks `control.is_owner()`, so the database is what
 * refuses an upload from somebody who should not be making one. Using the
 * service role here would move that decision into this file — and a file is
 * markup, not access control. `requireSuperAdmin()` above is the same answer
 * given earlier, for a better message.
 *
 * ---------------------------------------------------------------------------
 * **Nothing is resized or re-encoded.** What is uploaded is what is served. A
 * logo is usually an SVG or a small PNG with transparency, and every pipeline
 * that "helpfully" converts one flattens the transparency onto white — which is
 * invisible until the mark appears on a dark header.
 */

const BUCKET = "demo-media";

const ok = (message: string): FormState => ({ status: "success", message });
const no = (message: string): FormState => ({ status: "error", message });

/** Somewhere predictable, and unique enough that two uploads never collide. */
function keyFor(variantId: string, filename: string): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);

  return `${DB_SCHEMA}/${variantId}/${Date.now().toString(36)}-${safe || "image"}`;
}

export async function uploadLogo(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const variantId = String(formData.get("variant_id") ?? "");
  const slot = String(formData.get("slot") ?? "");
  const file = formData.get("file");

  if (!variantId) return no("That request did not make sense.");

  if (!(file instanceof File) || file.size === 0) {
    return no("Choose a file first.");
  }

  /*
    The three the schema has a home for. Anything else is a request that has
    been tampered with, and it is refused rather than written to a column
    chosen by whoever sent it.
  */
  if (slot !== "light" && slot !== "dark" && slot !== "og") {
    return no("That is not a place a picture goes.");
  }

  const supabase = await createClient();
  const key = keyFor(variantId, file.name);

  const { error: upload } = await supabase.storage.from(BUCKET).upload(key, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (upload) {
    console.error("[branding] upload failed:", upload.message);
    return no("That file could not be uploaded. It may be too large, or not an image.");
  }

  /*
    The dimensions are not read here, and that is a deliberate limit.

    Measuring an image needs a decoder, and the server has none — `sharp` is a
    dependency this project does not carry for the sake of two numbers. They are
    nullable in the schema, and the only thing that reads them is the alt-text
    helper, which copes.
  */
  const { data: media, error: inserted } = await supabase
    .from("media")
    .insert({
      storage_key: key,
      filename: file.name,
      alt: String(formData.get("alt") ?? "").trim(),
      mime_type: file.type || null,
    })
    .select("id")
    .single();

  if (inserted || !media) {
    console.error("[branding] media row failed:", inserted?.message);
    return no("The file was uploaded but could not be recorded. Try again.");
  }

  /*
    Written out rather than built from a variable key.

    A computed key produces an index signature, which the generated types refuse
    — correctly: it is exactly how a typo becomes a silent write to a column
    that does not exist. Three named branches are two lines longer and cannot be
    wrong.
  */
  const patch =
    slot === "light"
      ? { logo_light_id: media.id }
      : slot === "dark"
        ? { logo_dark_id: media.id }
        : { og_image_id: media.id };

  const { error: linked } = await supabase.from("variants").update(patch).eq("id", variantId);

  if (linked) return no(linked.message);

  revalidatePath("/admin/branding");
  revalidatePath("/", "layout");

  return ok("Uploaded. It is on the site now.");
}

export async function saveBranding(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const variantId = String(formData.get("variant_id") ?? "");
  if (!variantId) return no("That request did not make sense.");

  const supabase = await createClient();

  const { error } = await supabase
    .from("variants")
    .update({
      /*
        An unticked box sends nothing at all, so "off" and "not on the form"
        arrive identically. This form always carries the field, so `=== "on"`
        is the whole truth about it.
      */
      logo_shows_name: formData.get("logo_shows_name") === "on",
      meta_title: String(formData.get("meta_title") ?? "").trim() || null,
      meta_description: String(formData.get("meta_description") ?? "").trim() || null,
    })
    .eq("id", variantId);

  if (error) return no(error.message);

  revalidatePath("/admin/branding");
  revalidatePath("/", "layout");

  return ok("Saved.");
}

/** Take a logo off, without deleting the file somebody may still want. */
export async function clearLogo(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const variantId = String(formData.get("variant_id") ?? "");
  const slot = String(formData.get("slot") ?? "");

  if (!variantId || (slot !== "light" && slot !== "dark" && slot !== "og")) {
    return no("That request did not make sense.");
  }

  /* Named, for the same reason as the upload above. */
  const patch =
    slot === "light"
      ? { logo_light_id: null }
      : slot === "dark"
        ? { logo_dark_id: null }
        : { og_image_id: null };

  const supabase = await createClient();
  const { error } = await supabase.from("variants").update(patch).eq("id", variantId);

  if (error) return no(error.message);

  revalidatePath("/admin/branding");
  revalidatePath("/", "layout");

  return ok("Taken off. The name is shown instead.");
}
