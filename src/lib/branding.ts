import "server-only";

import { createClient } from "@/lib/supabase/server";
import { clientEnv } from "@/lib/env";

/**
 * A business's brand, as the panel needs it.
 *
 * The public address of a stored file is composed here rather than kept in a
 * column, so moving the bucket is one change in one place. `storage_key` is
 * what identifies the object, and it is all that is stored.
 */

const BUCKET = "demo-media";

export function publicUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;

  return `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storageKey}`;
}

export interface BrandRow {
  id: string;
  slug: string;
  businessName: string;
  logoShowsName: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  tagline: string | null;
  light: { url: string; alt: string } | null;
  dark: { url: string; alt: string } | null;
  og: { url: string; alt: string } | null;
}

export async function getBranding(): Promise<BrandRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("variants")
    .select(
      `id, slug, business_name, tagline, logo_shows_name, meta_title, meta_description,
       light:media!variants_logo_light_id_fkey(storage_key, alt),
       dark:media!variants_logo_dark_id_fkey(storage_key, alt),
       og:media!variants_og_image_id_fkey(storage_key, alt)`,
    )
    .order("sort_order");

  if (error) {
    /* Named joins, because `variants` reaches `media` three times — without the
       constraint name PostgREST cannot tell which, and answers with an error
       that reads like a missing table. */
    console.error("[branding] could not read:", error.message);
    return [];
  }

  const one = (row: { storage_key: string; alt: string } | null) =>
    row ? { url: publicUrl(row.storage_key) as string, alt: row.alt } : null;

  return (data ?? []).map((row) => {
    const record = row as unknown as {
      id: string;
      slug: string;
      business_name: string;
      tagline: string | null;
      logo_shows_name: boolean;
      meta_title: string | null;
      meta_description: string | null;
      light: { storage_key: string; alt: string } | null;
      dark: { storage_key: string; alt: string } | null;
      og: { storage_key: string; alt: string } | null;
    };

    return {
      id: record.id,
      slug: record.slug,
      businessName: record.business_name,
      tagline: record.tagline,
      logoShowsName: record.logo_shows_name,
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      light: one(record.light),
      dark: one(record.dark),
      og: one(record.og),
    };
  });
}
